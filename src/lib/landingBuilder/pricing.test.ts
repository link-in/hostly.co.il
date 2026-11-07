import { describe, expect, it } from 'vitest'
import { formatMoney, formatNightPrice } from './pricing'

describe('formatNightPrice', () => {
  it('is symbol plus digits, without RTL marks or spaces', () => {
    expect(formatNightPrice(400, 'ILS')).toBe('₪400')
    expect(formatNightPrice(1250, 'ILS')).toBe('₪1,250')
  })
})

describe('formatMoney', () => {
  it('formats ILS without decimals', () => {
    const formatted = formatMoney(2850, 'ILS')
    expect(formatted).toContain('2,850')
    expect(formatted).toContain('₪')
  })
})
