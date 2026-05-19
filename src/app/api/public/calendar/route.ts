/**
 * Public Calendar API
 *
 * Returns live availability & pricing for a room directly from Beds24,
 * intended for embedding in customer websites.
 * Authenticated via API Key (x-api-key header).
 *
 * GET /api/public/calendar?roomId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD[&numGuest=N]
 *
 * Auth flow:
 *   1. Validate API key exists and is active          → 401 if not
 *   2. Verify user subscription is active/trial       → 403 subscription_inactive
 *   3. Verify roomId is in the key's allowed_room_ids → 403 room_not_allowed
 *   4. Fetch live data directly from Beds24
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchLiveAvailability } from '@/lib/availability/direct'

export const dynamic = 'force-dynamic'

// CORS headers — allow any origin so customer websites can call this endpoint
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
}

// Max range a caller can request in one call
const MAX_DAYS = 365

// Subscription statuses that grant API access
const ACTIVE_STATUSES = new Set(['active', 'trial'])

// ---------------------------------------------------------------------------
// OPTIONS — preflight for browser CORS
// ---------------------------------------------------------------------------
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')?.trim()

  if (!apiKey) {
    return json({ error: 'Missing x-api-key header' }, 401)
  }

  const url = new URL(request.url)
  const roomId    = url.searchParams.get('roomId')?.trim()
  const from      = url.searchParams.get('from')?.trim()
  const to        = url.searchParams.get('to')?.trim()
  const numGuest  = Math.max( 1, parseInt( url.searchParams.get('numGuest') ?? '1', 10 ) || 1 )

  if (!roomId) {
    return json({ error: 'Missing required query param: roomId' }, 400)
  }

  // Default date range: today → today + 3 months
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const resolvedFrom = from ?? fmtDate(today)
  const resolvedTo = to ?? fmtDate(addMonths(today, 3))

  if (!isValidDate(resolvedFrom) || !isValidDate(resolvedTo)) {
    return json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400)
  }

  const fromDate = new Date(resolvedFrom)
  const toDate = new Date(resolvedTo)

  if (toDate < fromDate) {
    return json({ error: '`to` must be >= `from`' }, 400)
  }

  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000)
  if (diffDays > MAX_DAYS) {
    return json({ error: `Date range cannot exceed ${MAX_DAYS} days` }, 400)
  }

  const supabase = createServiceRoleClient()

  // ── Step 1: Validate API key ──────────────────────────────────────────────
  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active, allowed_room_ids')
    .eq('key', apiKey)
    .single()

  if (keyError || !keyRow) {
    return json({ error: 'Invalid API key' }, 401)
  }

  if (!keyRow.is_active) {
    return json({ error: 'API key is disabled' }, 401)
  }

  const userId: string = keyRow.user_id

  // ── Step 2: Verify subscription ───────────────────────────────────────────
  const now = new Date().toISOString()

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const subStatus: string = subRow?.status ?? 'expired'
  const subExpired = subRow?.expires_at ? subRow.expires_at < now : false

  if (!ACTIVE_STATUSES.has(subStatus) || subExpired) {
    return json({ error: 'subscription_inactive' }, 403)
  }

  // ── Step 3: Verify room is allowed ────────────────────────────────────────
  const allowedRooms: string[] = keyRow.allowed_room_ids ?? []
  if (allowedRooms.length > 0 && !allowedRooms.includes(roomId)) {
    return json({ error: 'room_not_allowed' }, 403)
  }

  // ── Step 4: Fetch user's Beds24 tokens ───────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('beds24_token, beds24_refresh_token, property_id')
    .eq('id', userId)
    .single()

  const accessToken  = userRow?.beds24_token        || process.env.BEDS24_TOKEN        || ''
  const refreshToken = userRow?.beds24_refresh_token || process.env.BEDS24_REFRESH_TOKEN || ''
  const propertyId   = userRow?.property_id         || ''

  if ( ! accessToken || ! refreshToken ) {
    return json( { error: 'beds24_not_configured', message: 'Beds24 token not set for this account.' }, 503 )
  }

  // ── Step 5: Fetch live from Beds24 ────────────────────────────────────────
  const result = await fetchLiveAvailability( {
    userId,
    propertyId,
    roomId,
    from: resolvedFrom,
    to: resolvedTo,
    accessToken,
    refreshToken,
    numGuest,
  } )

  if (!result) {
    return json(
      {
        error: 'beds24_error',
        message: 'Could not fetch availability from Beds24. Please try again shortly.',
      },
      502,
    )
  }

  // Update last_used_at in the background (non-blocking)
  supabase
    .from('api_keys')
    .update({ last_used_at: now })
    .eq('id', keyRow.id)
    .then()

  return json(result, 200)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMonths(d: Date, months: number): Date {
  const n = new Date(d)
  n.setMonth(n.getMonth() + months)
  return n
}

function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime())
}
