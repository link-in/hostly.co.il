import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  onlinePriceCheckInputSchema,
  scanChannelOnlinePrice,
  calculateHostlyPrice,
  type OnlineChannelPriceResult,
  type PriceCheckDateParams,
} from '@/lib/pricing/onlinePriceFetcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const parsed = onlinePriceCheckInputSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'נתוני הבקשה אינם תקינים',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    const { checkIn, checkOut, numAdult, numChild, basePrice: reqBasePrice, channels } = parsed.data

    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Fallback base price if not specified
    const basePrice = reqBasePrice !== undefined && reqBasePrice > 0 ? reqBasePrice : 500 * nights

    const params: PriceCheckDateParams = {
      checkIn,
      checkOut,
      numAdult,
      numChild,
    }

    // Demo user simulation if no specific custom URLs were entered
    const isDemo = session.user.isDemo
    const hasAnyCustomUrl = Boolean(channels.airbnb?.trim() || channels.booking?.trim() || channels.direct?.trim())

    let results: OnlineChannelPriceResult[]

    if (isDemo && !hasAnyCustomUrl) {
      const now = new Date().toISOString()
      const airbnbHostly = calculateHostlyPrice('airbnb', basePrice)
      const bookingHostly = calculateHostlyPrice('booking', basePrice)
      const directHostly = calculateHostlyPrice('direct', basePrice)

      const siteBase = process.env.NEXT_PUBLIC_BASE_URL || 'https://hostly.site'

      results = [
        {
          channelKey: 'airbnb',
          name: 'Airbnb',
          url: `https://www.airbnb.co.il/rooms/demo-101?check_in=${checkIn}&check_out=${checkOut}&adults=${numAdult}${numChild > 0 ? `&children=${numChild}` : ''}`,
          status: 'success',
          statusMessage: 'המחיר נסרק בהצלחה מאתר Airbnb (הדגמה)',
          hostlyPrice: airbnbHostly,
          beds24Price: airbnbHostly,
          onlinePrice: airbnbHostly,
          currency: 'ILS',
          diff: 0,
          diffPercent: 0,
          matchStatus: 'matched',
          matchMessage: 'תואם במדויק',
          fetchedAt: now,
        },
        {
          channelKey: 'booking',
          name: 'Booking.com',
          url: `https://www.booking.com/hotel/il/demo-suites.html?checkin=${checkIn}&checkout=${checkOut}&group_adults=${numAdult}${numChild > 0 ? `&group_children=${numChild}` : ''}`,
          status: 'success',
          statusMessage: 'המחיר נסרק בהצלחה מ-Booking.com (הדגמה)',
          hostlyPrice: bookingHostly,
          beds24Price: bookingHostly,
          onlinePrice: bookingHostly,
          currency: 'ILS',
          diff: 0,
          diffPercent: 0,
          matchStatus: 'matched',
          matchMessage: 'תואם במדויק',
          fetchedAt: now,
        },
        {
          channelKey: 'direct',
          name: 'אתר הזמנות ישיר',
          url: `${siteBase}/sites/demo-property?checkIn=${checkIn}&checkOut=${checkOut}&adults=${numAdult}${numChild > 0 ? `&children=${numChild}` : ''}`,
          status: 'success',
          statusMessage: 'המחיר נסרק בהצלחה מאתר ההזמנות הישיר (הדגמה)',
          hostlyPrice: directHostly,
          beds24Price: directHostly,
          onlinePrice: directHostly,
          currency: 'ILS',
          diff: 0,
          diffPercent: 0,
          matchStatus: 'matched',
          matchMessage: 'תואם במדויק',
          fetchedAt: now,
        },
      ]
    } else {
      // Real scan in parallel
      const [airbnbResult, bookingResult, directResult] = await Promise.all([
        scanChannelOnlinePrice('airbnb', channels.airbnb || '', params, basePrice),
        scanChannelOnlinePrice('booking', channels.booking || '', params, basePrice),
        scanChannelOnlinePrice('direct', channels.direct || '', params, basePrice),
      ])

      results = [airbnbResult, bookingResult, directResult]
    }

    return NextResponse.json({
      checkIn,
      checkOut,
      numAdult,
      numChild,
      nights,
      basePrice,
      channels: results,
    })
  } catch (error) {
    console.error('❌ Online price check error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
