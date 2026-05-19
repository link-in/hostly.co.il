/**
 * Availability Cache Service
 *
 * Stores per-room, per-date pricing & availability data fetched from Beds24
 * into Supabase. The cache is refreshed on Beds24 webhook events.
 *
 * Scoped per user (tenant) so Beds24 room IDs that happen to be identical
 * across different accounts never collide.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import crypto from 'crypto'

const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailabilityRow {
  date: string        // YYYY-MM-DD
  price: number       // price for the requested numGuest (or price1 as fallback)
  available: boolean  // num_avail > 0
  minStay: number
}

/** Raw per-guest-count prices as stored in the DB (price1…price6). */
export interface PricesByGuest {
  1?: number
  2?: number
  3?: number
  4?: number
  5?: number
  6?: number
}

export interface CachedAvailability {
  roomId: string
  propertyId: string
  cachedAt: string    // ISO timestamp of the most recent cache write
  availability: AvailabilityRow[]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildDateRange(months = 3): { startDate: string; endDate: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function getString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'string') return candidate
    if (typeof candidate === 'number') return String(candidate)
  }
  return undefined
}

function getNumber(value: unknown, keys: string[]): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'number') return candidate
    if (typeof candidate === 'string') {
      const parsed = parseFloat(candidate)
      if (!isNaN(parsed)) return parsed
    }
  }
  return undefined
}

function extractPrice(row: unknown): number | undefined {
  const direct = getNumber(row, ['price', 'price1', 'rate', 'amount', 'basePrice'])
  if (direct !== undefined) return direct
  if (!row || typeof row !== 'object') return undefined
  const prices = (row as Record<string, unknown>).prices
  if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
    const fromObj = getNumber(prices, ['price', 'price1', 'rate', 'amount', 'basePrice'])
    if (fromObj !== undefined) return fromObj
  }
  if (Array.isArray(prices)) {
    for (const entry of prices) {
      const fromEntry = getNumber(entry, ['price', 'price1', 'rate', 'amount', 'basePrice'])
      if (fromEntry !== undefined) return fromEntry
    }
  }
  return undefined
}

function normalizeDate(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d)
  n.setDate(n.getDate() + days)
  return n
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Extract the prices map {1: price1, 2: price2, ...} from a Beds24 row. */
function extractPrices( row: unknown ): PricesByGuest {
  if ( ! row || typeof row !== 'object' ) return {}
  const r = row as Record<string, unknown>
  const out: PricesByGuest = {}
  for ( const n of [ 1, 2, 3, 4, 5, 6 ] as const ) {
    const v = getNumber( r, [ `price${ n }` ] )
    if ( v !== undefined ) out[ n ] = v
  }
  // If only a generic "price" key is present, treat it as price1.
  if ( Object.keys( out ).length === 0 ) {
    const fallback = extractPrice( row )
    if ( fallback !== undefined ) out[ 1 ] = fallback
  }
  return out
}

interface FlatRow {
  date: string
  price: number      // price1 (base)
  prices: PricesByGuest
  numAvail: number
  minStay: number
}

// ---------------------------------------------------------------------------
// Bookings helper — fetches confirmed bookings and returns blocked date sets
// ---------------------------------------------------------------------------

/**
 * Fetch confirmed bookings from Beds24 for the given room + date range and
 * return a Set of YYYY-MM-DD strings that are blocked (firstNight..lastNight
 * inclusive, since the last night is still an occupied night).
 */
