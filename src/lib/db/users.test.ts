/**
 * Regression coverage for `getUsersWithBeds24Access`.
 *
 * Bug this guards against: the query used to hard-require `beds24_refresh_token`
 * to be non-null, which silently excluded every host that only has a long-lived
 * Beds24 access token (no refresh token) — i.e. it excluded real, working hosts
 * from any scheduled job (like the review-reminders cron) that relies on this list.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getUsersWithBeds24Access, getOwnerInfoByPropertyRoom } from './users'

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

import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server'

/** Minimal chainable stub for the `.select().eq().single()` shape used by `getOwnerInfoByPropertyRoom`. */
function makeSingleRowClient(row: FakeRow | null) {
  return {
    from(_table: string) {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(row ? { data: row, error: null } : { data: null, error: { message: 'not found' } }),
          }),
        }),
      }
    },
  }
}

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

describe('getOwnerInfoByPropertyRoom — secondary phone number support', () => {
  const ORIGINAL_ENV = process.env.OWNER_PHONE_NUMBER

  beforeEach(() => {
    delete process.env.OWNER_PHONE_NUMBER
  })

  afterEach(() => {
    process.env.OWNER_PHONE_NUMBER = ORIGINAL_ENV
  })

  it('returns both the primary and secondary phone in phoneNumbers when both are set', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      makeSingleRowClient({
        display_name: 'נוף הרים בדפנה',
        phone_number: '0501111111',
        secondary_phone_number: '0502222222',
      }) as never,
    )

    const info = await getOwnerInfoByPropertyRoom('306559', undefined)

    expect(info.phoneNumbers).toEqual(['+972501111111', '+972502222222'])
    expect(info.phoneNumber).toBe('+972501111111')
    expect(info.roomName).toBe('נוף הרים בדפנה')
  })

  it('falls back to just the primary phone when no secondary is configured', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      makeSingleRowClient({
        display_name: 'Host',
        phone_number: '0501111111',
        secondary_phone_number: null,
      }) as never,
    )

    const info = await getOwnerInfoByPropertyRoom('306559', undefined)

    expect(info.phoneNumbers).toEqual(['+972501111111'])
  })

  it('returns an empty phoneNumbers array when neither phone is configured', async () => {
    vi.mocked(createServerClient).mockReturnValue(
      makeSingleRowClient({ display_name: 'Host', phone_number: null, secondary_phone_number: null }) as never,
    )

    const info = await getOwnerInfoByPropertyRoom('306559', undefined)

    expect(info.phoneNumbers).toEqual([])
    expect(info.phoneNumber).toBeNull()
  })

  it('falls back to OWNER_PHONE_NUMBER env var when the user is not found in the DB', async () => {
    process.env.OWNER_PHONE_NUMBER = '0509999999'
    vi.mocked(createServerClient).mockReturnValue(makeSingleRowClient(null) as never)

    const info = await getOwnerInfoByPropertyRoom('unknown-property', undefined)

    expect(info.phoneNumbers).toEqual(['+972509999999'])
  })
})
