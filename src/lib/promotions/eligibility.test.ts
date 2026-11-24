import { describe, expect, it } from 'vitest'
import { campaignRunDays, planCampaignBudget } from './domain/budget'
import { checkEligibility, type EligibilityInput } from './eligibility'

const base: EligibilityInput = {
  opportunity: {
    trigger: 'weekend',
    roomId: 'r1',
    checkIn: '2026-11-26',
    checkOut: '2026-11-28',
    nights: [],
  },
  channel: 'meta_ads',
  connectionActive: true,
  imageUrls: ['https://img/1.jpg'],
  siteUrl: 'https://villa.hostly.co.il',
  existingCampaigns: [],
  plannedBudget: 100,
  monthlyCommitted: 0,
  monthlyCap: null,
}

describe('checkEligibility', () => {
  it('accepts a complete opportunity', () => {
    expect(checkEligibility(base)).toEqual({ eligible: true })
  })

  it.each([
    [{ connectionActive: false }, 'no_connection'],
    [{ siteUrl: null }, 'no_site'],
    [{ imageUrls: [] }, 'no_images'],
    [{ monthlyCommitted: 950, monthlyCap: 1000 }, 'monthly_cap_exceeded'],
  ] satisfies Array<[Partial<EligibilityInput>, string]>)('rejects %o with %s', (override, reason) => {
    expect(checkEligibility({ ...base, ...override })).toEqual({ eligible: false, reason })
  })

  it('rejects a window overlapping an existing campaign for the same room and channel', () => {
    const existing = { roomId: 'r1', channel: 'meta_ads' as const, checkIn: '2026-11-27', checkOut: '2026-11-29' }
    expect(checkEligibility({ ...base, existingCampaigns: [existing] })).toEqual({
      eligible: false,
      reason: 'overlaps_existing',
    })
  })

  it('ignores campaigns for another room or touching windows', () => {
    const otherRoom = { roomId: 'r2', channel: 'meta_ads' as const, checkIn: '2026-11-26', checkOut: '2026-11-28' }
    const touching = { roomId: 'r1', channel: 'meta_ads' as const, checkIn: '2026-11-28', checkOut: '2026-11-30' }
    expect(checkEligibility({ ...base, existingCampaigns: [otherRoom, touching] })).toEqual({ eligible: true })
  })

  it('allows spending exactly up to the monthly cap', () => {
    expect(checkEligibility({ ...base, monthlyCommitted: 900, monthlyCap: 1000 })).toEqual({ eligible: true })
  })
})

describe('budget', () => {
  it('runs the ad from today until check-in, at least one day', () => {
    expect(campaignRunDays('2026-11-24', '2026-11-26')).toBe(2)
    expect(campaignRunDays('2026-11-26', '2026-11-26')).toBe(1)
  })

  it('multiplies the daily budget by run days and caps it', () => {
    const rule = { dailyBudget: 40, maxTotalBudget: 200 }
    expect(planCampaignBudget(rule, '2026-11-24', '2026-11-26')).toBe(80)
    expect(planCampaignBudget(rule, '2026-11-01', '2026-11-26')).toBe(200)
  })
})
