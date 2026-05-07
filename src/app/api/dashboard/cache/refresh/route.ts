/**
 * POST /api/dashboard/cache/refresh
 *
 * Manually triggers an availability-cache refresh for the current user's room.
 * Useful for the first-time seeding before any Beds24 webhook has fired.
 *
 * Body (optional): { roomId?: string, propertyId?: string }
 * Falls back to the values stored in the user's profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshRoomCache } from '@/lib/availability/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Allow body overrides, but fall back to the user's own profile values
  let bodyRoomId: string | undefined
  let bodyPropertyId: string | undefined
  try {
    const body = await request.json()
    bodyRoomId = body?.roomId ? String(body.roomId) : undefined
    bodyPropertyId = body?.propertyId ? String(body.propertyId) : undefined
  } catch {
    // Body is optional – ignore parse errors
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

  const roomId = bodyRoomId ?? user.room_id
  const propertyId = bodyPropertyId ?? user.property_id

  if (!roomId || !propertyId) {
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

  const result = await refreshRoomCache(
    userId,
    propertyId,
    roomId,
    accessToken,
    refreshToken,
  )

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    upserted: result.upserted,
    roomId,
    propertyId,
    message: `Cache refreshed – ${result.upserted} days written.`,
  })
}
