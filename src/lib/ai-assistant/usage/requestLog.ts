import { randomUUID } from 'node:crypto'
import type { LanguageModelUsage } from 'ai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AssistantChannel } from '../context'

const TABLE = 'ai_assistant_requests'
const RATE_WINDOW_MS = 60 * 60 * 1000

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/** Sliding one-hour window over logged requests. Fails open on DB errors so an outage does not lock users out. */
export async function checkRateLimit(userId: string, limitPerHour: number, now: Date = new Date()): Promise<RateLimitResult> {
  const since = new Date(now.getTime() - RATE_WINDOW_MS).toISOString()
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(limitPerHour)

  if (error) {
    console.error('[ai-assistant] Rate limit check failed, allowing request:', error.message)
    return { allowed: true }
  }

  const rows = (data ?? []) as { created_at: string }[]
  if (rows.length < limitPerHour) return { allowed: true }

  const oldest = Date.parse(rows[0].created_at)
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now.getTime()) / 1000)) }
}

/** Logs a request up front (so it counts toward the limit even if the stream fails). Returns the row id. */
export async function logRequest(
  userId: string,
  channel: AssistantChannel,
  modelId: string,
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID()
  const { error } = await createServiceRoleClient()
    .from(TABLE)
    .insert({ id, user_id: userId, channel, model_id: modelId, created_at: now.toISOString() })
  if (error) throw new Error(`Failed to log assistant request: ${error.message}`)
  return id
}

export async function recordUsage(requestId: string, usage: LanguageModelUsage): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from(TABLE)
    .update({ input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null })
    .eq('id', requestId)
  if (error) console.error('[ai-assistant] Failed to record token usage:', error.message)
}
