import { describe, it, expect } from 'vitest'
import { getDateStringInTimeZone, getYesterdayInIsrael } from './dateUtils'

describe('getDateStringInTimeZone', () => {
  it('returns the same calendar day for offset 0', () => {
    const reference = new Date('2026-07-11T08:00:00Z') // 11:00 in Israel (DST, UTC+3)
    expect(getDateStringInTimeZone(0, 'Asia/Jerusalem', reference)).toBe('2026-07-11')
  })

  it('returns yesterday for offset -1', () => {
    const reference = new Date('2026-07-11T08:00:00Z')
    expect(getDateStringInTimeZone(-1, 'Asia/Jerusalem', reference)).toBe('2026-07-10')
  })

  it('rolls back across a month boundary', () => {
    const reference = new Date('2026-08-01T08:00:00Z')
    expect(getDateStringInTimeZone(-1, 'Asia/Jerusalem', reference)).toBe('2026-07-31')
  })

  it('rolls back across a year boundary', () => {
    const reference = new Date('2027-01-01T08:00:00Z')
    expect(getDateStringInTimeZone(-1, 'Asia/Jerusalem', reference)).toBe('2026-12-31')
  })

  it('correctly resolves a UTC timestamp that is already the next day in Israel time', () => {
    // 22:30 UTC on Jan 10th is 00:30 on Jan 11th in Israel (UTC+2 in winter).
    const reference = new Date('2026-01-10T22:30:00Z')
    expect(getDateStringInTimeZone(0, 'Asia/Jerusalem', reference)).toBe('2026-01-11')
    expect(getDateStringInTimeZone(-1, 'Asia/Jerusalem', reference)).toBe('2026-01-10')
  })
})

describe('getYesterdayInIsrael', () => {
  it('is equivalent to getDateStringInTimeZone(-1, "Asia/Jerusalem")', () => {
    const reference = new Date('2026-07-11T08:00:00Z')
    expect(getYesterdayInIsrael(reference)).toBe(getDateStringInTimeZone(-1, 'Asia/Jerusalem', reference))
    expect(getYesterdayInIsrael(reference)).toBe('2026-07-10')
  })
})
