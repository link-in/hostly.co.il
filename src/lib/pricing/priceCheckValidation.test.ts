import { describe, it, expect } from 'vitest'
import { validatePriceCheckInput, clampNumber } from './priceCheckValidation'

describe('priceCheckValidation', () => {
  const refDate = new Date('2026-05-10T12:00:00Z')

  it('passes for valid future dates and guest counts', () => {
    const result = validatePriceCheckInput(
      {
        checkIn: '2026-05-15',
        checkOut: '2026-05-18',
        numAdult: 2,
        numChild: 1,
      },
      refDate
    )

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects missing dates', () => {
    expect(
      validatePriceCheckInput(
        {
          checkIn: '',
          checkOut: '2026-05-18',
          numAdult: 2,
          numChild: 0,
        },
        refDate
      ).valid
    ).toBe(false)
  })

  it('rejects check-in in the past', () => {
    const result = validatePriceCheckInput(
      {
        checkIn: '2026-05-01',
        checkOut: '2026-05-12',
        numAdult: 2,
        numChild: 0,
      },
      refDate
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('בעבר')
  })

  it('rejects check-out on or before check-in', () => {
    const sameDay = validatePriceCheckInput(
      {
        checkIn: '2026-05-15',
        checkOut: '2026-05-15',
        numAdult: 2,
        numChild: 0,
      },
      refDate
    )
    expect(sameDay.valid).toBe(false)
    expect(sameDay.error).toContain('אחרי תאריך כניסה')

    const earlierDay = validatePriceCheckInput(
      {
        checkIn: '2026-05-15',
        checkOut: '2026-05-14',
        numAdult: 2,
        numChild: 0,
      },
      refDate
    )
    expect(earlierDay.valid).toBe(false)
  })

  it('rejects less than 1 adult', () => {
    const result = validatePriceCheckInput(
      {
        checkIn: '2026-05-15',
        checkOut: '2026-05-18',
        numAdult: 0,
        numChild: 2,
      },
      refDate
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('לפחות מבוגר אחד')
  })

  it('rejects negative children count', () => {
    const result = validatePriceCheckInput(
      {
        checkIn: '2026-05-15',
        checkOut: '2026-05-18',
        numAdult: 2,
        numChild: -1,
      },
      refDate
    )
    expect(result.valid).toBe(false)
  })

  describe('clampNumber', () => {
    it('clamps values below min', () => {
      expect(clampNumber(-5, 0, 10)).toBe(0)
    })

    it('clamps values above max', () => {
      expect(clampNumber(25, 0, 10)).toBe(10)
    })

    it('preserves values within range', () => {
      expect(clampNumber(4, 0, 10)).toBe(4)
    })
  })
})
