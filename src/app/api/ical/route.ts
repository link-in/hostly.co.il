import { NextResponse } from 'next/server'

// כתובות ה-URL של קבצי ה-iCal
const AIRBNB_ICAL_URL = 'https://www.airbnb.com/calendar/ical/1491057188555346537.ics?s=2c713733855705f1fad44dac7265f995&locale=he'
const BOOKING_ICAL_URL = 'https://ical.booking.com/v1/export?t=ef24eeab-5528-4e3c-9922-25a7c313426f'

// לא נכלל ב-static export - משתמשים ב-PHP endpoint בשרת ייצור
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  try {
    const results: { source: string; content: string; error?: string }[] = []

    // טעינת Airbnb
    try {
      const airbnbResponse = await fetch(AIRBNB_ICAL_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      if (airbnbResponse.ok) {
        const airbnbContent = await airbnbResponse.text()
        results.push({
          source: 'airbnb',
          content: airbnbContent,
        })
      } else {
        results.push({
          source: 'airbnb',
          content: '',
          error: `Status: ${airbnbResponse.status} ${airbnbResponse.statusText}`,
        })
      }
    } catch (error) {
      results.push({
        source: 'airbnb',
        content: '',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // טעינת Booking.com
    try {
      const bookingResponse = await fetch(BOOKING_ICAL_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      if (bookingResponse.ok) {
        const bookingContent = await bookingResponse.text()
        results.push({
          source: 'booking',
          content: bookingContent,
        })
      } else {
        results.push({
          source: 'booking',
          content: '',
          error: `Status: ${bookingResponse.status} ${bookingResponse.statusText}`,
        })
      }
    } catch (error) {
      results.push({
        source: 'booking',
        content: '',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch iCal files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

