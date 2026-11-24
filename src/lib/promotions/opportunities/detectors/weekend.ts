import { WEEKEND_NIGHT_WEEKDAYS } from '@/lib/dashboard/bulkPrice'
import { addDays, weekdayOf } from '../../domain/dates'
import type { IsoDate, Opportunity } from '../../domain/types'
import { freeRunFrom, indexByDate, toOpportunity } from '../freeRuns'
import type { DetectInput, OpportunityDetector } from '../types'

const FIRST_WEEKEND_NIGHT = WEEKEND_NIGHT_WEEKDAYS[0]
const WEEKEND_NIGHTS = WEEKEND_NIGHT_WEEKDAYS.length

/** First nights of weekends (Thursdays) from tomorrow until `daysBefore` days ahead. */
function upcomingWeekendStarts(today: IsoDate, daysBefore: number): IsoDate[] {
  const starts: IsoDate[] = []
  for (let offset = 1; offset <= daysBefore; offset++) {
    const date = addDays(today, offset)
    if (weekdayOf(date) === FIRST_WEEKEND_NIGHT) starts.push(date)
  }
  return starts
}

/** Longest run of free weekend nights (Thu+Fri, or just one of them). */
function freeWeekendNights(input: DetectInput, weekendStart: IsoDate) {
  const byDate = indexByDate(input.days)
  for (let skip = 0; skip < WEEKEND_NIGHTS; skip++) {
    const run = freeRunFrom(byDate, addDays(weekendStart, skip), WEEKEND_NIGHTS - skip)
    if (run.length > 0) return run
  }
  return []
}

export const weekendDetector: OpportunityDetector = {
  trigger: 'weekend',

  horizonEnd(today, rule) {
    return addDays(today, rule.daysBefore + WEEKEND_NIGHTS)
  },

  detect(input) {
    const opportunities: Opportunity[] = []
    for (const weekendStart of upcomingWeekendStarts(input.today, input.rule.daysBefore)) {
      const nights = freeWeekendNights(input, weekendStart)
      if (nights.length >= input.rule.minFreeNights) {
        opportunities.push(toOpportunity('weekend', input.roomId, nights))
      }
    }
    return opportunities
  },
}
