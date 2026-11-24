import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  audienceSchema,
  DEFAULT_AUDIENCE,
  type ChannelId,
  type PromotionRule,
  type PromotionRuleInput,
  type TriggerId,
} from '../domain/types'

const TABLE = 'promotion_rules'
const COLUMNS =
  'id, user_id, name, trigger, room_id, days_before, min_free_nights, daily_budget, max_total_budget, discount_pct, audience, channels, enabled'

type Row = Record<string, unknown>

export function rowToRule(row: Row): PromotionRule {
  const audience = audienceSchema.safeParse(row.audience)
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    trigger: row.trigger as TriggerId,
    roomId: (row.room_id as string | null) ?? null,
    daysBefore: Number(row.days_before),
    minFreeNights: Number(row.min_free_nights),
    dailyBudget: Number(row.daily_budget),
    maxTotalBudget: Number(row.max_total_budget),
    discountPct: row.discount_pct === null || row.discount_pct === undefined ? null : Number(row.discount_pct),
    audience: audience.success ? audience.data : DEFAULT_AUDIENCE,
    channels: ((row.channels as ChannelId[] | null) ?? ['meta_ads']),
    enabled: row.enabled !== false,
  }
}

function ruleToRow(input: PromotionRuleInput): Row {
  return {
    name: input.name,
    trigger: input.trigger,
    room_id: input.roomId,
    days_before: input.daysBefore,
    min_free_nights: input.minFreeNights,
    daily_budget: input.dailyBudget,
    max_total_budget: input.maxTotalBudget,
    discount_pct: input.discountPct,
    audience: input.audience,
    channels: input.channels,
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
  }
}

export async function listRules(userId: string): Promise<PromotionRule[]> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Listing promotion rules failed: ${error.message}`)
  return (data ?? []).map(rowToRule)
}

export async function listEnabledRules(): Promise<PromotionRule[]> {
  const { data, error } = await createServiceRoleClient().from(TABLE).select(COLUMNS).eq('enabled', true)
  if (error) throw new Error(`Listing enabled promotion rules failed: ${error.message}`)
  return (data ?? []).map(rowToRule)
}

export async function createRule(userId: string, input: PromotionRuleInput): Promise<PromotionRule> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .insert({ ...ruleToRow(input), user_id: userId })
    .select(COLUMNS)
    .single()
  if (error) throw new Error(`Creating promotion rule failed: ${error.message}`)
  return rowToRule(data)
}

export async function updateRule(userId: string, ruleId: string, input: PromotionRuleInput): Promise<PromotionRule | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .update(ruleToRow(input))
    .eq('user_id', userId)
    .eq('id', ruleId)
    .select(COLUMNS)
    .maybeSingle()
  if (error) throw new Error(`Updating promotion rule failed: ${error.message}`)
  return data ? rowToRule(data) : null
}

export async function deleteRule(userId: string, ruleId: string): Promise<void> {
  const { error } = await createServiceRoleClient().from(TABLE).delete().eq('user_id', userId).eq('id', ruleId)
  if (error) throw new Error(`Deleting promotion rule failed: ${error.message}`)
}
