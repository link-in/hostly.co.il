import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { buildAirbnbOAuthUrl } from '@/lib/beds24/airbnbOAuth'

/**
 * GET /api/dashboard/beds24/airbnb-auth-url
 * Returns the Airbnb OAuth URL that connects a new Airbnb account to the Beds24 master account.
 * Constructed directly from Beds24's known OAuth parameters — no "channel enabled" prerequisite.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // propertyId is optional — importAsNewProperty creates the property automatically.
  // We pass it only as a hint/log reference; buildAirbnbOAuthUrl does not embed it in the URL.
  const propertyId = request.nextUrl.searchParams.get('propertyId') || session.user.propertyId || undefined

  const url = buildAirbnbOAuthUrl(propertyId)
  return NextResponse.json({ url })
}
