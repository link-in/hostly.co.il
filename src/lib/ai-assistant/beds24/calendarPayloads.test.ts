import { describe, it, expect } from 'vitest'
import { buildBlockDatesPayload, buildPriceUpdatePayload } from './calendarPayloads'

const range = { from: '2026-11-05', to: '2026-11-07' }

describe('buildBlockDatesPayload', () => {
  it('closes all units for the inclusive range', () => {
    expect(buildBlockDatesPayload(306559, 638851, range)).toEqual([
      { roomId: 638851, propertyId: 306559, calendar: [{ from: '2026-11-05', to: '2026-11-07', numAvail: 0 }] },
    ])
  })
})

describe('buildPriceUpdatePayload', () => {
  it('sets price1 without applying any channel multiplier', () => {
    expect(buildPriceUpdatePayload(306559, 638851, range, 800)).toEqual([
      { roomId: 638851, propertyId: 306559, calendar: [{ from: '2026-11-05', to: '2026-11-07', price1: 800 }] },
    ])
  })

  it('rounds to a whole price', () => {
    expect(buildPriceUpdatePayload(1, 2, range, 799.6)[0].calendar[0].price1).toBe(800)
  })

  it.each([0, -100, Number.NaN, Number.POSITIVE_INFINITY])('rejects the price %s', (price) => {
    expect(() => buildPriceUpdatePayload(1, 2, range, price)).toThrow(/Invalid price/)
  })
})
