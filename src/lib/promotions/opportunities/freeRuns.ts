import { addDays } from '../domain/dates'
import type { AvailabilityDay, IsoDate, Opportunity, OpportunityNight, TriggerId } from '../domain/types'

export function indexByDate(days: AvailabilityDay[]): Map<IsoDate, AvailabilityDay> {
  return new Map(days.map((day) => [day.date, day]))
}

/** Consecutive free nights starting at `start`, at most `maxNights`. */
export function freeRunFrom(
  byDate: Map<IsoDate, AvailabilityDay>,
  start: IsoDate,
  maxNights: number,
): OpportunityNight[] {
  const nights: OpportunityNight[] = []
  let date = start
  while (nights.length < maxNights) {
    const day = byDate.get(date)
    if (!day?.available) break
    nights.push({ date, price: day.price })
    date = addDays(date, 1)
  }
  return nights
}

export function toOpportunity(trigger: TriggerId, roomId: string, nights: OpportunityNight[]): Opportunity {
  return {
    trigger,
    roomId,
    checkIn: nights[0].date,
    checkOut: addDays(nights[nights.length - 1].date, 1),
    nights,
  }
}
