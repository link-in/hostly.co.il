const priceFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })

/** "2026-10-29" -> "29.10" */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(day)}.${Number(month)}`
}

/** First and last night, both inclusive: "29.10" or "29.10–30.10". */
export function formatNightSpan(from: string, to: string): string {
  return from === to ? formatShortDate(from) : `${formatShortDate(from)}–${formatShortDate(to)}`
}

export function formatNightCount(nights: number): string {
  return nights === 1 ? 'לילה אחד' : `${nights} לילות`
}

export function formatPrice(price: number): string {
  return priceFormatter.format(price)
}

/** "₪600" or "₪600–₪850" for a set of nightly prices; null when none are set. */
export function formatPriceRange(prices: (number | null)[]): string | null {
  const known = prices.filter((price): price is number => price !== null)
  if (!known.length) return null
  const min = Math.min(...known)
  const max = Math.max(...known)
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`
}
