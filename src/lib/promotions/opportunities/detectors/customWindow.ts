import { addDays } from '../../domain/dates'
import type { Opportunity } from '../../domain/types'
import { freeRunFrom, indexByDate, toOpportunity } from '../freeRuns'
import type { OpportunityDetector } from '../types'

/** Longest stay promoted as one campaign. */
export const MAX_WINDOW_NIGHTS = 14

/**
 * Any run of free nights that starts between tomorrow and `daysBefore` days ahead.
 * Each run is reported once, from its first free night.
 */
export const customWindowDetector: OpportunityDetector = {
  trigger: 'custom_window',

  horizonEnd(today, rule) {
    return addDays(today, rule.daysBefore + MAX_WINDOW_NIGHTS)
  },

  detect(input) {
    const byDate = indexByDate(input.days)
    const opportunities: Opportunity[] = []
    let offset = 1
    while (offset <= input.rule.daysBefore) {
      const run = freeRunFrom(byDate, addDays(input.today, offset), MAX_WINDOW_NIGHTS)
      if (run.length >= input.rule.minFreeNights) {
        opportunities.push(toOpportunity('custom_window', input.roomId, run))
      }
      offset += Math.max(run.length, 1)
    }
    return opportunities
  },
}
