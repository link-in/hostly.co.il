import { describe, it, expect } from 'vitest'
import {
  countNights,
  groupConsecutiveNights,
  listNights,
  nightRangeToStay,
  stayToNightRange,
  todayInIsrael,
} from './dates'

describe('stayToNightRange', () => {
  it('excludes the check-out night', () => {
    expect(stayToNightRange('2026-11-05', '2026-11-07')).toEqual({ from: '2026-11-05', to: '2026-11-06' })
  })

  it('handles a single night across a month boundary', () => {
    expect(stayToNightRange('2026-10-31', '2026-11-01')).toEqual({ from: '2026-10-31', to: '2026-10-31' })
  })

  it('handles the end of February in a leap year', () => {
    expect(stayToNightRange('2028-02-28', '2028-03-01')).toEqual({ from: '2028-02-28', to: '2028-02-29' })
  })

  it('returns null when check-out is not after check-in', () => {
    expect(stayToNightRange('2026-11-05', '2026-11-05')).toBeNull()
    expect(stayToNightRange('2026-11-05', '2026-11-04')).toBeNull()
  })

  it('round-trips with nightRangeToStay', () => {
    const range = stayToNightRange('2026-12-30', '2027-01-02')!
    expect(nightRangeToStay(range)).toEqual({ checkIn: '2026-12-30', checkOut: '2027-01-02' })
  })
})

describe('listNights / countNights', () => {
  it('lists every night inclusively', () => {
    const range = { from: '2026-12-30', to: '2027-01-01' }
    expect(listNights(range)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01'])
    expect(countNights(range)).toBe(3)
  })

  it('is not affected by the daylight-saving change in Israel', () => {
    expect(countNights({ from: '2026-10-24', to: '2026-10-26' })).toBe(3)
  })
})

describe('todayInIsrael', () => {
  it('uses Israel time even when UTC is still on the previous day', () => {
    expect(todayInIsrael(new Date('2026-10-22T22:30:00Z'))).toBe('2026-10-23')
  })

  it('uses Israel time during the day', () => {
    expect(todayInIsrael(new Date('2026-10-22T09:00:00Z'))).toBe('2026-10-22')
  })
})

describe('groupConsecutiveNights', () => {
  it('groups consecutive free nights into stays', () => {
    expect(groupConsecutiveNights(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-30', '2026-12-01'])).toEqual([
      { checkIn: '2026-11-01', checkOut: '2026-11-03' },
      { checkIn: '2026-11-04', checkOut: '2026-11-05' },
      { checkIn: '2026-11-30', checkOut: '2026-12-02' },
    ])
  })

  it('sorts unsorted input and handles an empty list', () => {
    expect(groupConsecutiveNights(['2026-11-02', '2026-11-01'])).toEqual([{ checkIn: '2026-11-01', checkOut: '2026-11-03' }])
    expect(groupConsecutiveNights([])).toEqual([])
  })
})