async function fetchBlockedDates(
  propertyId: string,
  roomId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  refreshToken: string,
  userId: string,
): Promise<Set<string>> {
  const blocked = new Set<string>()

  try {
    const url = new URL(`${BEDS24_BASE_URL}/bookings`)
    url.searchParams.set('propertyId', propertyId)
    url.searchParams.set('roomId', roomId)
    // Use arrivalFrom/To + departureFrom/To to capture all bookings that
    // overlap the window, not only those that arrive inside it.
    url.searchParams.set('arrivalFrom', startDate)
    url.searchParams.set('departureFrom', startDate)
    url.searchParams.set('arrivalTo', endDate)
    url.searchParams.set('departureTo', endDate)

    const response = await fetchWithTokenRefresh(
      url.toString(),
      { headers: { 'content-type': 'application/json' } },
      { accessToken, refreshToken },
      userId,
    )

    if ( ! response.ok ) {
      console.warn( `[AvailabilityCache] /bookings returned ${ response.status } — skipping booking overlay` )
      return blocked
    }

    const data = await response.json() as { data?: unknown[] } | unknown[]
    const bookings: unknown[] = Array.isArray( data )
      ? data
      : Array.isArray( (data as { data?: unknown[] }).data )
        ? (data as { data: unknown[] }).data
        : []

    for ( const booking of bookings ) {
      const b = booking as Record<string, unknown>

      // Beds24 v2 uses firstNight / lastNight; fall back to arrival/departure
      const firstNight = getString( b, [ 'firstNight', 'arrival', 'checkIn', 'startDate' ] )
      const lastNight  = getString( b, [ 'lastNight',  'departure', 'checkOut', 'endDate' ] )

      if ( ! firstNight || ! lastNight ) continue

      const start = normalizeDate( new Date( firstNight ) )
      const end   = normalizeDate( new Date( lastNight ) )

      if ( isNaN( start.getTime() ) || isNaN( end.getTime() ) ) continue

      // Mark every night from firstNight up to (but NOT including) the
      // departure day — the departure day itself is free for new arrivals.
      let cursor = start
      while ( cursor < end ) {
        blocked.add( fmtDate( cursor ) )
        cursor = addDays( cursor, 1 )
      }
    }

    console.log( `[AvailabilityCache] ${ blocked.size } nights blocked by bookings for room ${ roomId }` )
  } catch ( err ) {
    console.warn( '[AvailabilityCache] fetchBlockedDates error (non-fatal):', err )
  }

  return blocked
}

