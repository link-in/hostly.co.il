import { addMonths, format } from 'date-fns'
import type { AvailabilityRow, CachedAvailability } from '@/lib/availability/cache'
import type { NightlyRate } from './nightlyRates'

export const AVAILABILITY_HORIZON_MONTHS = 12
/** Same freshness window as the public calendar API. */
export const CACHE_FRESHNESS_MS = 30 * 60 * 1000

export interface SiteRoom {
  userId: string
  roomId: string
}

export interface DateWindow {
  from: string
  to: string
}

export interface SiteAvailabilityDeps {
  readCache: (room: SiteRoom, window: DateWindow) => Promise<CachedAvailability | null>
  fetchLive: (room: SiteRoom, window: DateWindow) => Promise<CachedAvailability | null>
  /** Re-warms the cache after the response (must not throw into the request). */
  refreshInBackground: (room: SiteRoom) => void
  now?: () => Date
}

export function bookingWindow(now: Date): DateWindow {
  return { from: format(now, 'yyyy-MM-dd'), to: format(addMonths(now, AVAILABILITY_HORIZON_MONTHS), 'yyyy-MM-dd') }
}

export function isCacheFresh(cache: CachedAvailability | null, now: Date): cache is CachedAvailability {
  return cache !== null && now.getTime() - new Date(cache.cachedAt).getTime() <= CACHE_FRESHNESS_MS
}

const toNightlyRate = (row: AvailabilityRow): NightlyRate => ({
  date: row.date,
  price: row.price,
  available: row.available,
  minStay: Math.max(1, Math.round(row.minStay || 1)),
})

/** Fresh cache first; otherwise live Beds24 (and re-warm the cache); stale cache as the last resort. */
export async function loadSiteAvailability(room: SiteRoom, deps: SiteAvailabilityDeps): Promise<NightlyRate[] | null> {
  const now = deps.now?.() ?? new Date()
  const window = bookingWindow(now)
  const cached = await deps.readCache(room, window)
  if (isCacheFresh(cached, now)) return cached.availability.map(toNightlyRate)

  const live = await deps.fetchLive(room, window)
  deps.refreshInBackground(room)
  const best = live ?? cached
  return best ? best.availability.map(toNightlyRate) : null
}
