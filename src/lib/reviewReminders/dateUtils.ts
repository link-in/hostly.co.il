/**
 * Pure date helpers for the review-reminders feature.
 * No I/O, no reliance on the host machine's local timezone — safe to unit test.
 */

const DEFAULT_TIME_ZONE = 'Asia/Jerusalem'

/**
 * Returns a YYYY-MM-DD string for `referenceDate` shifted by `offsetDays`
 * whole calendar days *as observed in `timeZone`* (default Israel).
 *
 * Works by reading the Y/M/D of `referenceDate` in the target timezone via
 * `Intl.DateTimeFormat`, then doing the day-offset arithmetic on a UTC noon
 * anchor for that calendar date — this sidesteps DST edge cases that would
 * occur if we instead added/subtracted milliseconds directly.
 */
export function getDateStringInTimeZone(
  offsetDays = 0,
  timeZone: string = DEFAULT_TIME_ZONE,
  referenceDate: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate)

  const part = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0)

  const anchor = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + offsetDays, 12))

  return anchor.toISOString().slice(0, 10)
}

/** Convenience wrapper: yesterday's date string in Israel time. */
export function getYesterdayInIsrael(referenceDate: Date = new Date()): string {
  return getDateStringInTimeZone(-1, DEFAULT_TIME_ZONE, referenceDate)
}
