import type { NightRange } from './types'

export interface CalendarPostItem {
  roomId: number
  propertyId: number
  calendar: CalendarPostEntry[]
}

export interface CalendarPostEntry {
  from: string
  to: string
  numAvail?: number
  price1?: number
}

/** Closes every unit of the room for the given nights (inclusive). */
export function buildBlockDatesPayload(propertyId: number, roomId: number, range: NightRange): CalendarPostItem[] {
  return [{ roomId, propertyId, calendar: [{ from: range.from, to: range.to, numAvail: 0 }] }]
}

/** Sets the Beds24 base nightly price. Channel uplifts (e.g. Airbnb 1.21) are applied by the channel mapping, not here. */
export function buildPriceUpdatePayload(
  propertyId: number,
  roomId: number,
  range: NightRange,
  price: number,
): CalendarPostItem[] {
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid price: ${price}`)
  return [{ roomId, propertyId, calendar: [{ from: range.from, to: range.to, price1: Math.round(price) }] }]
}
