import { z } from 'zod'
import { addDays, format, parseISO } from 'date-fns'
import { countNights, type StayRange } from '../dateRange'

export const nightlyRateSchema = z.object({
  date: z.iso.date(),
  price: z.number().nonnegative(),
  available: z.boolean(),
  minStay: z.number().int().min(1),
})
export type NightlyRate = z.infer<typeof nightlyRateSchema>

export const siteAvailabilityResponseSchema = z.object({ nights: z.array(nightlyRateSchema) })

/** Nightly rates by ISO date. `null` = no availability source (the widget stays in open inquiry mode). */
export type NightlyRates = ReadonlyMap<string, NightlyRate> | null

export function indexRates(rows: readonly NightlyRate[]): ReadonlyMap<string, NightlyRate> {
  return new Map(rows.map((row) => [row.date, row]))
}

/** With real data, a night without a row (beyond the horizon, no price set) can't be booked either. */
export function isNightUnavailable(rates: NightlyRates, iso: string): boolean {
  if (!rates) return false
  const night = rates.get(iso)
  return !night || !night.available
}

function stayNights(range: StayRange): string[] {
  const nights = countNights(range)
  if (nights <= 0) return []
  const start = parseISO(range.checkIn!)
  return Array.from({ length: nights }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd'))
}

export interface StayQuote {
  nights: number
  /** Sum of the real nightly prices; null when unknown (no data or a night without a price). */
  total: number | null
  minStay: number
  meetsMinStay: boolean
}

/** Direct booking: nightly prices as set in Beds24, no channel multiplier. */
export function quoteStay(rates: NightlyRates, range: StayRange): StayQuote {
  const nights = stayNights(range)
  const checkInRate = range.checkIn ? rates?.get(range.checkIn) : undefined
  const minStay = checkInRate?.minStay ?? 1
  const prices = nights.map((iso) => rates?.get(iso)?.price)
  const total = rates && prices.length > 0 && prices.every((price) => price !== undefined)
    ? prices.reduce<number>((sum, price) => sum + (price ?? 0), 0)
    : null

  return { nights: nights.length, total, minStay, meetsMinStay: nights.length === 0 || nights.length >= minStay }
}

/** Price to show on a calendar day: only bookable nights with a real price. */
export function bookableNightPrice(rates: NightlyRates, iso: string): number | null {
  const night = rates?.get(iso)
  return night && night.available && night.price > 0 ? night.price : null
}

export function lowestAvailablePrice(rates: NightlyRates): number | null {
  if (!rates) return null
  const prices = [...rates.values()].filter((night) => night.available && night.price > 0).map((night) => night.price)
  return prices.length > 0 ? Math.min(...prices) : null
}