function flattenCalendarData(data: unknown): FlatRow[] {
  const rooms = Array.isArray((data as Record<string, unknown>)?.data)
    ? ((data as Record<string, unknown>).data as unknown[])
    : []

  const calendarOnly =
    !rooms.length && (data as Record<string, unknown>)?.calendar
      ? [{ calendar: (data as Record<string, unknown>).calendar }]
      : []

  const sourceRooms = rooms.length ? rooms : calendarOnly

  return sourceRooms.flatMap((room: unknown) => {
    const calendars = Array.isArray((room as Record<string, unknown>)?.calendar)
      ? ((room as Record<string, unknown>).calendar as unknown[])
      : []

    return calendars.flatMap((calendar: unknown) => {
      const rows = Array.isArray((calendar as Record<string, unknown>)?.rows)
        ? ((calendar as Record<string, unknown>).rows as unknown[])
        : []

      if (rows.length) {
        return rows.flatMap((row: unknown): FlatRow[] => {
          const date     = getString(row, ['date', 'day', 'startDate'])
          const price    = extractPrice(row)
          const prices   = extractPrices(row)
          const numAvail = getNumber(row, ['numAvail', 'avail', 'available', 'availability', 'units']) ?? 1
          const minStay  = getNumber(row, ['minStay', 'minimumStay', 'min_stay']) ?? 1
          if (!date || price === undefined) return []
          return [{ date, price, prices, numAvail, minStay }]
        })
      }

      // Range-style calendar entry (e.g. Beds24 { from, to, price1, price2, … })
      const from     = getString(calendar, ['from', 'startDate'])
      const to       = getString(calendar, ['to', 'endDate'])
      const price    = extractPrice(calendar)
      const prices   = extractPrices(calendar)
      const numAvail = getNumber(calendar, ['numAvail', 'avail', 'available', 'availability', 'units']) ?? 1
      const minStay  = getNumber(calendar, ['minStay', 'minimumStay', 'min_stay']) ?? 1

      if (!from || !to || price === undefined) return []

      const start = normalizeDate(new Date(from))
      const end   = normalizeDate(new Date(to))
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

      const entries: FlatRow[] = []
      let cursor = start
      while (cursor <= end) {
        entries.push({ date: fmtDate(cursor), price, prices, numAvail, minStay })
        cursor = addDays(cursor, 1)
      }
      return entries
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new API key in the format `hst_live_<32 random hex chars>`.
 */
export function generateApiKey(): string {
  return `hst_live_${crypto.randomBytes(20).toString('hex')}`
}

/**
 * Fetch fresh calendar data from Beds24 for a specific room and write it into
 * `availability_cache`. Uses upsert so partial updates are safe.
 *
 * @param userId       Hostly user ID (tenant)
 * @param propertyId   Beds24 property ID
 * @param roomId       Beds24 room ID
 * @param accessToken  User's Beds24 access token
 * @param refreshToken User's Beds24 refresh token
 */
export async function refreshRoomCache(
  userId: string,
  propertyId: string,
  roomId: string,
  accessToken: string,
  refreshToken: string,
): Promise<{ upserted: number; error?: string }> {
  try {
    const { startDate, endDate } = buildDateRange(3)

    const url = new URL(`${BEDS24_BASE_URL}/inventory/rooms/calendar`)
    url.searchParams.set('propertyId', propertyId)
    url.searchParams.set('roomId', roomId)
    url.searchParams.set('startDate', startDate)
    url.searchParams.set('endDate', endDate)
    url.searchParams.set('includePrices', '1')
    url.searchParams.set('includeAvailability', '1')

    const response = await fetchWithTokenRefresh(
      url.toString(),
      { headers: { 'content-type': 'application/json' } },
      { accessToken, refreshToken },
      userId,
    )

    if (!response.ok) {
      const details = await response.text()
      console.error(`[AvailabilityCache] Beds24 error ${response.status}:`, details)
      return { upserted: 0, error: `Beds24 returned ${response.status}` }
    }

    const data = await response.json()
    const rows = flattenCalendarData(data)

    if (!rows.length) {
      console.warn(`[AvailabilityCache] No rows returned for room ${roomId}`)
      return { upserted: 0 }
    }

    // ── Overlay confirmed bookings so that booked nights show numAvail = 0 ──
    // The calendar endpoint may return numAvail = 1 even for booked dates when
    // "Auto Reduce Availability" is not enabled in Beds24.  Fetching the
    // actual bookings and zeroing those nights guarantees accuracy.
    const blockedDates = await fetchBlockedDates(
      propertyId,
      roomId,
      startDate,
      endDate,
      accessToken,
      refreshToken,
      userId,
    )

    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const upsertRowsBase = rows.map((row) => ({
      user_id: userId,
      room_id: roomId,
      property_id: propertyId,
      date: row.date,
      price: row.price,
      num_avail: blockedDates.has(row.date) ? 0 : row.numAvail,
      min_stay: row.minStay,
      cached_at: now,
    }))

    const upsertRowsWithPrices = rows.map((row, i) => ({
      ...upsertRowsBase[i],
      prices: row.prices,
    }))

    // Try upsert with the `prices` column first; fall back without it if the
    // column hasn't been added yet (graceful migration path).
    let { error: dbError } = await supabase
      .from('availability_cache')
      .upsert(upsertRowsWithPrices, { onConflict: 'user_id,room_id,date' })

    if ( dbError && dbError.code === 'PGRST204' ) {
      // prices column doesn't exist yet — upsert without it
      console.warn( '[AvailabilityCache] `prices` column missing — upserting without it. Run migration to enable per-guest pricing.' );
      ( { error: dbError } = await supabase
        .from( 'availability_cache' )
        .upsert( upsertRowsBase, { onConflict: 'user_id,room_id,date' } ) )
    }

    if (dbError) {
      console.error('[AvailabilityCache] DB upsert error:', dbError)
      return { upserted: 0, error: dbError.message }
    }

    console.log(`[AvailabilityCache] Upserted ${upsertRowsBase.length} rows for room ${roomId}`)
    return { upserted: upsertRowsBase.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AvailabilityCache] Unexpected error:', msg)
    return { upserted: 0, error: msg }
  }
}

/**
 * Read cached availability for a room from Supabase.
 * Scoped by user_id to prevent cross-tenant data leakage.
 */
/**
 * Pick the best price for the requested guest count from the stored prices map.
 * Falls back to price1 → the generic price column if nothing else matches.
 */
function resolvePriceForGuests( prices: PricesByGuest | null, fallback: number, numGuest: number ): number {
  if ( ! prices ) return fallback
  // Try exact match, then walk down to 1
  for ( let n = Math.min( numGuest, 6 ) as 1|2|3|4|5|6; n >= 1; n-- ) {
    const v = prices[ n ]
    if ( v !== undefined ) return v
  }
  return fallback
}

export async function getAvailability(
  userId: string,
  roomId: string,
  from: string,
  to: string,
  numGuest = 1,
): Promise<CachedAvailability | null> {
  const supabase = createServiceRoleClient()

  // Include `prices` in select; older rows without it will have prices=null.
  const { data, error } = await supabase
    .from('availability_cache')
    .select('date, price, prices, num_avail, min_stay, cached_at, property_id')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) {
    console.error('[AvailabilityCache] getAvailability error:', error)
    return null
  }

  if (!data || data.length === 0) return null

  const cachedAt = data.reduce((latest, row) => {
    return row.cached_at > latest ? row.cached_at : latest
  }, data[0].cached_at)

  return {
    roomId,
    propertyId: data[0].property_id,
    cachedAt,
    availability: data.map((row) => ({
      date: row.date,
      price: resolvePriceForGuests( row.prices as PricesByGuest | null, row.price, numGuest ),
      available: row.num_avail > 0,
      minStay: row.min_stay ?? 1,
    })),
  }
}
