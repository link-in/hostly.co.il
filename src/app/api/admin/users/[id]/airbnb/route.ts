/**
 * POST /api/admin/users/[id]/airbnb
 *
 * Orchestrates the full "manually-connected Airbnb" setup in one call.
 *
 * Two modes:
 *   mode: "import"  → POST /channels/airbnb (importAsNewProperty) — Beds24 creates new property + room
 *   mode: "connect" → POST /channels/airbnb (connectToExistingRoom) — maps existing Beds24 room to Airbnb listing
 *
 * Then in both cases:
 *   2. Update users table with the new/existing propertyId + roomId
 *   3. Seed the availability cache (3 months)
 *   4. Create an API key for the user
 *
 * Body (import):  { mode: "import",  airbnbUserId, airbnbListingId }
 * Body (connect): { mode: "connect", airbnbUserId, airbnbListingId, existingRoomId, existingPropertyId }
 * Returns: { propertyId, roomId, apiKey, cachedDays }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshRoomCache, generateApiKey } from '@/lib/availability/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

const BodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('import'),
    airbnbUserId: z.string().min(1),
    airbnbListingId: z.string().min(1),
    listingName: z.string().optional(),
  }),
  z.object({
    mode: z.literal('connect'),
    airbnbUserId: z.string().min(1),
    airbnbListingId: z.string().min(1),
    existingRoomId: z.string().min(1),
    existingPropertyId: z.string().min(1),
    listingName: z.string().optional(),
  }),
  // Append an already-existing Beds24 room to the user without Airbnb import
  z.object({
    mode: z.literal('append'),
    existingRoomId: z.string().min(1),
    existingPropertyId: z.string().min(1),
    roomName: z.string().optional(),
  }),
])

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') return null
  return session
}

// ---------------------------------------------------------------------------
// Step 1a – Import as new property in Beds24
// ---------------------------------------------------------------------------

interface Beds24Ids {
  propertyId: string
  roomId: string
}

function parseBeds24Response(data: unknown, context: string): Beds24Ids {
  const result = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : data as Record<string, unknown>

  if ((result as { success?: boolean })?.success === false) {
    const errors = (result as { errors?: unknown[] })?.errors ?? []
    throw new Error(`${context} נכשל: ${JSON.stringify(errors)}`)
  }

  // Shape A: { new: { id: 123, roomTypes: [{ id: 456 }] } }
  const newData = (result as { new?: Record<string, unknown> })?.new
  if (newData) {
    const propertyId = String(newData.id ?? '')
    const rooms = (newData.roomTypes as Array<{ id: unknown }>) ?? []
    const roomId = String(rooms[0]?.id ?? '')
    if (propertyId && roomId) return { propertyId, roomId }
  }

  // Shape B: { propertyId: 123, roomId: 456 }  or  { data: { propertyId, roomId } }
  const direct = result as Record<string, unknown>
  const pid = direct.propertyId ?? (direct.data as Record<string, unknown>)?.propertyId
  const rid = direct.roomId ?? (direct.data as Record<string, unknown>)?.roomId
  if (pid && rid) return { propertyId: String(pid), roomId: String(rid) }

  throw new Error(`תגובת Beds24 לא צפויה — לא נמצאו propertyId / roomId. Raw: ${JSON.stringify(result).slice(0, 400)}`)
}

async function importAsNewProperty(
  airbnbUserId: string,
  airbnbListingId: string,
): Promise<Beds24Ids> {
  const payload = [{ action: 'importAsNewProperty', airbnbUserId, airbnbListingId, connect: 'full' }]

  const res = await fetchWithTokenRefresh(`${BASE_URL}/channels/airbnb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const rawText = await res.text()
  let data: unknown
  try { data = JSON.parse(rawText) } catch { data = rawText }

  console.log(`[AirbnbSetup] importAsNewProperty → ${res.status}:`, JSON.stringify(data).slice(0, 600))

  if (!res.ok) {
    const errMsg = (data as { error?: string })?.error ?? JSON.stringify(data)
    throw new Error(`Beds24 שגיאה (import): ${errMsg}`)
  }

  return parseBeds24Response(data, 'importAsNewProperty')
}

// ---------------------------------------------------------------------------
// Step 1b – Connect to existing Beds24 room
// ---------------------------------------------------------------------------

async function connectToExistingRoom(
  airbnbUserId: string,
  airbnbListingId: string,
  existingRoomId: string,
  existingPropertyId: string,
): Promise<Beds24Ids> {
  const payload = [{
    action: 'connectToExistingRoom',
    airbnbUserId,
    airbnbListingId,
    connect: 'full',
    roomId: Number(existingRoomId),
  }]

  const res = await fetchWithTokenRefresh(`${BASE_URL}/channels/airbnb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const rawText = await res.text()
  let data: unknown
  try { data = JSON.parse(rawText) } catch { data = rawText }

  console.log(`[AirbnbSetup] connectToExistingRoom → ${res.status}:`, JSON.stringify(data).slice(0, 600))

  if (!res.ok) {
    const errMsg = (data as { error?: string })?.error ?? JSON.stringify(data)
    throw new Error(`Beds24 שגיאה (connect): ${errMsg}`)
  }

  // connectToExistingRoom may not return new IDs — fall back to the provided ones
  try {
    return parseBeds24Response(data, 'connectToExistingRoom')
  } catch {
    // If the response doesn't include IDs (success with no new object), use what we already know
    const result = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : data as Record<string, unknown>
    if ((result as { success?: boolean })?.success === false) {
      const errors = (result as { errors?: unknown[] })?.errors ?? []
      throw new Error(`connectToExistingRoom נכשל: ${JSON.stringify(errors)}`)
    }
    return { propertyId: existingPropertyId, roomId: existingRoomId }
  }
}

// ---------------------------------------------------------------------------
// Step 2 – Persist propertyId + roomId for the user
// ---------------------------------------------------------------------------

/** Overwrite both propertyId and roomId (first-time setup). Includes optional room name. */
async function saveIdsToUser(userId: string, propertyId: string, roomId: string, roomName?: string) {
  const supabase = createServiceRoleClient()
  const roomIdValue = roomName ? `${roomId}:${roomName}` : roomId
  const { error } = await supabase
    .from('users')
    .update({ property_id: propertyId, room_id: roomIdValue })
    .eq('id', userId)
  if (error) throw new Error(`שגיאה בעדכון המשתמש: ${error.message}`)
}

