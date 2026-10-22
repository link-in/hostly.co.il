import { describe, it, expect } from 'vitest'
import { nightRangeSchema } from './types'

describe('nightRangeSchema', () => {
  it('accepts a single night', () => {
    expect(nightRangeSchema.safeParse({ from: '2026-11-05', to: '2026-11-05' }).success).toBe(true)
  })

  it('accepts a range across a year boundary', () => {
    expect(nightRangeSchema.safeParse({ from: '2026-12-30', to: '2027-01-02' }).success).toBe(true)
  })

  it('rejects an end before the start', () => {
    expect(nightRangeSchema.safeParse({ from: '2026-11-05', to: '2026-11-04' }).success).toBe(false)
  })

  it.each(['2026-02-30', '2026-13-01', '05/11/2026', '2026-1-5', ''])('rejects the invalid date %s', (from) => {
    expect(nightRangeSchema.safeParse({ from, to: '2026-12-31' }).success).toBe(false)
  })

  it('accepts a leap day only in a leap year', () => {
    expect(nightRangeSchema.safeParse({ from: '2028-02-29', to: '2028-02-29' }).success).toBe(true)
    expect(nightRangeSchema.safeParse({ from: '2027-02-29', to: '2027-02-29' }).success).toBe(false)
  })

  it('rejects ranges of a year or more', () => {
    expect(nightRangeSchema.safeParse({ from: '2026-11-01', to: '2027-10-31' }).success).toBe(true)
    expect(nightRangeSchema.safeParse({ from: '2026-11-01', to: '2027-11-02' }).success).toBe(false)
  })
})
