import { readApiError } from '@/lib/dashboard/apiError'
import type { ConnectionSummary } from '../connections/types'
import type { CampaignAction, CampaignEdit, PromotionCampaign, PromotionRule, PromotionRuleInput } from '../domain/types'
import type { MetaAssetSelection } from '../publishing/meta/assetSelection'
import type { MetaAssetOptions } from '../publishing/meta/oauth'

/** Browser-side calls to the promotions API. Components use these, never `fetch` directly. */
const BASE = '/api/dashboard/promotions'

async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  if (!response.ok) throw new Error(await readApiError(response, fallback))
  return (await response.json()) as T
}

function json(method: string, body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

export const META_CONNECT_URL = '/api/meta/oauth/start'

export interface ConnectionState {
  connection: ConnectionSummary | null
  configured: boolean
}

export function fetchConnection(): Promise<ConnectionState> {
  return request(`${BASE}/connection`, undefined, 'טעינת החיבור נכשלה')
}

export function fetchAssetOptions(): Promise<MetaAssetOptions> {
  return request(`${BASE}/connection/options`, undefined, 'טעינת החשבונות מ-Meta נכשלה')
}

export async function saveAssetSelection(selection: MetaAssetSelection): Promise<ConnectionSummary> {
  const result = await request<{ connection: ConnectionSummary }>(
    `${BASE}/connection`,
    json('PUT', selection),
    'שמירת החשבונות נכשלה',
  )
  return result.connection
}

export async function disconnect(): Promise<void> {
  await request(`${BASE}/connection`, json('DELETE'), 'ניתוק נכשל')
}

export async function fetchRules(): Promise<PromotionRule[]> {
  return (await request<{ rules: PromotionRule[] }>(`${BASE}/rules`, undefined, 'טעינת החוקים נכשלה')).rules
}

export async function saveRule(input: PromotionRuleInput, ruleId?: string): Promise<PromotionRule> {
  const url = ruleId ? `${BASE}/rules/${ruleId}` : `${BASE}/rules`
  return (await request<{ rule: PromotionRule }>(url, json(ruleId ? 'PUT' : 'POST', input), 'שמירת החוק נכשלה')).rule
}

export async function deleteRule(ruleId: string): Promise<void> {
  await request(`${BASE}/rules/${ruleId}`, json('DELETE'), 'מחיקת החוק נכשלה')
}

export async function fetchCampaigns(): Promise<PromotionCampaign[]> {
  return (await request<{ campaigns: PromotionCampaign[] }>(`${BASE}/campaigns`, undefined, 'טעינת הקמפיינים נכשלה'))
    .campaigns
}

export async function editCampaign(campaignId: string, edit: CampaignEdit): Promise<PromotionCampaign> {
  return (
    await request<{ campaign: PromotionCampaign }>(`${BASE}/campaigns/${campaignId}`, json('PATCH', edit), 'השמירה נכשלה')
  ).campaign
}

export async function runCampaignAction(campaignId: string, action: CampaignAction): Promise<PromotionCampaign> {
  return (
    await request<{ campaign: PromotionCampaign }>(`${BASE}/campaigns/${campaignId}`, json('POST', { action }), 'הפעולה נכשלה')
  ).campaign
}

export interface RoomOption {
  id: string
  name: string
}

export async function fetchRooms(): Promise<RoomOption[]> {
  const rooms = await request<Array<{ id: string | number; name?: string }>>(
    '/api/dashboard/room-list',
    undefined,
    'טעינת החדרים נכשלה',
  )
  return rooms.map((room) => ({ id: String(room.id), name: room.name || String(room.id) }))
}
