import { daysBetween } from './dates'
import type { IsoDate, PromotionRule } from './types'

/** Days the ad can run: from today until the first night (it must stop before check-in). */
export function campaignRunDays(today: IsoDate, checkIn: IsoDate): number {
  return Math.max(1, daysBetween(today, checkIn))
}

/** Lifetime budget for a campaign: daily budget × run days, never above the rule's cap. */
export function planCampaignBudget(
  rule: Pick<PromotionRule, 'dailyBudget' | 'maxTotalBudget'>,
  today: IsoDate,
  checkIn: IsoDate,
): number {
  const total = rule.dailyBudget * campaignRunDays(today, checkIn)
  return Math.round(Math.min(total, rule.maxTotalBudget) * 100) / 100
}
