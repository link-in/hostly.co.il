/**
 * GET /api/admin/debug/beds24?propertyId=327466
 *
 * Diagnostic: returns rooms + calendar raw data from Beds24 for a given property.
 * Admin-only. Dev/staging use only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://api.beds24.com/v2'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const adminSecret = process.env.ADMIN_CACHE_SECRET
  const headerSecret = request.headers.get('x-admin-secret')
  const isAdminSession = session?.user?.role === 'admin'
  const isSecretAuth = adminSecret && headerSecret === adminSecret

  if (!isAdminSession && !isSecretAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId') ?? session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = searchParams.get('roomId')

  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? { accessToken: session.user.beds24Token, refreshToken: session.user.beds24RefreshToken }
    : undefined

  // 1. Fetch rooms under the property
  const roomsUrl = new URL(`${BASE_URL}/inventory/rooms`)
  if (propertyId) roomsUrl.searchParams.set('propertyId', propertyId)

  // 2. Fetch calendar data
  const calendarUrl = new URL(`${BASE_URL}/inventory/rooms/calendar`)
  if (propertyId) calendarUrl.searchParams.set('propertyId', propertyId)
  if (roomId) calendarUrl.searchParams.set('roomId', roomId)
  calendarUrl.searchParams.set('startDate', new Date().toISOString().slice(0, 10))
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)
  calendarUrl.searchParams.set('endDate', endDate.toISOString().slice(0, 10))
  calendarUrl.searchParams.set('includePrices', '1')

  const [roomsRes, calendarRes] = await Promise.all([
    fetchWithTokenRefresh(roomsUrl.toString(), {}, userTokens, session?.user?.id),
    fetchWithTokenRefresh(calendarUrl.toString(), {}, userTokens, session?.user?.id),
  ])

  const roomsData = roomsRes.ok ? await roomsRes.json() : { error: await roomsRes.text(), status: roomsRes.status }
  const calendarData = calendarRes.ok ? await calendarRes.json() : { error: await calendarRes.text(), status: calendarRes.status }

  return NextResponse.json({
    propertyId,
    roomId: roomId ?? 'not specified',
    roomsUrl: roomsUrl.toString(),
    calendarUrl: calendarUrl.toString(),
    rooms: roomsData,
    calendar: calendarData,
  })
}
