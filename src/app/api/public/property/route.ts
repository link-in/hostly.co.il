/**
 * Public Property Info API
 *
 * Returns the property ID and room IDs associated with a given API key.
 * Intended for callers who hold an API key and need to discover their
 * identifiers before making other API calls (e.g. /api/public/calendar).
 *
 * GET /api/public/property
 *
 * Headers:
 *   x-api-key: <your-api-key>
 *
 * Response:
 *   {
 *     propertyId: string,
 *     rooms: Array<{ id: string; name: string }>,
 *     allowedRoomIds: string[]          // room IDs the key is scoped to (empty = all)
 *   }
 *
 * Auth flow:
 *   1. Validate API key exists and is active  → 401 if not
 *   2. Verify subscription is active/trial    → 403 subscription_inactive
 *   3. Return property_id + room_id parsed from the user row,
 *      filtered to the key's allowed_room_ids when restricted
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
}

const ACTIVE_STATUSES = new Set(['active', 'trial'])

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Parses the room_id string stored in the DB.
 * Format: "roomId1:roomName1,roomId2:roomName2"
 * Returns an array of { id, name } objects.
 */
function parseRoomId(raw: string): Array<{ id: string; name: string }> {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => {
      const [id, ...nameParts] = part.trim().split(':')
      return { id: id.trim(), name: nameParts.join(':').trim() }
    })
    .filter((r) => r.id)
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')?.trim()

  if (!apiKey) {
    return json({ error: 'Missing x-api-key header' }, 401)
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

  // ── Step 3: Fetch user's property + room data ─────────────────────────────
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('property_id, room_id')
    .eq('id', userId)
    .single()

  if (userError || !userRow) {
    return json({ error: 'User not found' }, 404)
  }

  const allRooms = parseRoomId(userRow.room_id ?? '')
  const allowedRoomIds: string[] = keyRow.allowed_room_ids ?? []

  // If the key is scoped to specific rooms, filter the list
  const rooms =
    allowedRoomIds.length > 0
      ? allRooms.filter((r) => allowedRoomIds.includes(r.id))
      : allRooms

  return json({
    propertyId: userRow.property_id ?? '',
    rooms,
    allowedRoomIds,
  })
}
