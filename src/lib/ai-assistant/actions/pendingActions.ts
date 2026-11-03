/**
 * Persistence for assistant write actions. Every status change is a conditional
 * update on the current status, so two confirmations racing each other can
 * never both run the same change.
 */
import { randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AssistantChannel } from '../context'
import { PENDING_ACTION_TTL_MS, type PendingActionRow, type ProposedAction } from './types'

const TABLE = 'ai_pending_actions'

export interface CreatedPendingAction {
  id: string
  expiresAt: string
}

export async function createPendingAction(
  userId: string,
  channel: AssistantChannel,
  action: ProposedAction,
  now: Date = new Date(),
): Promise<CreatedPendingAction> {
  const row = {
    id: randomUUID(),
    user_id: userId,
    channel,
    action_type: action.actionType,
    payload: action.payload,
    status: 'pending',
    expires_at: new Date(now.getTime() + PENDING_ACTION_TTL_MS).toISOString(),
    created_at: now.toISOString(),
  }
  const { error } = await createServiceRoleClient().from(TABLE).insert(row)
  if (error) throw new Error(`Failed to create pending action: ${error.message}`)
  return { id: row.id, expiresAt: row.expires_at }
}

export async function getPendingAction(userId: string, actionId: string): Promise<PendingActionRow | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select('*')
    .eq('id', actionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load pending action: ${error.message}`)
  return (data as PendingActionRow | null) ?? null
}

/** Moves pending -> executing for exactly one caller. Returns null if not pending, expired, or not this user's. */
export async function claimPendingAction(
  userId: string,
  actionId: string,
  now: Date = new Date(),
): Promise<PendingActionRow | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .update({ status: 'executing' })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', now.toISOString())
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`Failed to claim pending action: ${error.message}`)
  return (data as PendingActionRow | null) ?? null
}

export async function finishPendingAction(
  actionId: string,
  status: 'executed' | 'failed',
  result: unknown,
  now: Date = new Date(),
): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from(TABLE)
    .update({ status, result, resolved_at: now.toISOString() })
    .eq('id', actionId)
    .eq('status', 'executing')
  if (error) throw new Error(`Failed to finish pending action: ${error.message}`)
}

/** Moves pending -> rejected/expired. Returns false if the action was no longer pending. */
export async function closePendingAction(
  userId: string,
  actionId: string,
  status: 'rejected' | 'expired',
  now: Date = new Date(),
): Promise<boolean> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .update({ status, resolved_at: now.toISOString() })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) throw new Error(`Failed to close pending action: ${error.message}`)
  return data !== null
}
