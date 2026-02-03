import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

export async function GET() {
  const session = await getServerSession(authOptions)
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

  if (!propertyId || !roomId) {
    return NextResponse.json(
      { error: 'Missing Property ID or Room ID' },
      { status: 400 }
    )
  }

  const url = new URL(`${getBaseUrl()}/reservations`)
  url.searchParams.set('propertyId', propertyId)
  url.searchParams.set('roomId', roomId)

  console.log(`🔍 Fetching reservations for Property: ${propertyId}, Room: ${roomId}`)

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? { accessToken: session.user.beds24Token, refreshToken: session.user.beds24RefreshToken }
    : undefined

  if (userTokens) {
    console.log('🔑 Using user-specific Beds24 tokens for reservations')
  } else {
    console.log('🌍 Using global Beds24 tokens for reservations')
  }

  try {
    const response = await fetchWithTokenRefresh(url.toString(), {}, userTokens, session?.user?.id)

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reach Beds24',
        details: error instanceof Error ? error.message : String(error),
        endpoint: url.toString(),
      },
      { status: 502 }
    )
  }
}
