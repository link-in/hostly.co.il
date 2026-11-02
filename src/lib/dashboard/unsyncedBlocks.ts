import type { RoomPrice } from '@/lib/dashboard/types'

/** "2026-10-24" → "24/10" */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

/** Sorted, unique, not-in-the-past dates the API flagged as blocked in Hostly but open in Beds24. */
export function getUnsyncedBlockedDates(prices: RoomPrice[], todayKey: string): string[] {
  const dates = prices.filter((entry) => entry.unsynced && entry.date >= todayKey).map((entry) => entry.date)
  return Array.from(new Set(dates)).sort()
}

/** "2026-10-24" → local-midnight Date (no UTC shift). */
export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
