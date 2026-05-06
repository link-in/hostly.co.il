import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/**
 * GET /api/dashboard/beds24/airbnb-listings?airbnbUserId=XXXXX
 * Returns all Airbnb listings for a specific Airbnb user connected to the master account.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const airbnbUserId = request.nextUrl.searchParams.get('airbnbUserId')
  if (!airbnbUserId) {
    return NextResponse.json({ error: 'airbnbUserId is required' }, { status: 400 })
  }

  try {
    const res = await fetchWithTokenRefresh(
      `${BASE_URL}/channels/airbnb/listings?airbnbUserId=${airbnbUserId}`
    )

    const rawText = await res.text()
    let data: unknown
    try { data = JSON.parse(rawText) } catch { data = rawText }

    console.log(`[Beds24] GET /channels/airbnb/listings → ${res.status}:`, JSON.stringify(data).slice(0, 300))

    if (!res.ok) {
      return NextResponse.json(
        { error: `Beds24 החזירה שגיאה: ${res.status}`, details: data },
        { status: 502 }
      )
    }

    // Beds24 returns an array of listing objects: [{ listingId, name, ... }]
    const listings = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? []

    return NextResponse.json({ listings })
  } catch (err) {
    console.error('[Beds24] airbnb-listings error:', err)
    return NextResponse.json(
      { error: 'שגיאה פנימית', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
