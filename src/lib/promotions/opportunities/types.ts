import type { AvailabilityDay, IsoDate, Opportunity, PromotionRule, TriggerId } from '../domain/types'

export type DetectorRule = Pick<PromotionRule, 'daysBefore' | 'minFreeNights'>

export interface DetectInput {
  roomId: string
  today: IsoDate
  rule: DetectorRule
  /** Availability from `today` up to at least `horizonEnd(today, rule)`. Missing dates count as unavailable. */
  days: AvailabilityDay[]
}

/**
 * One way of deciding which free dates are worth promoting.
 * Detectors are pure: they only look at availability, never at content or channels.
 */
export interface OpportunityDetector {
  trigger: TriggerId
  /** Last date (inclusive) the detector needs availability for. */
  horizonEnd(today: IsoDate, rule: DetectorRule): IsoDate
  detect(input: DetectInput): Opportunity[]
}
