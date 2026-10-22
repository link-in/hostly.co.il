import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export interface CalendarDay {
  /** ISO date, `yyyy-MM-dd` — the same key format as `availability_cache.date`. */
  iso: string
  dayOfMonth: number
  inMonth: boolean
}

/** Full weeks (Sunday-first, Israeli convention) covering the month of `monthDate`. */
export function buildMonthGrid(monthDate: Date): CalendarDay[] {
  const first = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
  const last = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })
  const days: CalendarDay[] = []

  for (let day = first; day <= last; day = addDays(day, 1)) {
    days.push({
      iso: format(day, 'yyyy-MM-dd'),
      dayOfMonth: day.getDate(),
      inMonth: isSameMonth(day, monthDate),
    })
  }
  return days
}
