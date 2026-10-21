import { describe, expect, it } from 'vitest'
import {
  EMPTY_RANGE,
  countNights,
  isInRange,
  rangeHasBlockedNight,
  selectStayDate,
  type StayRange,
} from './dateRange'

const none = () => false
const blocked = (...days: string[]) => (iso: string) => days.includes(iso)

describe('selectStayDate', () => {
  it('first click sets check-in', () => {
    expect(selectStayDate(EMPTY_RANGE, '2026-11-02', none)).toEqual({ checkIn: '2026-11-02', checkOut: null })
  })

  it('second later click sets check-out', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: null }
    expect(selectStayDate(range, '2026-11-05', none)).toEqual({ checkIn: '2026-11-02', checkOut: '2026-11-05' })
  })

  it('clicking on or before check-in restarts the range', () => {
    const range: StayRange = { checkIn: '2026-11-05', checkOut: null }
    expect(selectStayDate(range, '2026-11-05', none)).toEqual({ checkIn: '2026-11-05', checkOut: null })
    expect(selectStayDate(range, '2026-11-01', none)).toEqual({ checkIn: '2026-11-01', checkOut: null })
  })

  it('clicking after a complete range starts a new one', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: '2026-11-04' }
    expect(selectStayDate(range, '2026-11-10', none)).toEqual({ checkIn: '2026-11-10', checkOut: null })
  })

  it('ignores a blocked day as check-in', () => {
    expect(selectStayDate(EMPTY_RANGE, '2026-11-02', blocked('2026-11-02'))).toBe(EMPTY_RANGE)
  })

  it('allows check-out on a blocked day (the guest leaves that morning)', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: null }
    expect(selectStayDate(range, '2026-11-04', blocked('2026-11-04'))).toEqual({
      checkIn: '2026-11-02',
      checkOut: '2026-11-04',
    })
  })

  it('restarts from the clicked day when a blocked night sits inside the range', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: null }
    expect(selectStayDate(range, '2026-11-06', blocked('2026-11-03'))).toEqual({
      checkIn: '2026-11-06',
      checkOut: null,
    })
  })
})

describe('rangeHasBlockedNight', () => {
  it('checks nights from check-in up to but excluding check-out', () => {
    expect(rangeHasBlockedNight('2026-11-02', '2026-11-04', blocked('2026-11-03'))).toBe(true)
    expect(rangeHasBlockedNight('2026-11-02', '2026-11-04', blocked('2026-11-04'))).toBe(false)
  })

  it('crosses month boundaries', () => {
    expect(rangeHasBlockedNight('2026-10-30', '2026-11-02', blocked('2026-11-01'))).toBe(true)
  })
})

describe('countNights', () => {
  it('returns 0 for an incomplete range', () => {
    expect(countNights(EMPTY_RANGE)).toBe(0)
    expect(countNights({ checkIn: '2026-11-02', checkOut: null })).toBe(0)
  })

  it('counts calendar nights', () => {
    expect(countNights({ checkIn: '2026-10-30', checkOut: '2026-11-02' })).toBe(3)
  })
})

describe('isInRange', () => {
  it('highlights only check-in while the range is open', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: null }
    expect(isInRange(range, '2026-11-02')).toBe(true)
    expect(isInRange(range, '2026-11-03')).toBe(false)
  })

  it('includes both ends of a complete range', () => {
    const range: StayRange = { checkIn: '2026-11-02', checkOut: '2026-11-04' }
    expect(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) => isInRange(range, d)))
      .toEqual([false, true, true, true, false])
  })
})
