import { parseISO } from 'date-fns'

const MOCK_BOOKED_DAYS = new Set([5, 6, 12, 13, 14, 22, 23])

/**
 * Deterministic fake occupancy for the preview booking widget. To be replaced by
 * `availability_cache` rows where `num_avail = 0` (see docs/landing-builder-wizard.md).
 */
export function isMockBooked(iso: string): boolean {
  return MOCK_BOOKED_DAYS.has(parseISO(iso).getDate())
}
