/** Direct bookings carry no channel commission — the base price is shown as-is. */
export function calculateStayTotal(nightlyPrice: number | null, nights: number): number | null {
  if (nightlyPrice === null || nights <= 0) return null
  return nightlyPrice * nights
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
