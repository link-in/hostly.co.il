import type { NightRange } from './beds24/types'

export const ASSISTANT_TIME_ZONE = 'Asia/Jerusalem'

export function shiftDate(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * Converts a stay (check-in, check-out) to the nights it occupies.
 * Check-out is exclusive: 2026-11-05 -> 2026-11-07 means the nights of the 5th and 6th.
 * Returns null when check-out is not after check-in.
 */
export function stayToNightRange(checkIn: string, checkOut: string): NightRange | null {
  if (checkOut <= checkIn) return null
  return { from: checkIn, to: shiftDate(checkOut, -1) }
}

export function nightRangeToStay(range: NightRange): { checkIn: string; checkOut: string } {
  return { checkIn: range.from, checkOut: shiftDate(range.to, 1) }
}

export function listNights(range: NightRange): string[] {
  const nights: string[] = []
  for (let date = range.from; date <= range.to; date = shiftDate(date, 1)) nights.push(date)
  return nights
}

export function countNights(range: NightRange): number {
  return listNights(range).length
}

/** Today's date (YYYY-MM-DD) in Israel, regardless of the server's time zone. */
export function todayInIsrael(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ASSISTANT_TIME_ZONE }).format(now)
}

/** Groups sorted night dates into stays of consecutive nights. */
export function groupConsecutiveNights(nights: string[]): { checkIn: string; checkOut: string }[] {
  const stays: { checkIn: string; checkOut: string }[] = []
  for (const night of [...nights].sort()) {
    const last = stays[stays.length - 1]
    if (last && last.checkOut === night) {
      last.checkOut = shiftDate(night, 1)
    } else {
      stays.push({ checkIn: night, checkOut: shiftDate(night, 1) })
    }
  }
  return stays
}
