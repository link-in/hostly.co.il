import { describe, expect, it } from 'vitest'
import { bookableNightPrice, indexRates, isNightUnavailable, lowestAvailablePrice, quoteStay, type NightlyRate } from './nightlyRates'

const night = (date: string, price: number, available = true, minStay = 1): NightlyRate => ({ date, price, available, minStay })

const rates = indexRates([
  night('2026-11-05', 800, true, 2),
  night('2026-11-06', 900),
  night('2026-11-07', 1000, false),
  night('2026-11-08', 700),
])

describe('isNightUnavailable', () => {
  it('blocks booked nights and nights without data', () => {
    expect(isNightUnavailable(rates, '2026-11-06')).toBe(false)
    expect(isNightUnavailable(rates, '2026-11-07')).toBe(true)
    expect(isNightUnavailable(rates, '2027-12-01')).toBe(true)
  })

  it('blocks nothing without an availability source', () => {
    expect(isNightUnavailable(null, '2026-11-07')).toBe(false)
  })
})

describe('bookableNightPrice', () => {
  it('shows prices only on bookable nights', () => {
    expect(bookableNightPrice(rates, '2026-11-06')).toBe(900)
    expect(bookableNightPrice(rates, '2026-11-07')).toBeNull()
    expect(bookableNightPrice(rates, '2027-12-01')).toBeNull()
    expect(bookableNightPrice(indexRates([night('2026-11-09', 0)]), '2026-11-09')).toBeNull()
    expect(bookableNightPrice(null, '2026-11-06')).toBeNull()
  })
})

describe('quoteStay', () => {
  it('sums the real nightly prices, without any channel multiplier', () => {
    expect(quoteStay(rates, { checkIn: '2026-11-05', checkOut: '2026-11-07' })).toEqual({
      nights: 2,
      total: 1700,
      minStay: 2,
      meetsMinStay: true,
    })
  })

  it("enforces the check-in night's minimum stay", () => {
    expect(quoteStay(rates, { checkIn: '2026-11-05', checkOut: '2026-11-06' })).toMatchObject({ meetsMinStay: false, minStay: 2 })
  })

  it('has no total when a night has no price or there is no data', () => {
    expect(quoteStay(rates, { checkIn: '2026-11-08', checkOut: '2026-11-10' }).total).toBeNull()
    expect(quoteStay(null, { checkIn: '2026-11-05', checkOut: '2026-11-07' })).toMatchObject({ nights: 2, total: null })
  })

  it('is empty until both dates are chosen', () => {
    expect(quoteStay(rates, { checkIn: '2026-11-05', checkOut: null })).toEqual({ nights: 0, total: null, minStay: 2, meetsMinStay: true })
  })
})

describe('lowestAvailablePrice', () => {
  it('ignores booked nights', () => {
    expect(lowestAvailablePrice(rates)).toBe(700)
    expect(lowestAvailablePrice(null)).toBeNull()
  })
})
