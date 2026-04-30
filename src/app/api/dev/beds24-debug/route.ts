import { NextResponse } from 'next/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

/**
 * Dev-only debug endpoint: inspect raw Beds24 /inventory/rooms response.
 * Usage:
 *   GET /api/dev/beds24-debug                          → all rooms for property from env
 *   GET /api/dev/beds24-debug?propertyId=X             → all rooms for specific property
 *   GET /api/dev/beds24-debug?roomId=Y                 → specific room
 *   GET /api/dev/beds24-debug?noProperty=1             → all rooms (no propertyId filter)
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const base = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

  const url = new URL(`${base}/inventory/rooms`)

  if (searchParams.get('noProperty') !== '1') {
    const propertyId = searchParams.get('propertyId') ?? process.env.BEDS24_PROPERTY_ID
    if (propertyId) url.searchParams.set('propertyId', propertyId)
  }

  const roomId = searchParams.get('roomId')
  if (roomId) url.searchParams.set('roomId', roomId)

  try {
    const response = await fetchWithTokenRefresh(url.toString())
    const raw = await response.json()
    return NextResponse.json({
      status: response.status,
      url: url.toString(),
      data: raw,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
