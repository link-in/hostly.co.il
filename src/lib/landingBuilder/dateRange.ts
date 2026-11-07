import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface StayRange {
  checkIn: string | null
  checkOut: string | null
}

export const EMPTY_RANGE: StayRange = { checkIn: null, checkOut: null }

export type IsNightBlocked = (iso: string) => boolean

/** True if any night from `checkIn` up to (not including) `checkOut` is blocked. */
export function rangeHasBlockedNight(checkIn: string, checkOut: string, isBlocked: IsNightBlocked): boolean {
  for (let day = parseISO(checkIn); format(day, 'yyyy-MM-dd') < checkOut; day = addDays(day, 1)) {
    if (isBlocked(format(day, 'yyyy-MM-dd'))) return true
  }
  return false
}

/**
 * Calendar click → next stay range. First click picks check-in, second picks
 * check-out; a click that can't close a valid range restarts from that day.
 */
export function selectStayDate(range: StayRange, iso: string, isBlocked: IsNightBlocked): StayRange {
  const startsNewRange = !range.checkIn || range.checkOut !== null || iso <= range.checkIn

  if (startsNewRange) {
    return isBlocked(iso) ? range : { checkIn: iso, checkOut: null }
  }
  if (rangeHasBlockedNight(range.checkIn!, iso, isBlocked)) {
    return isBlocked(iso) ? range : { checkIn: iso, checkOut: null }
  }
  return { checkIn: range.checkIn, checkOut: iso }
}

export function countNights(range: StayRange): number {
  if (!range.checkIn || !range.checkOut) return 0
  return differenceInCalendarDays(parseISO(range.checkOut), parseISO(range.checkIn))
}

export function isInRange(range: StayRange, iso: string): boolean {
  if (!range.checkIn) return false
  if (!range.checkOut) return iso === range.checkIn
  return iso >= range.checkIn && iso <= range.checkOut
}
