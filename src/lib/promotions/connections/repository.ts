import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ChannelId } from '../domain/types'
import type { ConnectionRecord, ConnectionStatus } from './types'

const TABLE = 'promotion_connections'
const COLUMNS = 'id, user_id, channel, status, access_token_enc, token_expires_at, assets, monthly_budget_cap'

type Row = Record<string, unknown>

export function rowToConnection(row: Row): ConnectionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    channel: row.channel as ChannelId,
    status: row.status as ConnectionStatus,
    accessTokenEnc: String(row.access_token_enc),
    tokenExpiresAt: (row.token_expires_at as string | null) ?? null,
    assets: (row.assets as Record<string, unknown> | null) ?? {},
    monthlyBudgetCap: row.monthly_budget_cap === null || row.monthly_budget_cap === undefined
      ? null
      : Number(row.monthly_budget_cap),
  }
}

export async function getConnection(userId: string, channel: ChannelId): Promise<ConnectionRecord | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('channel', channel)
    .maybeSingle()
  if (error) throw new Error(`Loading promotion connection failed: ${error.message}`)
  return data ? rowToConnection(data) : null
}

export async function listConnectionsByStatus(statuses: ConnectionStatus[]): Promise<ConnectionRecord[]> {
  const { data, error } = await createServiceRoleClient().from(TABLE).select(COLUMNS).in('status', statuses)
  if (error) throw new Error(`Listing promotion connections failed: ${error.message}`)
  return (data ?? []).map(rowToConnection)
}

export interface SaveConnectionInput {
  userId: string
  channel: ChannelId
  accessTokenEnc: string
  tokenExpiresAt: string | null
}

/** New OAuth grant: replaces the token and asks the host to pick assets again. */
export async function saveConnectionToken(input: SaveConnectionInput): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from(TABLE)
    .upsert(
      [
        {
          user_id: input.userId,
          channel: input.channel,
          access_token_enc: input.accessTokenEnc,
          token_expires_at: input.tokenExpiresAt,
          status: 'pending_setup',
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'user_id,channel' },
    )
  if (error) throw new Error(`Saving promotion connection failed: ${error.message}`)
}

export interface ConnectionPatch {
  status?: ConnectionStatus
  assets?: Record<string, unknown>
  monthlyBudgetCap?: number | null
}

export async function updateConnection(userId: string, channel: ChannelId, patch: ConnectionPatch): Promise<void> {
  const row: Row = { updated_at: new Date().toISOString() }
  if (patch.status !== undefined) row.status = patch.status
  if (patch.assets !== undefined) row.assets = patch.assets
  if (patch.monthlyBudgetCap !== undefined) row.monthly_budget_cap = patch.monthlyBudgetCap
  const { error } = await createServiceRoleClient().from(TABLE).update(row).eq('user_id', userId).eq('channel', channel)
  if (error) throw new Error(`Updating promotion connection failed: ${error.message}`)
}

export async function deleteConnection(userId: string, channel: ChannelId): Promise<void> {
  const { error } = await createServiceRoleClient().from(TABLE).delete().eq('user_id', userId).eq('channel', channel)
  if (error) throw new Error(`Deleting promotion connection failed: ${error.message}`)
}
