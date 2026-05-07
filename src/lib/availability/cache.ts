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
  price: number
  available: boolean  // num_avail > 0
  minStay: number
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

interface FlatRow {
  date: string
  price: number
  numAvail: number
  minStay: number
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
          const date = getString(row, ['date', 'day', 'startDate'])
          const price = extractPrice(row)
          const numAvail = getNumber(row, ['numAvail', 'avail', 'available', 'availability', 'units']) ?? 1
          const minStay = getNumber(row, ['minStay', 'minimumStay', 'min_stay']) ?? 1
          if (!date || price === undefined) return []
          return [{ date, price, numAvail, minStay }]
        })
      }

      // Range-style calendar entry
      const from = getString(calendar, ['from', 'startDate'])
      const to = getString(calendar, ['to', 'endDate'])
      const price = extractPrice(calendar)
      const numAvail = getNumber(calendar, ['numAvail', 'avail', 'available', 'availability', 'units']) ?? 1
      const minStay = getNumber(calendar, ['minStay', 'minimumStay', 'min_stay']) ?? 1

      if (!from || !to || price === undefined) return []

      const start = normalizeDate(new Date(from))
      const end = normalizeDate(new Date(to))
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

      const entries: FlatRow[] = []
      let cursor = start
      while (cursor <= end) {
        entries.push({ date: fmtDate(cursor), price, numAvail, minStay })
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

    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const upsertRows = rows.map((row) => ({
      user_id: userId,
      room_id: roomId,
      property_id: propertyId,
      date: row.date,
      price: row.price,
      num_avail: row.numAvail,
      min_stay: row.minStay,
      cached_at: now,
    }))

    const { error: dbError } = await supabase
      .from('availability_cache')
      .upsert(upsertRows, { onConflict: 'user_id,room_id,date' })

    if (dbError) {
      console.error('[AvailabilityCache] DB upsert error:', dbError)
      return { upserted: 0, error: dbError.message }
    }

    console.log(`[AvailabilityCache] Upserted ${upsertRows.length} rows for room ${roomId}`)
    return { upserted: upsertRows.length }
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
export async function getAvailability(
  userId: string,
  roomId: string,
  from: string,
  to: string,
): Promise<CachedAvailability | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('availability_cache')
    .select('date, price, num_avail, min_stay, cached_at, property_id')
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
      price: row.price,
      available: row.num_avail > 0,
      minStay: row.min_stay ?? 1,
    })),
  }
}
