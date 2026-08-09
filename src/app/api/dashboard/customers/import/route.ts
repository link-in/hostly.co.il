import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { addOrUpdateCustomer, customerMatchesGuest } from '@/lib/customers/addOrUpdateCustomer'
import { createServerClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { extractBookingSource } from '@/lib/bookings/normalizer'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

type GuestFromBooking = {
  fullName: string
  phone: string | null
  email: string | null
  bookingDate: string
  bookingSource: string
  bookingId: string
}

function parseRoomIds(sessionRoomId: string | null | undefined): string[] {
  if (!sessionRoomId) return []
  return sessionRoomId
    .split(',')
    .map((part) => part.split(':')[0].trim())
    .filter(Boolean)
}

function bookingToGuest(booking: Record<string, unknown>): GuestFromBooking | null {
  const firstName = String(booking.firstName || '').trim()
  const lastName = String(booking.lastName || '').trim()
  const fullName = `${firstName} ${lastName}`.trim()
  if (!fullName || fullName.length < 2) return null

  const status = String(booking.status ?? '').toLowerCase()
  // Skip cancelled / blocked only — keep Airbnb confirmed/new/request guests
  if (status === '0' || status === 'cancelled' || status === '4' || status === 'black') {
    return null
  }

  // Prefer real contact fields; Airbnb often leaves phone empty or uses a proxy
  const rawPhone = String(booking.mobile || booking.phone || '').trim() || null
  const phone =
    rawPhone && !/airbnb/i.test(rawPhone) && rawPhone.replace(/\D/g, '').length >= 8
      ? rawPhone
      : null

  return {
    fullName,
    phone,
    email: String(booking.email || '').trim() || null,
    bookingDate: String(booking.arrival || booking.bookingTime || new Date().toISOString()),
    bookingSource: extractBookingSource(booking),
    bookingId: String(booking.id ?? booking.bookId ?? ''),
  }
}

async function fetchAllBookingsForSession(session: {
  user?: {
    id?: string
    propertyId?: string | null
    roomId?: string | null
    beds24Token?: string
    beds24RefreshToken?: string
  }
}): Promise<Record<string, unknown>[]> {
  const propertyId = session.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  if (!propertyId) return []

  const roomIds = parseRoomIds(session.user?.roomId)
  // If no room list, one fetch without room filter
  const targets = roomIds.length > 0 ? roomIds : [null]

  const userTokens =
    session.user?.beds24Token && session.user?.beds24RefreshToken
      ? {
          accessToken: session.user.beds24Token,
          refreshToken: session.user.beds24RefreshToken,
        }
      : undefined

  const all: Record<string, unknown>[] = []
  const seenIds = new Set<string>()

  for (const roomId of targets) {
    const url = new URL(`${process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL}/bookings`)
    url.searchParams.set('arrivalFrom', '2024-01-01')
    url.searchParams.set('includeInvoice', 'true')
    url.searchParams.set('propertyId', String(propertyId))
    if (roomId) url.searchParams.set('roomId', roomId)

    const response = await fetchWithTokenRefresh(
      url.toString(),
      {},
      userTokens,
      session.user?.id,
    )
    if (!response.ok) {
      console.error('❌ Beds24 bookings fetch failed:', response.status, roomId)
      continue
    }

    const data = await response.json()
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const booking = item as Record<string, unknown>
      const id = String(booking.id ?? `${booking.firstName}-${booking.arrival}`)
      if (seenIds.has(id)) continue
      seenIds.add(id)
      all.push(booking)
    }
  }

  return all
}

function collectUniqueGuests(bookings: Record<string, unknown>[]): GuestFromBooking[] {
  const guests: GuestFromBooking[] = []
  const seen = new Set<string>()

  for (const booking of bookings) {
    const guest = bookingToGuest(booking)
    if (!guest) continue
    const key = [
      guest.email?.toLowerCase() || '',
      guest.phone || '',
      guest.fullName.trim().toLowerCase(),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    guests.push(guest)
  }

  return guests
}

/**
 * GET — audit: compare Beds24 guests vs CRM customers (no writes).
 * POST — import/sync missing customers from Beds24 bookings.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookings = await fetchAllBookingsForSession(session)
    const guests = collectUniqueGuests(bookings)

    const supabase = createServerClient()
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, full_name, phone, email')
      .eq('user_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const crm = (customers || []).map((row) => ({
      id: row.id as string,
      fullName: String(row.full_name || ''),
      phone: (row.phone as string | null) || null,
      email: (row.email as string | null) || null,
    }))

    const missing = guests.filter(
      (guest) => !crm.some((customer) => customerMatchesGuest(customer, guest)),
    )

    return NextResponse.json({
      customersInDb: crm.length,
      uniqueGuestsFromBookings: guests.length,
      totalBookings: bookings.length,
      missingCount: missing.length,
      missing: missing.slice(0, 50).map((g) => ({
        fullName: g.fullName,
        phone: g.phone,
        email: g.email,
        bookingSource: g.bookingSource,
        bookingDate: g.bookingDate,
      })),
    })
  } catch (error) {
    console.error('Error in GET /api/dashboard/customers/import:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting customer import/sync from Beds24...')

    const bookings = await fetchAllBookingsForSession(session)
    const guests = collectUniqueGuests(bookings)
    const currentUserId = session.user.id

    let createdCount = 0
    let updatedCount = 0
    let errorCount = 0
    const createdNames: string[] = []

    for (const guest of guests) {
      const result = await addOrUpdateCustomer({
        userId: currentUserId,
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email,
        bookingDate: guest.bookingDate,
        bookingSource: guest.bookingSource,
        incrementBookings: false,
      })

      if (!result.success) {
        errorCount++
        continue
      }
      if (result.created) {
        createdCount++
        if (createdNames.length < 20) createdNames.push(guest.fullName)
      } else if (result.updated) {
        updatedCount++
      }
    }

    console.log('✅ Import complete:', {
      bookings: bookings.length,
      guests: guests.length,
      created: createdCount,
      updated: updatedCount,
      errors: errorCount,
    })

    return NextResponse.json({
      success: true,
      message: 'Import completed successfully',
      stats: {
        totalBookings: bookings.length,
        uniqueGuests: guests.length,
        customersCreated: createdCount,
        customersUpdated: updatedCount,
        customersImported: createdCount + updatedCount,
        errors: errorCount,
        createdNames,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/dashboard/customers/import:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
