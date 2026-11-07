export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Short form for calendar cells: symbol and digits only (`₪400`), no RTL marks or spacing. */
export function formatNightPrice(amount: number, currency: string): string {
  const parts = new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(amount)
  const symbol = parts.find((part) => part.type === 'currency')?.value ?? ''
  const digits = parts
    .filter((part) => part.type === 'integer' || part.type === 'group')
    .map((part) => part.value)
    .join('')
  return `${symbol}${digits}`
}
