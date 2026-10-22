import { describe, expect, it } from 'vitest'
import { formatMoney } from './pricing'

describe('formatMoney', () => {
  it('formats ILS without decimals', () => {
    const formatted = formatMoney(2850, 'ILS')
    expect(formatted).toContain('2,850')
    expect(formatted).toContain('₪')
  })
})