/** Append a new roomId (with optional name) to the existing room_id list */
async function appendRoomToUser(
  userId: string,
  roomId: string,
  roomName?: string,
) {
  const supabase = createServiceRoleClient()

  const { data: userRow, error: fetchErr } = await supabase
    .from('users')
    .select('room_id')
    .eq('id', userId)
    .single()

  if (fetchErr || !userRow) throw new Error(`משתמש ${userId} לא נמצא`)

  const existing = (userRow.room_id ?? '').trim()
  const entry = roomName ? `${roomId}:${roomName}` : roomId
  const newRoomId = existing ? `${existing},${entry}` : entry

  const { error } = await supabase
    .from('users')
    .update({ room_id: newRoomId })
    .eq('id', userId)

  if (error) throw new Error(`שגיאה בהוספת חדר: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Step 3 – Seed availability cache
// ---------------------------------------------------------------------------

async function seedCache(userId: string, propertyId: string, roomId: string) {
  const supabase = createServiceRoleClient()
  const { data: userRow } = await supabase
    .from('users')
    .select('beds24_token, beds24_refresh_token')
    .eq('id', userId)
    .single()

  const accessToken  = userRow?.beds24_token        ?? process.env.BEDS24_TOKEN
  const refreshToken = userRow?.beds24_refresh_token ?? process.env.BEDS24_REFRESH_TOKEN

  if (!accessToken || !refreshToken) {
    throw new Error('אין tokens ל-Beds24 — נדרש BEDS24_TOKEN ו-BEDS24_REFRESH_TOKEN ב-env')
  }

  return refreshRoomCache(userId, propertyId, roomId, accessToken, refreshToken)
}

// ---------------------------------------------------------------------------
// Step 4 – Create API key
// ---------------------------------------------------------------------------

async function createApiKeyForUser(userId: string, roomId: string): Promise<string> {
  const newKey = generateApiKey()
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: 'לוח שנה',
      key: newKey,
      allowed_room_ids: [roomId],
      is_active: true,
    })

  if (error) throw new Error(`שגיאה ביצירת API key: ${error.message}`)

  return newKey
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: userId } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { mode } = parsed.data

  try {
    // ── Append mode: just add an existing room to the user, no Airbnb connection ──
    if (mode === 'append') {
      const { existingRoomId, existingPropertyId, roomName } = parsed.data
      await appendRoomToUser(userId, existingRoomId, roomName)
      console.log(`[AirbnbSetup] ✓ Appended room ${existingRoomId} to user ${userId}`)

      const cacheResult = await seedCache(userId, existingPropertyId, existingRoomId)
      console.log(`[AirbnbSetup] ✓ Cache seeded — ${cacheResult.upserted} days`)

      return NextResponse.json({
        success: true,
        propertyId: existingPropertyId,
        roomId: existingRoomId,
        apiKey: null,
        cachedDays: cacheResult.upserted,
        cacheWarning: cacheResult.error ?? null,
      })
    }

    // ── Import or connect Airbnb listing ──
    let propertyId: string
    let roomId: string
    const d = parsed.data as { airbnbUserId: string; airbnbListingId: string; existingRoomId?: string; existingPropertyId?: string }

    const listingName = (parsed.data as { listingName?: string }).listingName

    if (mode === 'import') {
      ;({ propertyId, roomId } = await importAsNewProperty(d.airbnbUserId, d.airbnbListingId))
      console.log(`[AirbnbSetup] ✓ Imported → propertyId=${propertyId} roomId=${roomId}`)
    } else {
      ;({ propertyId, roomId } = await connectToExistingRoom(d.airbnbUserId, d.airbnbListingId, d.existingRoomId!, d.existingPropertyId!))
      console.log(`[AirbnbSetup] ✓ Connected → propertyId=${propertyId} roomId=${roomId}`)
    }

    // 2. Save to DB — include listing name so tabs show it instead of just the ID
    await saveIdsToUser(userId, propertyId, roomId, listingName)
    console.log(`[AirbnbSetup] ✓ Saved to user ${userId} (name: ${listingName ?? 'none'})`)

    // 3. Seed cache
    const cacheResult = await seedCache(userId, propertyId, roomId)
    console.log(`[AirbnbSetup] ✓ Cache seeded — ${cacheResult.upserted} days`)

    // 4. Create API key
    const apiKey = await createApiKeyForUser(userId, roomId)
    console.log(`[AirbnbSetup] ✓ API key created`)

    return NextResponse.json({
      success: true,
      propertyId,
      roomId,
      apiKey,
      cachedDays: cacheResult.upserted,
      cacheWarning: cacheResult.error ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[AirbnbSetup] ✗ Error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
