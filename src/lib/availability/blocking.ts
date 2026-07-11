/**
 * Manual date-blocking helpers for the Beds24 rooms calendar route.
 *
 * Beds24's `GET /inventory/rooms/calendar` endpoint never returns `numAvail`
 * (it only returns price overrides), so we persist manual block/unblock
 * actions ourselves in Supabase `availability_cache` and overlay them onto
 * every GET response. This module isolates that logic so it can be unit
 * tested without spinning up the Next.js route handler.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface PriceEntry {
  date: string
  price: number
  roomId: string | null
  numAvail: number
}

interface CalendarPayloadEntry {
  from?: string
  to?: string
  numAvail?: number
  price1?: number
}

interface RoomsPostItem {
  roomId?: number
  propertyId?: number
  calendar?: unknown[]
}

interface AvailabilityCacheRow {
  user_id: string
  room_id: string
  property_id: string
  date: string
  num_avail: number
  price: number
  min_stay: number
  cached_at: string
}

/** Overlay numAvail from Supabase availability_cache onto a prices array. */
export async function overlayAvailabilityCache(
  prices: PriceEntry[],
  userId: string | undefined,
  roomId: string | undefined,
): Promise<PriceEntry[]> {
  if (!userId || !roomId) return prices
  try {
    const supabase = createServiceRoleClient()
    const { data: cacheRows } = await supabase
      .from('availability_cache')
      .select('date, num_avail')
      .eq('user_id', userId)
      .eq('room_id', roomId)

    if (!cacheRows?.length) return prices

    const cacheMap: Record<string, number> = {}
    cacheRows.forEach((row) => { cacheMap[row.date] = row.num_avail })

    // Apply cache numAvail to existing price entries
    const overlaid = prices.map((p) => ({
      ...p,
      numAvail: cacheMap[p.date] !== undefined ? cacheMap[p.date] : p.numAvail,
    }))

    // Also inject blocked dates from cache that have no price entry in Beds24
    const pricesDates = new Set(overlaid.map((p) => p.date))
    cacheRows.forEach((row) => {
      if (row.num_avail === 0 && !pricesDates.has(row.date)) {
        overlaid.push({ date: row.date, price: 0, roomId, numAvail: 0 })
      }
    })

    return overlaid
  } catch (err) {
    console.warn('[rooms GET] availability_cache overlay failed (non-fatal):', err)
    return prices
  }
}

/**
 * Parse a `calendar[].from`/`to` date range into individual `YYYY-MM-DD`
 * strings, using LOCAL date components (not `new Date(str).toISOString()`)
 * to avoid UTC-vs-local-timezone off-by-one errors — e.g. a server running
 * in UTC+3 parsing "2026-07-12" as UTC midnight would otherwise roll back
 * to "2026-07-11" once converted through `toISOString()`.
 */
export function expandDateRangeLocal(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const endDate = new Date(ty, tm - 1, td)

  const dates: string[] = []
  while (cursor <= endDate) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Build the availability_cache rows implied by a normalized POST payload,
 * grouped by roomId. Pure function — no I/O — so it's trivially unit testable.
 */
export function buildCacheRowsFromPayload(
  normalizedPayload: unknown,
  userId: string,
  defaultRoomId: string | undefined,
  propertyId: string | undefined,
  now: string = new Date().toISOString(),
): Record<string, AvailabilityCacheRow[]> {
  const items = Array.isArray(normalizedPayload) ? normalizedPayload : [normalizedPayload]
  const byRoom: Record<string, AvailabilityCacheRow[]> = {}

  for (const item of items) {
    const it = item as RoomsPostItem
    const itemRoomId = String(it.roomId ?? defaultRoomId ?? '')
    const itemPropId = String(it.propertyId ?? propertyId ?? '')
    if (!itemRoomId || !it.calendar?.length) continue

    if (!byRoom[itemRoomId]) byRoom[itemRoomId] = []

    for (const entry of it.calendar) {
      const e = entry as CalendarPayloadEntry
      if (e.numAvail === undefined || !e.from) continue

      const dates = expandDateRangeLocal(e.from, e.to ?? e.from)
      for (const date of dates) {
        byRoom[itemRoomId].push({
          user_id: userId,
          room_id: itemRoomId,
          property_id: itemPropId,
          date,
          num_avail: e.numAvail,
          price: e.price1 ?? 0,
          min_stay: 1,
          cached_at: now,
        })
      }
    }
  }

  return byRoom
}

/**
 * Write numAvail values from a POST payload to availability_cache so the
 * next GET can return correct blocking state without relying on Beds24 GET.
 */
export async function writeCacheAvailability(
  normalizedPayload: unknown,
  userId: string,
  defaultRoomId: string | undefined,
  propertyId: string | undefined,
): Promise<void> {
  try {
    const now = new Date().toISOString()
    const byRoom = buildCacheRowsFromPayload(normalizedPayload, userId, defaultRoomId, propertyId, now)
    const supabase = createServiceRoleClient()

    for (const rows of Object.values(byRoom)) {
      if (!rows.length) continue
      // Upsert — on conflict update only num_avail and cached_at to preserve existing price/min_stay.
      // We do this by first trying UPDATE, then INSERT for any missing rows.
      const dates = rows.map((r) => r.date)
      const numAvail = rows[0].num_avail // same per batch (blockDates/unblockDates send uniform value)
      const roomIdStr = rows[0].room_id

      await supabase
        .from('availability_cache')
        .update({ num_avail: numAvail, cached_at: now })
        .eq('user_id', userId)
        .eq('room_id', roomIdStr)
        .in('date', dates)

      // Insert rows that didn't exist yet (e.g. brand-new date range)
      await supabase
        .from('availability_cache')
        .upsert(rows, { onConflict: 'user_id,room_id,date', ignoreDuplicates: true })
    }
  } catch (err) {
    console.warn('[rooms POST] availability_cache write failed (non-fatal):', err)
  }
}
