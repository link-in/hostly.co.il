import { overlayAvailabilityCache, type PriceEntry } from '@/lib/availability/blocking'
import type { AvailabilityByDate } from '../beds24/types'

/**
 * Applies blocks made from the Hostly dashboard (stored in availability_cache),
 * using the same overlay rules as the dashboard calendar so both always agree.
 * A night that Beds24 reports as closed is never reopened.
 */
export async function applyManualBlocks(
  userId: string,
  roomId: number,
  nights: string[],
  availability: AvailabilityByDate,
): Promise<AvailabilityByDate> {
  const entries: PriceEntry[] = nights.map((date) => ({
    date,
    price: 0,
    roomId: String(roomId),
    numAvail: availability[date] === false ? 0 : 1,
  }))

  const overlaid = await overlayAvailabilityCache(entries, userId, String(roomId))
  const byDate = new Map(overlaid.map((entry) => [entry.date, entry.numAvail > 0]))

  const result: AvailabilityByDate = {}
  for (const date of nights) result[date] = byDate.get(date) ?? true
  return result
}
