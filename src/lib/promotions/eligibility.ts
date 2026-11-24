import type { ChannelId, IsoDate, Opportunity } from './domain/types'

export type IneligibleReason =
  | 'no_connection'
  | 'no_images'
  | 'no_site'
  | 'overlaps_existing'
  | 'monthly_cap_exceeded'

export interface ExistingCampaignWindow {
  roomId: string
  channel: ChannelId
  checkIn: IsoDate
  checkOut: IsoDate
}

export interface EligibilityInput {
  opportunity: Opportunity
  channel: ChannelId
  connectionActive: boolean
  imageUrls: string[]
  siteUrl: string | null
  existingCampaigns: ExistingCampaignWindow[]
  plannedBudget: number
  monthlyCommitted: number
  monthlyCap: number | null
}

export type EligibilityResult = { eligible: true } | { eligible: false; reason: IneligibleReason }

function overlaps(a: { checkIn: IsoDate; checkOut: IsoDate }, b: { checkIn: IsoDate; checkOut: IsoDate }) {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut
}

export function hasOverlappingCampaign(input: EligibilityInput): boolean {
  return input.existingCampaigns.some(
    (campaign) =>
      campaign.roomId === input.opportunity.roomId &&
      campaign.channel === input.channel &&
      overlaps(campaign, input.opportunity),
  )
}

export function exceedsMonthlyCap(committed: number, planned: number, cap: number | null): boolean {
  return cap !== null && committed + planned > cap
}

/** Whether a draft campaign should be created for this opportunity on this channel. */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  if (!input.connectionActive) return { eligible: false, reason: 'no_connection' }
  if (!input.siteUrl) return { eligible: false, reason: 'no_site' }
  if (input.imageUrls.length === 0) return { eligible: false, reason: 'no_images' }
  if (hasOverlappingCampaign(input)) return { eligible: false, reason: 'overlaps_existing' }
  if (exceedsMonthlyCap(input.monthlyCommitted, input.plannedBudget, input.monthlyCap)) {
    return { eligible: false, reason: 'monthly_cap_exceeded' }
  }
  return { eligible: true }
}
