import type { IsoDate } from '../domain/types'
import type { ContentInput } from './types'

function formatDay(date: IsoDate): string {
  const [, month, day] = date.split('-')
  return `${Number(day)}.${Number(month)}`
}

/** '26.11 עד 28.11' — a dash between two dates flips order inside RTL text. */
export function formatStayRange(checkIn: IsoDate, checkOut: IsoDate): string {
  return `${formatDay(checkIn)} עד ${formatDay(checkOut)}`
}

export function discountedPrice(input: Pick<ContentInput, 'nightlyPrice' | 'discountPct'>): number | null {
  if (input.nightlyPrice === null) return null
  if (!input.discountPct) return input.nightlyPrice
  return Math.round(input.nightlyPrice * (1 - input.discountPct / 100))
}

export function currencySymbol(currency: string): string {
  return currency === 'ILS' ? '₪' : currency
}

export function placeName(input: Pick<ContentInput, 'siteTitle' | 'roomName'>): string {
  return input.roomName ? `${input.siteTitle} – ${input.roomName}` : input.siteTitle
}
