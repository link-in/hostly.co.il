import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { buildBookingComConnectUrl } from '@/lib/beds24/bookingComOAuth'

/**
 * GET /api/dashboard/beds24/booking-auth-url
 * Returns the Booking.com channel manager connection URL.
 * The user must complete the connection in Booking.com's extranet,
 * then manually map rooms in Beds24 control panel.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = buildBookingComConnectUrl()
  return NextResponse.json({
    url,
    note: 'לאחר החיבור, יש למפות חדרים ידנית ב-Beds24: Channels → Booking.com → Map rooms',
  })
}
