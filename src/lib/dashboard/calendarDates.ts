/**
 * Pure date helpers shared by the pricing calendar UI (`CalendarPricing.tsx`)
 * and its tests. Extracted so this logic can be unit tested without
 * mounting the React component.
 */

/** Zero out the time portion of a Date, returning a new Date instance. */
export const normalizeDate = (value: Date): Date => {
  const normalized = new Date(value)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

/** Format a Date as a local `YYYY-MM-DD` key (no UTC conversion). */
export const toKey = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isSameDay = (a: Date, b: Date): boolean => a.getTime() === b.getTime()

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export const sortDates = (dates: Date[]): Date[] => {
  return [...dates].sort((a, b) => a.getTime() - b.getTime())
}

export interface DateRange {
  from: string
  to: string
}

/**
 * Collapse a (possibly unsorted) list of Dates into the minimal set of
 * consecutive `{ from, to }` ranges, e.g. [1,2,3,5] -> [{1,3}, {5,5}].
 * Used to build compact Beds24 calendar payloads for price/availability updates.
 */
export const buildDateRanges = (dates: Date[]): DateRange[] => {
  const sorted = sortDates(dates)
  if (!sorted.length) {
    return []
  }

  const ranges: DateRange[] = []
  let rangeStart = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    const expected = addDays(prev, 1)
    if (isSameDay(current, expected)) {
      prev = current
      continue
    }

    ranges.push({ from: toKey(rangeStart), to: toKey(prev) })
    rangeStart = current
    prev = current
  }

  ranges.push({ from: toKey(rangeStart), to: toKey(prev) })
  return ranges
}
