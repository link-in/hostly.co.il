/**
 * GET /api/public/calendar/debug?roomId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Diagnostic endpoint — uses the same API key auth as the public calendar,
 * but returns raw Beds24 response details instead of parsed availability.
 * Useful for production debugging without Vercel log access.
 *
 * Responses:
 *   200 — structured diagnostic object
 *   401 — missing/invalid API key
 *   403 — subscription inactive or room not allowed
 *   503 — Beds24 not configured
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
}

const ACTIVE_STATUSES = new Set( [ 'active', 'trial' ] )
const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

export async function OPTIONS() {
  return new NextResponse( null, { status: 204, headers: CORS_HEADERS } )
}

export async function GET( request: NextRequest ) {
  const apiKey = request.headers.get( 'x-api-key' )?.trim()

  if ( ! apiKey ) {
    return json( { error: 'Missing x-api-key header' }, 401 )
  }

  const url    = new URL( request.url )
  const roomId = url.searchParams.get( 'roomId' )?.trim() ?? ''
  const from   = url.searchParams.get( 'from' )?.trim() ?? new Date().toISOString().slice( 0, 10 )
  const to     = url.searchParams.get( 'to' )?.trim() ?? (() => {
    const d = new Date()
    d.setMonth( d.getMonth() + 1 )
    return d.toISOString().slice( 0, 10 )
  })()

  const supabase = createServiceRoleClient()

  // ── Validate API key ──────────────────────────────────────────────────────
  const { data: keyRow, error: keyError } = await supabase
    .from( 'api_keys' )
    .select( 'id, user_id, is_active, allowed_room_ids' )
    .eq( 'key', apiKey )
    .single()

  if ( keyError || ! keyRow )  return json( { error: 'Invalid API key' }, 401 )
  if ( ! keyRow.is_active )    return json( { error: 'API key is disabled' }, 401 )

  const userId: string = keyRow.user_id

  // ── Verify subscription ───────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: subRow } = await supabase
    .from( 'subscriptions' )
    .select( 'status, expires_at' )
    .eq( 'user_id', userId )
    .order( 'created_at', { ascending: false } )
    .limit( 1 )
    .single()

  const subStatus  = subRow?.status ?? 'expired'
  const subExpired = subRow?.expires_at ? subRow.expires_at < now : false

  if ( ! ACTIVE_STATUSES.has( subStatus ) || subExpired ) {
    return json( { error: 'subscription_inactive', status: subStatus, expires_at: subRow?.expires_at }, 403 )
  }

  // ── Verify room allowed ───────────────────────────────────────────────────
  const allowedRooms: string[] = keyRow.allowed_room_ids ?? []
  if ( allowedRooms.length > 0 && roomId && ! allowedRooms.includes( roomId ) ) {
    return json( { error: 'room_not_allowed', roomId, allowedRooms }, 403 )
  }

  // ── Fetch user Beds24 tokens ──────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from( 'users' )
    .select( 'beds24_token, beds24_refresh_token, property_id' )
    .eq( 'id', userId )
    .single()

  const accessToken  = userRow?.beds24_token         || process.env.BEDS24_TOKEN         || ''
  const refreshToken = userRow?.beds24_refresh_token || process.env.BEDS24_REFRESH_TOKEN || ''
  const propertyId   = userRow?.property_id          || ''

  if ( ! accessToken || ! refreshToken ) {
    return json( {
      error: 'beds24_not_configured',
      hasDbToken: !! userRow?.beds24_token,
      hasEnvToken: !! process.env.BEDS24_TOKEN,
    }, 503 )
  }

  // ── Call Beds24 calendar endpoint ─────────────────────────────────────────
  const calUrl = new URL( `${ BEDS24_BASE_URL }/inventory/rooms/calendar` )
  if ( propertyId ) calUrl.searchParams.set( 'propertyId', propertyId )
  if ( roomId )     calUrl.searchParams.set( 'roomId', roomId )
  calUrl.searchParams.set( 'startDate', from )
  calUrl.searchParams.set( 'endDate', to )
  calUrl.searchParams.set( 'includePrices', '1' )

  let calStatus   = 0
  let calBody: unknown = null
  let calError: string | null = null

  try {
    const calResponse = await fetchWithTokenRefresh(
      calUrl.toString(),
      { headers: { 'content-type': 'application/json' } },
      { accessToken, refreshToken },
      userId,
    )
    calStatus = calResponse.status
    calBody   = await calResponse.json().catch( async () => await calResponse.text() )
  } catch ( err ) {
    calError = err instanceof Error ? err.message : String( err )
  }

  return json( {
    checks: {
      apiKey:         'valid',
      subscription:   subStatus,
      roomAllowed:    allowedRooms.length === 0 ? 'all_allowed' : 'allowed',
      beds24Tokens:   'present',
    },
    config: {
      propertyId:     propertyId || '(empty — not stored for this user)',
      roomId:         roomId     || '(not provided)',
      tokenSource:    userRow?.beds24_token ? 'database' : 'env',
      beds24Url:      calUrl.toString(),
    },
    beds24Response: {
      status:         calStatus,
      error:          calError,
      body:           calBody,
    },
  }, 200 )
}

function json( body: unknown, status: number ) {
  return NextResponse.json( body, { status, headers: CORS_HEADERS } )
}
