import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { addOrUpdateCustomer, customerMatchesGuest } from '@/lib/customers/addOrUpdateCustomer'
import { createServerClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { extractBookingSource } from '@/lib/bookings/normalizer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'
const MAX_PAGES_PER_ROOM = 15

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

function isSkippedStatus(status: unknown): boolean {
  const normalized = String(status ?? '').toLowerCase()
  return (
    normalized === '0' ||
    normalized === 'cancelled' ||
    normalized === '4' ||
    normalized === 'black' ||
    normalized === '5' ||
    normalized === 'inquiry'
  )
}

function bookingToGuest(booking: Record<string, unknown>): GuestFromBooking | null {
  const firstName = String(booking.firstName || '').trim()
  const lastName = String(booking.lastName || '').trim()
  const fullName = `${firstName} ${lastName}`.trim()
  if (!fullName || fullName.length < 2) return null
  if (isSkippedStatus(booking.status)) return null

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

function extractBookingsPage(payload: unknown): Record<string, unknown>[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (typeof payload !== 'object') return []

  const obj = payload as { data?: unknown; bookings?: unknown }
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[]
  if (Array.isArray(obj.bookings)) return obj.bookings as Record<string, unknown>[]
  return []
}

function hasMorePages(payload: unknown, page: number, pageSize: number): boolean {
  if (!payload || typeof payload !== 'object') return pageSize > 0
  const obj = payload as {
    pages?: number | { nextPageExists?: boolean; nextPageLink?: string | null }
    count?: number
  }

  if (typeof obj.pages === 'number') return page < obj.pages
  if (obj.pages && typeof obj.pages === 'object') {
    if (typeof obj.pages.nextPageExists === 'boolean') return obj.pages.nextPageExists
    if (obj.pages.nextPageLink) return true
  }
  return pageSize > 0
}

async function fetchBookingsForRoom(opts: {
  propertyId: string
  roomId: string | null
  userId?: string
  accessToken?: string
  refreshToken?: string
}): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = []
  const userTokens =
    opts.accessToken && opts.refreshToken
      ? { accessToken: opts.accessToken, refreshToken: opts.refreshToken }
      : undefined

  for (let page = 1; page <= MAX_PAGES_PER_ROOM; page += 1) {
    const url = new URL(`${process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL}/bookings`)
    // Lightweight payload — no invoices (was causing hang / timeouts)
    url.searchParams.set('arrivalFrom', '2024-01-01')
    url.searchParams.set('propertyId', opts.propertyId)
    url.searchParams.set('page', String(page))
    if (opts.roomId) url.searchParams.set('roomId', opts.roomId)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    let response: Response
    try {
      response = await fetchWithTokenRefresh(
        url.toString(),
        { signal: controller.signal },
        userTokens,
        opts.userId,
      )
    } catch (error) {
      clearTimeout(timeout)
      console.error('❌ Beds24 bookings fetch error:', opts.roomId, error)
      break
    }
    clearTimeout(timeout)

    if (!response.ok) {
      console.error('❌ Beds24 bookings fetch failed:', response.status, opts.roomId, `page=${page}`)
      break
    }

    const payload = await response.json()
    const pageRows = extractBookingsPage(payload)
    collected.push(...pageRows)

    if (pageRows.length === 0 || !hasMorePages(payload, page, pageRows.length)) {
      break
    }
  }

  return collected
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
  if (!propertyId) {
    console.warn('⚠️ No propertyId for customer sync')
    return []
  }

  const roomIds = parseRoomIds(session.user?.roomId)
  const targets = roomIds.length > 0 ? roomIds : [null]

  const results = await Promise.all(
    targets.map((roomId) =>
      fetchBookingsForRoom({
        propertyId: String(propertyId),
        roomId,
        userId: session.user?.id,
        accessToken: session.user?.beds24Token,
        refreshToken: session.user?.beds24RefreshToken,
      }),
    ),
  )

  const all: Record<string, unknown>[] = []
  const seenIds = new Set<string>()
  for (const list of results) {
    for (const booking of list) {
      const id = String(booking.id ?? `${booking.firstName}-${booking.arrival}`)
      if (seenIds.has(id)) continue
      seenIds.add(id)
      all.push(booking)
    }
  }

  console.log(`📦 Customer sync fetched ${all.length} bookings across ${targets.length} room(s)`)
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
export async function GET() {
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
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting customer import/sync from Beds24...')

    const bookings = await fetchAllBookingsForSession(session)
    const guests = collectUniqueGuests(bookings)
    const currentUserId = session.user.id

    if (bookings.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No bookings returned from Beds24',
        stats: {
          totalBookings: 0,
          uniqueGuests: 0,
          customersCreated: 0,
          customersUpdated: 0,
          customersImported: 0,
          errors: 0,
          createdNames: [] as string[],
        },
      })
    }

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
        console.error('❌ Failed to upsert', guest.fullName, result.error)
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
