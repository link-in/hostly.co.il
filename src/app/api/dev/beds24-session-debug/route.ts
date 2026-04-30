import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

/**
 * Dev-only: query Beds24 using the session's user-specific token
 * so we can test what the actual working token can access.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  const token = session?.user?.beds24Token ?? process.env.BEDS24_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'No token available' }, { status: 400 })
  }

  const base = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID

  const queries = [
    { label: 'allRooms', url: `${base}/inventory/rooms?propertyId=${propertyId}` },
    { label: 'room672381', url: `${base}/inventory/rooms?roomId=672381` },
    { label: 'noFilter', url: `${base}/inventory/rooms` },
    { label: 'properties', url: `${base}/inventory/properties` },
  ]

  const results: Record<string, unknown> = {
    tokenPrefix: token.slice(0, 20) + '...',
    isSessionToken: !!session?.user?.beds24Token,
  }

  await Promise.all(
    queries.map(async ({ label, url }) => {
      const r = await fetch(url, { headers: { token, accept: 'application/json' } })
      results[label] = await r.json()
    })
  )

  return NextResponse.json(results)
}
