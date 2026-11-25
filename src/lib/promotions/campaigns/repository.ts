import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  audienceSchema,
  campaignContentSchema,
  DEFAULT_AUDIENCE,
  type Audience,
  type CampaignContent,
  type CampaignStats,
  type CampaignStatus,
  type ChannelId,
  type IsoDate,
  type PromotionCampaign,
  type StopReason,
  type TriggerId,
} from '../domain/types'
import type { ExistingCampaignWindow } from '../eligibility'

const TABLE = 'promotion_campaigns'
const COLUMNS =
  'id, user_id, rule_id, channel, trigger, room_id, room_name, check_in, check_out, status, content, image_urls, landing_url, total_budget, currency, audience, nightly_price, external_ids, stats, error, stop_reason, approved_at, launched_at, stopped_at, created_at'

/** Statuses whose budget counts against the monthly cap. */
export const COMMITTED_STATUSES: CampaignStatus[] = ['launching', 'active', 'stopped', 'expired']

type Row = Record<string, unknown>

function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value)
}

export function rowToCampaign(row: Row): PromotionCampaign {
  const audience = audienceSchema.safeParse(row.audience)
  return {
    id: String(row.id),
    userId: String(row.user_id),
    ruleId: (row.rule_id as string | null) ?? null,
    channel: row.channel as ChannelId,
    trigger: row.trigger as TriggerId,
    roomId: String(row.room_id),
    roomName: (row.room_name as string | null) ?? null,
    checkIn: String(row.check_in),
    checkOut: String(row.check_out),
    status: row.status as CampaignStatus,
    content: campaignContentSchema.parse(row.content),
    imageUrls: (row.image_urls as string[] | null) ?? [],
    landingUrl: String(row.landing_url),
    totalBudget: Number(row.total_budget),
    currency: String(row.currency ?? 'ILS'),
    audience: audience.success ? audience.data : DEFAULT_AUDIENCE,
    nightlyPrice: toNumberOrNull(row.nightly_price),
    externalIds: (row.external_ids as Record<string, string> | null) ?? {},
    stats: (row.stats as CampaignStats | null) ?? {},
    error: (row.error as string | null) ?? null,
    stopReason: (row.stop_reason as StopReason | null) ?? null,
    approvedAt: (row.approved_at as string | null) ?? null,
    launchedAt: (row.launched_at as string | null) ?? null,
    stoppedAt: (row.stopped_at as string | null) ?? null,
    createdAt: String(row.created_at ?? ''),
  }
}

export interface NewCampaign {
  userId: string
  ruleId: string | null
  channel: ChannelId
  trigger: TriggerId
  roomId: string
  roomName: string | null
  checkIn: IsoDate
  checkOut: IsoDate
  content: CampaignContent
  imageUrls: string[]
  landingUrl: string
  totalBudget: number
  currency: string
  audience: Audience
  nightlyPrice: number | null
}

export interface CampaignPatch {
  status?: CampaignStatus
  content?: CampaignContent
  totalBudget?: number
  externalIds?: Record<string, string>
  stats?: CampaignStats
  error?: string | null
  stopReason?: StopReason | null
  approvedAt?: string
  launchedAt?: string
  stoppedAt?: string
}

function patchToRow(patch: CampaignPatch): Row {
  const row: Row = { updated_at: new Date().toISOString() }
  if (patch.status !== undefined) row.status = patch.status
  if (patch.content !== undefined) row.content = patch.content
  if (patch.totalBudget !== undefined) row.total_budget = patch.totalBudget
  if (patch.externalIds !== undefined) row.external_ids = patch.externalIds
  if (patch.stats !== undefined) row.stats = patch.stats
  if (patch.error !== undefined) row.error = patch.error
  if (patch.stopReason !== undefined) row.stop_reason = patch.stopReason
  if (patch.approvedAt !== undefined) row.approved_at = patch.approvedAt
  if (patch.launchedAt !== undefined) row.launched_at = patch.launchedAt
  if (patch.stoppedAt !== undefined) row.stopped_at = patch.stoppedAt
  return row
}

