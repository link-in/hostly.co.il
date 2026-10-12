import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '../helpers/fakeSupabase'
import { createFakeBeds24 } from '../helpers/fakeBeds24'

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  fetch: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => mocks.db }))
vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: mocks.fetch }))

import { beds24Request } from '@/lib/onboarding/beds24Client'
import { resetCreditSnapshot } from '@/lib/onboarding/credits'
import { Beds24RequestError, CreditBudgetError } from '@/lib/onboarding/errors'

const anySchema = z.unknown()
const ctx = { userId: 'u1', step: 'property' }
let db: FakeSupabaseClient

function seedUser(tokens: { beds24_token: string | null; beds24_refresh_token: string | null }) {
  db = createFakeSupabaseClient({ users: [{ id: 'u1', ...tokens }] })
  mocks.db = db
}

beforeEach(() => {
  resetCreditSnapshot()
  mocks.fetch.mockReset()
  seedUser({ beds24_token: null, beds24_refresh_token: null })
})

describe('beds24Request', () => {
  it('uses the master account when the client has no own tokens', async () => {
    const beds24 = createFakeBeds24({ 'GET /accounts': { body: { data: [] } } })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await beds24Request(ctx, { method: 'GET', path: '/accounts', query: { includeUsage: true }, schema: anySchema })

    expect(beds24.calls[0]).toMatchObject({ query: { includeUsage: 'true' }, userTokens: undefined, userId: undefined })
  })

  it('uses the client sub-account tokens when both are stored', async () => {
    seedUser({ beds24_token: 'own-a', beds24_refresh_token: 'own-r' })
    const beds24 = createFakeBeds24({ 'GET /accounts': { body: { data: [] } } })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await beds24Request(ctx, { method: 'GET', path: '/accounts', schema: anySchema })

    expect(beds24.calls[0].userTokens).toEqual({ accessToken: 'own-a', refreshToken: 'own-r' })
    expect(beds24.calls[0].userId).toBe('u1')
  })

  it('writes an audit row with credit usage for every call', async () => {
    const beds24 = createFakeBeds24({
      'POST /properties': {
        body: [{ success: true }],
        headers: { 'X-FiveMinCreditLimit-Remaining': '90', 'X-RequestCost': '3' },
      },
    })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await beds24Request(ctx, { method: 'POST', path: '/properties', body: [{}], schema: anySchema })

    expect(db.__table('onboarding_audit_log')).toEqual([
      expect.objectContaining({
        user_id: 'u1',
        step: 'property',
        method: 'POST',
        path: '/properties',
        http_status: 200,
        success: true,
        request_cost: 3,
        credits_remaining: 90,
      }),
    ])
  })

  it('throws Beds24RequestError on a 2xx body with success:false and logs the failure', async () => {
    const beds24 = createFakeBeds24({
      'POST /properties': { body: [{ success: false, errors: [{ message: 'name required' }] }] },
    })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await expect(
      beds24Request(ctx, { method: 'POST', path: '/properties', body: [{}], schema: anySchema }),
    ).rejects.toThrow(Beds24RequestError)
    expect(db.__table('onboarding_audit_log')[0]).toMatchObject({ success: false, error: 'name required' })
  })

  it('throws CreditBudgetError when Beds24 reports exhausted credits', async () => {
    const beds24 = createFakeBeds24({ 'GET /accounts': { status: 402, body: { error: 'no api credits' } } })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await expect(beds24Request(ctx, { method: 'GET', path: '/accounts', schema: anySchema })).rejects.toThrow(
      CreditBudgetError,
    )
  })

  it('rejects responses that do not match the expected schema', async () => {
    const beds24 = createFakeBeds24({ 'GET /accounts': { body: { data: 'nope' } } })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await expect(
      beds24Request(ctx, { method: 'GET', path: '/accounts', schema: z.object({ data: z.array(z.unknown()) }) }),
    ).rejects.toThrow(Beds24RequestError)
  })

  it('blocks the next call when the shared credit window is nearly used up', async () => {
    const beds24 = createFakeBeds24({
      'GET /accounts': {
        body: { data: [] },
        headers: { 'X-FiveMinCreditLimit-Remaining': '2', 'X-FiveMinCreditLimit-ResetsIn': '200' },
      },
    })
    mocks.fetch.mockImplementation(beds24.fetchImpl)

    await beds24Request(ctx, { method: 'GET', path: '/accounts', schema: anySchema })
    await expect(beds24Request(ctx, { method: 'GET', path: '/accounts', schema: anySchema })).rejects.toThrow(
      CreditBudgetError,
    )
    expect(beds24.calls).toHaveLength(1)
  })
})
