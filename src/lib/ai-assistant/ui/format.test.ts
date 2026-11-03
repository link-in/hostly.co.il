import { describe, it, expect } from 'vitest'
import { formatNightCount, formatNightSpan, formatPrice, formatPriceRange, formatShortDate } from './format'

describe('assistant UI formatting', () => {
  it('formats dates as day.month without leading zeros', () => {
    expect(formatShortDate('2026-03-05')).toBe('5.3')
    expect(formatShortDate('2026-10-29')).toBe('29.10')
  })

  it('formats a single night or an inclusive span', () => {
    expect(formatNightSpan('2026-10-29', '2026-10-29')).toBe('29.10')
    expect(formatNightSpan('2026-10-29', '2026-10-30')).toBe('29.10–30.10')
  })

  it('pluralises nights in Hebrew', () => {
    expect(formatNightCount(1)).toBe('לילה אחד')
    expect(formatNightCount(3)).toBe('3 לילות')
  })

  it('formats shekel prices and ranges', () => {
    expect(formatPrice(968)).toContain('968')
    expect(formatPrice(968)).toContain('₪')
    expect(formatPriceRange([null, null])).toBeNull()
    expect(formatPriceRange([600, null, 600])).toBe(formatPrice(600))
    expect(formatPriceRange([850, 600])).toBe(`${formatPrice(600)}–${formatPrice(850)}`)
  })
})