/** Returns null when a campaign for the same room/window/channel already exists. */
export async function insertCampaign(campaign: NewCampaign): Promise<PromotionCampaign | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .upsert(
      [
        {
          user_id: campaign.userId,
          rule_id: campaign.ruleId,
          channel: campaign.channel,
          trigger: campaign.trigger,
          room_id: campaign.roomId,
          room_name: campaign.roomName,
          check_in: campaign.checkIn,
          check_out: campaign.checkOut,
          status: 'pending_approval',
          content: campaign.content,
          image_urls: campaign.imageUrls,
          landing_url: campaign.landingUrl,
          total_budget: campaign.totalBudget,
          currency: campaign.currency,
          audience: campaign.audience,
          nightly_price: campaign.nightlyPrice,
        },
      ],
      { onConflict: 'user_id,room_id,channel,check_in,check_out', ignoreDuplicates: true },
    )
    .select(COLUMNS)
  if (error) throw new Error(`Inserting promotion campaign failed: ${error.message}`)
  const row = (data ?? [])[0]
  return row ? rowToCampaign(row) : null
}

export async function getCampaign(userId: string, campaignId: string): Promise<PromotionCampaign | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('id', campaignId)
    .maybeSingle()
  if (error) throw new Error(`Loading promotion campaign failed: ${error.message}`)
  return data ? rowToCampaign(data) : null
}

export async function listCampaigns(userId: string, limit = 50): Promise<PromotionCampaign[]> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Listing promotion campaigns failed: ${error.message}`)
  return (data ?? []).map(rowToCampaign)
}

export async function listCampaignsByStatus(statuses: CampaignStatus[]): Promise<PromotionCampaign[]> {
  const { data, error } = await createServiceRoleClient().from(TABLE).select(COLUMNS).in('status', statuses)
  if (error) throw new Error(`Listing promotion campaigns by status failed: ${error.message}`)
  return (data ?? []).map(rowToCampaign)
}

export async function listCampaignWindows(userId: string, fromDate: IsoDate): Promise<ExistingCampaignWindow[]> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select('room_id, channel, check_in, check_out')
    .eq('user_id', userId)
    .gte('check_out', fromDate)
  if (error) throw new Error(`Listing promotion campaign windows failed: ${error.message}`)
  return (data ?? []).map((row) => ({
    roomId: String(row.room_id),
    channel: row.channel as ChannelId,
    checkIn: String(row.check_in),
    checkOut: String(row.check_out),
  }))
}

/** Budget already committed this month (approved campaigns) on a channel. */
export async function sumCommittedBudget(userId: string, channel: ChannelId, monthStartIso: string): Promise<number> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select('total_budget')
    .eq('user_id', userId)
    .eq('channel', channel)
    .in('status', COMMITTED_STATUSES)
    .gte('approved_at', monthStartIso)
  if (error) throw new Error(`Summing promotion budget failed: ${error.message}`)
  return (data ?? []).reduce((sum, row) => sum + Number(row.total_budget ?? 0), 0)
}

export async function updateCampaign(campaignId: string, patch: CampaignPatch): Promise<void> {
  const { error } = await createServiceRoleClient().from(TABLE).update(patchToRow(patch)).eq('id', campaignId)
  if (error) throw new Error(`Updating promotion campaign failed: ${error.message}`)
}

/**
 * Moves a campaign to `to` only if it is still in `from` — guards against double approval.
 * Returns whether this call won the transition.
 */
export async function transitionCampaign(
  campaignId: string,
  from: CampaignStatus,
  patch: CampaignPatch & { status: CampaignStatus },
): Promise<boolean> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .update(patchToRow(patch))
    .eq('id', campaignId)
    .eq('status', from)
    .select('id')
  if (error) throw new Error(`Transitioning promotion campaign failed: ${error.message}`)
  return (data ?? []).length > 0
}
