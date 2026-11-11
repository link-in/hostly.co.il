import { describe, it, expect } from 'vitest'
import { parseWriteStay } from './writeStay'

const today = '2026-10-22'

describe('parseWriteStay', () => {
  it('converts check-in/check-out to inclusive nights', () => {
    expect(parseWriteStay('2026-10-29', '2026-10-31', today)).toEqual({
      range: { from: '2026-10-29', to: '2026-10-30' },
      checkIn: '2026-10-29',
      checkOut: '2026-10-31',
      nights: 2,
    })
  })

  it('allows changing tonight', () => {
    expect(parseWriteStay(today, '2026-10-23', today)).toMatchObject({ nights: 1 })
  })

  it.each([
    ['a past night', '2026-10-21', '2026-10-23'],
    ['check-out before check-in', '2026-10-30', '2026-10-29'],
    ['a same-day stay', '2026-10-29', '2026-10-29'],
    ['an impossible date', '2026-11-31', '2026-12-02'],
    ['a year or more', '2026-11-01', '2027-11-03'],
  ])('rejects %s', (_label, start, end) => {
    expect(parseWriteStay(start, end, today)).toMatchObject({ ok: false, code: 'invalid_input' })
  })
})
