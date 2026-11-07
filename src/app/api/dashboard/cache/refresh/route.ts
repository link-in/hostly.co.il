/**
 * POST /api/dashboard/cache/refresh
 *
 * Manually triggers an availability-cache refresh from Beds24 for the current user.
 * Beds24 is the source of truth: prices and blocked days are re-read and written to the cache.
 *
 * Body (optional): { roomId?: string, propertyId?: string }
 * - roomId: refresh only this room (must belong to the user). Omit to refresh all of the user's rooms.
 * - propertyId: overrides the property stored on the user profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { parseRoomIds, roomFieldIncludes } from '@/lib/rooms/roomIds'
import { refreshRooms, summarizeRefresh } from '@/lib/availability/refreshRooms'

export const dynamic = 'force-dynamic'

const idField = z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().regex(/^\d+$/))

const bodySchema = z.object({
  roomId: idField.optional(),
  propertyId: idField.optional(),
})

async function readBody(request: NextRequest) {
  try {
    return bodySchema.safeParse(await request.json())
  } catch {
    // Body is optional - an empty/invalid JSON body means "refresh everything".
    return bodySchema.safeParse({})
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const body = await readBody(request)
  if (!body.success) {
    return NextResponse.json({ error: 'roomId או propertyId לא תקינים' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('room_id, property_id, beds24_token, beds24_refresh_token')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userRoomIds = parseRoomIds(user.room_id)
  const requestedRoomId = body.data.roomId
  if (requestedRoomId && !roomFieldIncludes(user.room_id, requestedRoomId)) {
    return NextResponse.json({ error: 'החדר אינו שייך למשתמש' }, { status: 403 })
  }

  const roomIds = requestedRoomId ? [requestedRoomId] : userRoomIds
  const propertyId = body.data.propertyId ?? user.property_id

  if (roomIds.length === 0 || !propertyId) {
    return NextResponse.json(
      { error: 'No room_id or property_id configured for this user. Set them in your profile first.' },
      { status: 400 },
    )
  }

  // Use user-specific tokens if configured, otherwise fall back to global env tokens
  const accessToken = user.beds24_token || process.env.BEDS24_TOKEN
  const refreshToken = user.beds24_refresh_token || process.env.BEDS24_REFRESH_TOKEN

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: 'No Beds24 token configured. Set BEDS24_TOKEN in environment variables.' },
      { status: 400 },
    )
  }

  const rooms = await refreshRooms({ userId, propertyId, roomIds, accessToken, refreshToken })
  const summary = summarizeRefresh(rooms)

  const message = summary.success
    ? `Cache refreshed – ${summary.totalDays} days written.`
    : `Cache refresh failed for room(s): ${summary.failedRoomIds.join(', ')}`

  return NextResponse.json(
    {
      success: summary.success,
      rooms,
      totalDays: summary.totalDays,
      refreshedAt: new Date().toISOString(),
      message,
      ...(summary.success ? {} : { error: message }),
    },
    { status: summary.allFailed ? 502 : 200 },
  )
}
