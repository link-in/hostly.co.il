import { describe, it, expect } from 'vitest'
import { normalizeDate, toKey, isSameDay, addDays, sortDates, buildDateRanges } from './calendarDates'

// ─── normalizeDate ─────────────────────────────────────────────────────────

describe('normalizeDate', () => {
  it('zeroes out the time portion', () => {
    const d = new Date(2026, 6, 12, 14, 35, 22)
    const normalized = normalizeDate(d)
    expect(normalized.getHours()).toBe(0)
    expect(normalized.getMinutes()).toBe(0)
    expect(normalized.getSeconds()).toBe(0)
  })

  it('does not mutate the original date', () => {
    const d = new Date(2026, 6, 12, 14, 35, 22)
    normalizeDate(d)
    expect(d.getHours()).toBe(14)
  })
})

// ─── toKey ─────────────────────────────────────────────────────────────────

describe('toKey', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    expect(toKey(new Date(2026, 6, 12))).toBe('2026-07-12')
  })

  it('pads single-digit months and days', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('is not affected by the time-of-day component', () => {
    expect(toKey(new Date(2026, 6, 12, 23, 59, 59))).toBe('2026-07-12')
  })
})

// ─── isSameDay ─────────────────────────────────────────────────────────────

describe('isSameDay', () => {
  it('returns true for identical timestamps', () => {
    const d = new Date(2026, 6, 12)
    expect(isSameDay(d, new Date(d))).toBe(true)
  })

  it('returns false for different days', () => {
    expect(isSameDay(new Date(2026, 6, 12), new Date(2026, 6, 13))).toBe(false)
  })
})

// ─── addDays ───────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(toKey(addDays(new Date(2026, 6, 12), 2))).toBe('2026-07-14')
  })

  it('rolls over to the next month', () => {
    expect(toKey(addDays(new Date(2026, 6, 31), 1))).toBe('2026-08-01')
  })

  it('rolls over to the next year', () => {
    expect(toKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
  })

  it('supports negative offsets', () => {
    expect(toKey(addDays(new Date(2026, 6, 1), -1))).toBe('2026-06-30')
  })
})

// ─── sortDates ─────────────────────────────────────────────────────────────

describe('sortDates', () => {
  it('sorts dates ascending', () => {
    const dates = [new Date(2026, 6, 15), new Date(2026, 6, 10), new Date(2026, 6, 12)]
    const sorted = sortDates(dates).map(toKey)
    expect(sorted).toEqual(['2026-07-10', '2026-07-12', '2026-07-15'])
  })

  it('does not mutate the original array', () => {
    const dates = [new Date(2026, 6, 15), new Date(2026, 6, 10)]
    sortDates(dates)
    expect(toKey(dates[0])).toBe('2026-07-15')
  })
})

// ─── buildDateRanges ───────────────────────────────────────────────────────

describe('buildDateRanges', () => {
  it('returns an empty array for no dates', () => {
    expect(buildDateRanges([])).toEqual([])
  })

  it('collapses a single date into one range', () => {
    expect(buildDateRanges([new Date(2026, 6, 12)])).toEqual([
      { from: '2026-07-12', to: '2026-07-12' },
    ])
  })

  it('collapses consecutive dates into a single range', () => {
    const dates = [new Date(2026, 6, 12), new Date(2026, 6, 13), new Date(2026, 6, 14)]
    expect(buildDateRanges(dates)).toEqual([{ from: '2026-07-12', to: '2026-07-14' }])
  })

  it('splits non-consecutive dates into separate ranges', () => {
    const dates = [new Date(2026, 6, 12), new Date(2026, 6, 13), new Date(2026, 6, 20)]
    expect(buildDateRanges(dates)).toEqual([
      { from: '2026-07-12', to: '2026-07-13' },
      { from: '2026-07-20', to: '2026-07-20' },
    ])
  })

  it('sorts unordered input before collapsing ranges', () => {
    const dates = [new Date(2026, 6, 14), new Date(2026, 6, 12), new Date(2026, 6, 13)]
    expect(buildDateRanges(dates)).toEqual([{ from: '2026-07-12', to: '2026-07-14' }])
  })

  it('handles a range spanning a month boundary', () => {
    const dates = [new Date(2026, 6, 31), new Date(2026, 7, 1)]
    expect(buildDateRanges(dates)).toEqual([{ from: '2026-07-31', to: '2026-08-01' }])
  })
})
