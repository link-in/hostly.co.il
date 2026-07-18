/**
 * Regression coverage for `getUsersWithBeds24Access`.
 *
 * Bug this guards against: the query used to hard-require `beds24_refresh_token`
 * to be non-null, which silently excluded every host that only has a long-lived
 * Beds24 access token (no refresh token) — i.e. it excluded real, working hosts
 * from any scheduled job (like the review-reminders cron) that relies on this list.
 */
import { vi, describe, it, expect } from 'vitest'
import { getUsersWithBeds24Access } from './users'

type FakeRow = Record<string, unknown>

/** Minimal chainable query-builder stub for the exact `.select().not().neq().not()` shape used here. */
function makeSelectChain(rows: FakeRow[]) {
  const filters: Array<(row: FakeRow) => boolean> = []

  const chain = {
    not(key: string, _op: string, _value: unknown) {
      filters.push((row) => row[key] !== null && row[key] !== undefined)
      return chain
    },
    neq(key: string, value: unknown) {
      filters.push((row) => row[key] !== value)
      return chain
    },
    then(onfulfilled: (v: { data: FakeRow[]; error: null }) => unknown) {
      const data = rows.filter((row) => filters.every((f) => f(row)))
      return Promise.resolve(onfulfilled({ data, error: null }))
    },
  }
  return chain
}

function makeClient(rows: FakeRow[]) {
  return {
    from(_table: string) {
      return { select: () => makeSelectChain(rows) }
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
  createServerClient: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/server'

describe('getUsersWithBeds24Access', () => {
  it('includes a host with an access token but NO refresh token (long-lived token — the common real-world case)', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient([
        {
          id: 'user_1',
          property_id: '306559',
          display_name: 'נוף הרים בדפנה',
          google_review_url: 'https://g.page/r/abc',
          beds24_token: 'access-token',
          beds24_refresh_token: null,
        },
      ]) as never,
    )

    const users = await getUsersWithBeds24Access()

    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      id: 'user_1',
      propertyId: '306559',
      beds24Token: 'access-token',
      beds24RefreshToken: '',
    })
  })

  it('includes a host that has both an access token and a refresh token', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient([
        {
          id: 'user_2',
          property_id: '111',
          display_name: 'Other Host',
          google_review_url: null,
          beds24_token: 'access-token',
          beds24_refresh_token: 'refresh-token',
        },
      ]) as never,
    )

    const users = await getUsersWithBeds24Access()

    expect(users).toHaveLength(1)
    expect(users[0].beds24RefreshToken).toBe('refresh-token')
  })

  it('excludes a host with no access token at all', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient([
        {
          id: 'user_3',
          property_id: '222',
          display_name: 'No Token Host',
          google_review_url: null,
          beds24_token: null,
          beds24_refresh_token: null,
        },
      ]) as never,
    )

    const users = await getUsersWithBeds24Access()

    expect(users).toHaveLength(0)
  })

  it('excludes a host with no property_id', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(
      makeClient([
        {
          id: 'user_4',
          property_id: null,
          display_name: 'No Property Host',
          google_review_url: null,
          beds24_token: 'access-token',
          beds24_refresh_token: null,
        },
      ]) as never,
    )

    const users = await getUsersWithBeds24Access()

    expect(users).toHaveLength(0)
  })
})
