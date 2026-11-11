import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { checkRateLimit, logRequest, recordUsage } from './requestLog'

let fakeClient: FakeSupabaseClient
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => fakeClient }))

const now = new Date('2026-10-22T18:00:00.000Z')
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000)

beforeEach(() => {
  fakeClient = createFakeSupabaseClient()
})

describe('checkRateLimit', () => {
  it('allows requests under the hourly limit', async () => {
    await logRequest('user-1', 'web', 'model', minutesAgo(10))
    expect(await checkRateLimit('user-1', 2, now)).toEqual({ allowed: true })
  })

  it('blocks at the limit and says when the oldest request leaves the window', async () => {
    await logRequest('user-1', 'web', 'model', minutesAgo(50))
    await logRequest('user-1', 'web', 'model', minutesAgo(5))
    expect(await checkRateLimit('user-1', 2, now)).toEqual({ allowed: false, retryAfterSeconds: 600 })
  })

  it('ignores requests older than an hour and requests of other users', async () => {
    await logRequest('user-1', 'web', 'model', minutesAgo(61))
    await logRequest('user-2', 'web', 'model', minutesAgo(1))
    expect(await checkRateLimit('user-1', 1, now)).toEqual({ allowed: true })
  })
})

describe('logRequest / recordUsage', () => {
  it('logs the request and then fills in token usage', async () => {
    const id = await logRequest('user-1', 'whatsapp', 'claude-sonnet-5-5', now)
    await recordUsage(id, {
      inputTokens: 1200,
      outputTokens: 80,
    } as Parameters<typeof recordUsage>[1])

    expect(fakeClient.__table('ai_assistant_requests')).toEqual([
      {
        id,
        user_id: 'user-1',
        channel: 'whatsapp',
        model_id: 'claude-sonnet-5-5',
        created_at: now.toISOString(),
        input_tokens: 1200,
        output_tokens: 80,
      },
    ])
  })
})
