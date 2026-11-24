import { z } from 'zod'

/** Calendar date, 'YYYY-MM-DD'. */
export type IsoDate = string

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// ─── Triggers (opportunity detection) ────────────────────────────────────────

export const TRIGGER_IDS = ['weekend', 'custom_window'] as const
export const triggerIdSchema = z.enum(TRIGGER_IDS)
export type TriggerId = z.infer<typeof triggerIdSchema>

// ─── Channels (publishing) ───────────────────────────────────────────────────

export const CHANNEL_IDS = ['meta_ads'] as const
export const channelIdSchema = z.enum(CHANNEL_IDS)
export type ChannelId = z.infer<typeof channelIdSchema>

// ─── Rules ───────────────────────────────────────────────────────────────────

export const audienceSchema = z.object({
  countries: z.array(z.string().length(2)).min(1).default(['IL']),
  ageMin: z.number().int().min(18).max(65).default(21),
  ageMax: z.number().int().min(18).max(65).default(65),
})
export type Audience = z.infer<typeof audienceSchema>

export const DEFAULT_AUDIENCE: Audience = { countries: ['IL'], ageMin: 21, ageMax: 65 }

export const promotionRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    trigger: triggerIdSchema,
    roomId: z.string().trim().min(1).nullable().default(null),
    daysBefore: z.number().int().min(1).max(60).default(7),
    minFreeNights: z.number().int().min(1).max(30).default(1),
    dailyBudget: z.number().positive().max(10_000),
    maxTotalBudget: z.number().positive().max(100_000),
    discountPct: z.number().gt(0).lt(100).nullable().default(null),
    audience: audienceSchema.default(DEFAULT_AUDIENCE),
    channels: z.array(channelIdSchema).min(1).default(['meta_ads']),
    enabled: z.boolean().default(true),
  })
  .refine((rule) => rule.maxTotalBudget >= rule.dailyBudget, {
    message: 'התקציב הכולל חייב להיות לפחות התקציב היומי',
    path: ['maxTotalBudget'],
  })
  .refine((rule) => rule.audience.ageMax >= rule.audience.ageMin, {
    message: 'גיל מקסימלי חייב להיות גדול מגיל מינימלי',
    path: ['audience'],
  })
export type PromotionRuleInput = z.infer<typeof promotionRuleInputSchema>

export interface PromotionRule extends PromotionRuleInput {
  id: string
  userId: string
}

// ─── Opportunities ───────────────────────────────────────────────────────────

export interface AvailabilityDay {
  date: IsoDate
  available: boolean
  price: number | null
}

export interface OpportunityNight {
  date: IsoDate
  price: number | null
}

/** A run of consecutive free nights worth promoting. `checkOut` is the morning after the last night. */
export interface Opportunity {
  trigger: TriggerId
  roomId: string
  checkIn: IsoDate
  checkOut: IsoDate
  nights: OpportunityNight[]
}

// ─── Content ─────────────────────────────────────────────────────────────────

export const CALL_TO_ACTIONS = ['BOOK_TRAVEL', 'LEARN_MORE'] as const

export const campaignContentSchema = z.object({
  headline: z.string().trim().min(1).max(60),
  primaryText: z.string().trim().min(1).max(600),
  description: z.string().trim().max(90).default(''),
  callToAction: z.enum(CALL_TO_ACTIONS).default('BOOK_TRAVEL'),
  hashtags: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
})
export type CampaignContent = z.infer<typeof campaignContentSchema>

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUSES = [
  'pending_approval',
  'launching',
  'active',
  'rejected',
  'stopped',
  'failed',
  'expired',
] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export type StopReason = 'booked' | 'window_started' | 'manual' | 'connection_lost'

export interface CampaignStats {
  spend?: number
  impressions?: number
  clicks?: number
  reach?: number
  updatedAt?: string
}

export interface PromotionCampaign {
  id: string
  userId: string
  ruleId: string | null
  channel: ChannelId
  trigger: TriggerId
  roomId: string
  roomName: string | null
  checkIn: IsoDate
  checkOut: IsoDate
  status: CampaignStatus
  content: CampaignContent
  imageUrls: string[]
  landingUrl: string
  totalBudget: number
  currency: string
  audience: Audience
  nightlyPrice: number | null
  externalIds: Record<string, string>
  stats: CampaignStats
  error: string | null
  stopReason: StopReason | null
  approvedAt: string | null
  launchedAt: string | null
  stoppedAt: string | null
  createdAt: string
}

export const campaignEditSchema = z.object({
  content: campaignContentSchema.optional(),
  totalBudget: z.number().positive().max(100_000).optional(),
})
export type CampaignEdit = z.infer<typeof campaignEditSchema>

export const campaignActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'stop']),
})
export type CampaignAction = z.infer<typeof campaignActionSchema>['action']

export { isoDateSchema }
