import { describe, it, expect } from 'vitest'
import {
  buildBulkCalendar,
  isWeekendNight,
  listMonthNights,
  parseBulkPriceForm,
  summarizeNights,
} from './bulkPrice'
import { toKey } from './calendarDates'

// נובמבר 2026: ה-1 הוא יום ראשון, לכן חמישי/שישי הם 5-6, 12-13, 19-20, 26-27 (8 לילות סוף שבוע מתוך 30).
const NOVEMBER = new Date(2026, 10, 1)
const BEFORE_MONTH = new Date(2026, 9, 20)

describe('isWeekendNight', () => {
  it('treats Thursday and Friday as weekend nights', () => {
    expect(isWeekendNight(new Date(2026, 10, 5))).toBe(true) // חמישי
    expect(isWeekendNight(new Date(2026, 10, 6))).toBe(true) // שישי
  })

  it('treats Saturday through Wednesday as midweek', () => {
    for (const day of [1, 2, 3, 4, 7]) {
      expect(isWeekendNight(new Date(2026, 10, day))).toBe(false)
    }
  })
})

describe('parseBulkPriceForm', () => {
  it('accepts a weekend price only', () => {
    expect(parseBulkPriceForm({ weekendPrice: '650', midweekPrice: '' })).toEqual({
      ok: true,
      value: { weekendPrice: 650, midweekPrice: undefined },
    })
  })

  it('accepts both prices and trims whitespace', () => {
    expect(parseBulkPriceForm({ weekendPrice: ' 700 ', midweekPrice: '400' })).toEqual({
      ok: true,
      value: { weekendPrice: 700, midweekPrice: 400 },
    })
  })

  it('rejects when both fields are empty', () => {
    const result = parseBulkPriceForm({ weekendPrice: '', midweekPrice: '  ' })
    expect(result.ok).toBe(false)
  })

  it.each(['abc', '0', '-50', '1000000'])('rejects the invalid price "%s"', (bad) => {
    expect(parseBulkPriceForm({ weekendPrice: bad, midweekPrice: '400' }).ok).toBe(false)
  })
})

describe('listMonthNights', () => {
  it('covers the whole month when it is entirely in the future', () => {
    const nights = listMonthNights(NOVEMBER, { weekendPrice: 650, midweekPrice: 400 }, BEFORE_MONTH)

    expect(nights).toHaveLength(30)
    expect(summarizeNights(nights)).toEqual({ total: 30, weekendNights: 8, midweekNights: 22 })
  })

  it('assigns the weekend price only to Thursday and Friday', () => {
    const nights = listMonthNights(NOVEMBER, { weekendPrice: 650, midweekPrice: 400 }, BEFORE_MONTH)
    const priceOn = (day: number) => nights.find((n) => toKey(n.date) === `2026-11-${String(day).padStart(2, '0')}`)?.price

    expect(priceOn(5)).toBe(650)
    expect(priceOn(6)).toBe(650)
    expect(priceOn(7)).toBe(400)
    expect(priceOn(1)).toBe(400)
  })

  it('skips nights that already passed', () => {
    const nights = listMonthNights(NOVEMBER, { weekendPrice: 650, midweekPrice: 400 }, new Date(2026, 10, 10, 15, 30))

    expect(toKey(nights[0].date)).toBe('2026-11-10')
    expect(summarizeNights(nights)).toEqual({ total: 21, weekendNights: 6, midweekNights: 15 })
  })

  it('updates only weekend nights when no midweek price is given', () => {
    const nights = listMonthNights(NOVEMBER, { weekendPrice: 650 }, BEFORE_MONTH)

    expect(nights).toHaveLength(8)
    expect(nights.every((n) => isWeekendNight(n.date))).toBe(true)
  })

  it('returns nothing for a month that is already over', () => {
    expect(listMonthNights(NOVEMBER, { weekendPrice: 650, midweekPrice: 400 }, new Date(2026, 11, 5))).toEqual([])
  })

  it('handles a month with a different length (February 2027)', () => {
    const nights = listMonthNights(new Date(2027, 1, 1), { midweekPrice: 300, weekendPrice: 500 }, BEFORE_MONTH)

    expect(nights).toHaveLength(28)
  })
})

describe('buildBulkCalendar', () => {
  const calendar = buildBulkCalendar(
    listMonthNights(NOVEMBER, { weekendPrice: 650, midweekPrice: 400 }, BEFORE_MONTH),
  )

  it('merges consecutive nights with the same price into ranges, sorted by date', () => {
    expect(calendar.slice(0, 4)).toEqual([
      { from: '2026-11-01', to: '2026-11-04', price1: 400 },
      { from: '2026-11-05', to: '2026-11-06', price1: 650 },
      { from: '2026-11-07', to: '2026-11-11', price1: 400 },
      { from: '2026-11-12', to: '2026-11-13', price1: 650 },
    ])
  })

  it('produces one range per weekend and per midweek stretch', () => {
    expect(calendar).toHaveLength(9)
    expect(calendar.at(-1)).toEqual({ from: '2026-11-28', to: '2026-11-30', price1: 400 })
  })

  it('never sets availability, so blocks and bookings are not changed', () => {
    for (const entry of calendar) {
      expect(Object.keys(entry).sort()).toEqual(['from', 'price1', 'to'])
    }
  })

  it('returns an empty list when there are no nights', () => {
    expect(buildBulkCalendar([])).toEqual([])
  })
})
