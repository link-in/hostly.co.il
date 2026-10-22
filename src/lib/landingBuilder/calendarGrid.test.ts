import { describe, expect, it } from 'vitest'
import { buildMonthGrid } from './calendarGrid'

describe('buildMonthGrid', () => {
  it('pads October 2026 to full Sunday-first weeks', () => {
    const days = buildMonthGrid(new Date(2026, 9, 15))
    // Oct 1 2026 is a Thursday → grid starts Sun Sep 27; Oct 31 is a Saturday.
    expect(days[0]).toEqual({ iso: '2026-09-27', dayOfMonth: 27, inMonth: false })
    expect(days.at(-1)).toEqual({ iso: '2026-10-31', dayOfMonth: 31, inMonth: true })
    expect(days).toHaveLength(35)
    expect(days.filter((day) => day.inMonth)).toHaveLength(31)
  })

  it('always returns whole weeks', () => {
    for (let month = 0; month < 12; month++) {
      expect(buildMonthGrid(new Date(2027, month, 1)).length % 7).toBe(0)
    }
  })
})
