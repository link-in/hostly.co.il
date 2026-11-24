import { getAvailability } from '@/lib/availability/cache'
import type { AvailabilityDay, IsoDate } from '../domain/types'

/** Where detectors read availability from. Swappable (cache today, live Beds24 or tests tomorrow). */
export interface AvailabilitySource {
  getDays(userId: string, roomId: string, from: IsoDate, to: IsoDate): Promise<AvailabilityDay[]>
}

export const cacheAvailabilitySource: AvailabilitySource = {
  async getDays(userId, roomId, from, to) {
    const cached = await getAvailability(userId, roomId, from, to)
    return (cached?.availability ?? []).map((row) => ({
      date: row.date,
      available: row.available,
      price: Number.isFinite(row.price) && row.price > 0 ? row.price : null,
    }))
  },
}
