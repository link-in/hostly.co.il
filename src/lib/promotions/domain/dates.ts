import type { IsoDate } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function toUtc(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/** 0 = Sunday … 6 = Saturday, independent of the server timezone. */
export function weekdayOf(date: IsoDate): number {
  return new Date(toUtc(date)).getUTCDay()
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** Today in Israel as 'YYYY-MM-DD'. */
export function todayInIsrael(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now)
}
