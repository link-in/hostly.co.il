import { describe, expect, it } from 'vitest'
import { calculateStayTotal, formatMoney } from './pricing'

describe('calculateStayTotal', () => {
  it('multiplies the nightly price by nights without any channel markup', () => {
    expect(calculateStayTotal(950, 3)).toBe(2850)
  })

  it('returns null when there is no price or no nights', () => {
    expect(calculateStayTotal(null, 3)).toBeNull()
    expect(calculateStayTotal(950, 0)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats ILS without decimals', () => {
    const formatted = formatMoney(2850, 'ILS')
    expect(formatted).toContain('2,850')
    expect(formatted).toContain('₪')
  })
})
