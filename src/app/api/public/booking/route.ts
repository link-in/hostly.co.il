/**
 * POST /api/public/booking
 *
 * Legacy manual-mode booking endpoint.
 * Payment (Cardcom) is now handled entirely by the WordPress plugin.
 * This route is kept for backwards compatibility and for installs that have
 * no wpUrl configured (e.g. direct API integrations).
 *
 * When wpUrl IS provided (WordPress plugin ≥ 2.0), the embed calls
 * /wp-json/hostly/v1/initiate-payment directly, then after payment success
 * WordPress calls /api/public/booking/confirm to create the Beds24 booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { normalizeBookingItem, extractBookingId } from '@/lib/bookings/normalizer'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
}

const ACTIVE_STATUSES = new Set(['active', 'trial'])
const BEDS24_BASE = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const {
    roomId, checkIn, checkOut,
    firstName, lastName, email, phone,
    numAdult = 1, numChild = 0, notes = '',
  } = body as Record<string, unknown>

  if (!roomId || !checkIn || !checkOut || !firstName || !lastName || !email || !phone) {
    return json({ error: 'Missing required fields: roomId, checkIn, checkOut, firstName, lastName, email, phone' }, 400)
  }

  const apiKey = request.headers.get('x-api-key')?.trim()
  if (!apiKey) return json({ error: 'Missing x-api-key header' }, 401)

  const supabase = createServiceRoleClient()

  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active, allowed_room_ids')
    .eq('key', apiKey)
    .single()

  if (keyError || !keyRow || !keyRow.is_active) {
    return json({ error: 'Invalid or disabled API key' }, 401)
  }

  const userId: string = keyRow.user_id

  const now = new Date().toISOString()
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const subExpired = subRow?.expires_at ? subRow.expires_at < now : false
  if (!ACTIVE_STATUSES.has(subRow?.status ?? '') || subExpired) {
    return json({ error: 'subscription_inactive' }, 403)
  }

  const allowedRooms: string[] = keyRow.allowed_room_ids ?? []
  const roomIdStr = String(roomId)
  if (allowedRooms.length > 0 && !allowedRooms.includes(roomIdStr)) {
    return json({ error: 'room_not_allowed' }, 403)
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('beds24_token, beds24_refresh_token, property_id, display_name, phone_number')
    .eq('id', userId)
    .single()

  if (userError || !userRow?.beds24_token) {
    return json({ error: 'Owner Beds24 tokens not configured' }, 503)
  }

  const userTokens = {
    accessToken: userRow.beds24_token as string,
    refreshToken: (userRow.beds24_refresh_token as string) ?? '',
  }
  const propertyId = userRow.property_id as string

  const total = await calcTotal(supabase, userId, roomIdStr, String(checkIn), String(checkOut))
  if (total === null) {
    return json({ error: 'Unable to calculate price — availability data missing or dates unavailable' }, 422)
  }

  const beds24Result = await createBeds24Booking({
    userTokens,
    userId,
    propertyId,
    roomId: roomIdStr,
    checkIn: String(checkIn),
    checkOut: String(checkOut),
    firstName: String(firstName),
    lastName: String(lastName),
    email: String(email),
    phone: String(phone),
    numAdult: Number(numAdult),
    numChild: Number(numChild),
    notes: String(notes),
    total,
  })

  if (!beds24Result.ok) {
    return json({ error: beds24Result.error }, 502)
  }

  await notifyOwner({
    ownerPhone: (userRow.phone_number as string | null) ?? null,
    ownerName: (userRow.display_name as string | null) ?? 'בעל הנכס',
    guestName: `${firstName} ${lastName}`,
    guestPhone: String(phone),
    checkIn: String(checkIn),
    checkOut: String(checkOut),
    total,
    paidByCard: false,
  })

  return json({ success: true, bookingId: beds24Result.bookingId }, 200)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS })
}

async function calcTotal(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('availability_cache')
    .select('date, price, num_avail')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .gte('date', checkIn)
    .lt('date', checkOut)
    .order('date', { ascending: true })

  if (!data || data.length === 0) return null

  const ciDate = new Date(checkIn)
  const coDate = new Date(checkOut)
  const nights = Math.round((coDate.getTime() - ciDate.getTime()) / 86_400_000)
  if (data.length < nights) return null

  let total = 0
  for (const row of data) {
    if (row.num_avail <= 0) return null
    total += Number(row.price)
  }
  return total
}

interface Beds24Params {
  userTokens: { accessToken: string; refreshToken: string }
  userId: string
  propertyId: string
  roomId: string
  checkIn: string
  checkOut: string
  firstName: string
  lastName: string
  email: string
  phone: string
  numAdult: number
  numChild: number
  notes: string
  total: number
}

async function createBeds24Booking(
  p: Beds24Params,
): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  const payload = normalizeBookingItem(
    {
      arrival: p.checkIn,
      departure: p.checkOut,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      mobile: normalizePhoneNumber(p.phone),
      numAdult: p.numAdult,
      numChild: p.numChild,
      notes: p.notes,
      price: p.total,
      status: 'confirmed',
    },
    p.propertyId,
    p.roomId,
  )

  const response = await fetchWithTokenRefresh(
    `${BEDS24_BASE}/bookings`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([payload]),
    },
    p.userTokens,
    p.userId,
  )

  if (!response.ok) {
    const details = await response.text()
    console.error('[booking] Beds24 error:', response.status, details)
    return { ok: false, error: `Beds24 returned ${response.status}` }
  }

  const data = await response.json()
  return { ok: true, bookingId: extractBookingId(data) }
}

async function notifyOwner(opts: {
  ownerPhone: string | null
  ownerName: string
  guestName: string
  guestPhone: string
  checkIn: string
  checkOut: string
  total: number
  paidByCard: boolean
}) {
  if (!opts.ownerPhone) return
  const paymentNote = opts.paidByCard
    ? `💳 *שולם בכרטיס אשראי* — ₪${opts.total.toLocaleString('he-IL')}`
    : `📞 *ממתין לאישורך* (הזמנה ללא תשלום מוקדם)`

  const message =
    `🏠 *הזמנה חדשה!*\n\n` +
    `👤 אורח: ${opts.guestName}\n` +
    `📅 כניסה: ${opts.checkIn}  יציאה: ${opts.checkOut}\n` +
    `${paymentNote}\n\n` +
    `ניתן לפתוח ב-Beds24 לאישור`

  await sendWhatsAppMessage({ to: normalizePhoneNumber(opts.ownerPhone), message }).catch(
    (err) => console.error('[booking] WhatsApp failed:', err),
  )
}
