import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { buildAirbnbOAuthUrl } from '@/lib/beds24/airbnbOAuth'

/**
 * GET /api/admin/beds24/airbnb-auth-url?propertyId=XXXXX
 * Returns the Airbnb OAuth URL for connecting a new Airbnb account to the Beds24 master account.
 * Constructed directly from Beds24's known OAuth parameters — no "channel enabled" prerequisite.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const propertyId = request.nextUrl.searchParams.get('propertyId')
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }

  const url = buildAirbnbOAuthUrl(propertyId)
  return NextResponse.json({ url })
}
