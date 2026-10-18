import { describe, it, expect } from 'vitest'
import { pickAuthoritativeTokens } from './userTokens'

const stale = { accessToken: 'stale-a', refreshToken: 'stale-r' }

describe('pickAuthoritativeTokens', () => {
  it('prefers the DB tokens over stale session tokens', () => {
    const row = { beds24_token: 'db-a', beds24_refresh_token: 'db-r' }
    expect(pickAuthoritativeTokens(row, stale)).toEqual({ accessToken: 'db-a', refreshToken: 'db-r' })
  })

  it('falls back to the master account when the DB row has no tokens, even if the session has old ones', () => {
    expect(pickAuthoritativeTokens({ beds24_token: null, beds24_refresh_token: null }, stale)).toBeUndefined()
  })

  it('treats an access-token-only row as "no user tokens" (existing behaviour)', () => {
    expect(pickAuthoritativeTokens({ beds24_token: 'a', beds24_refresh_token: null }, undefined)).toBeUndefined()
  })

  it('keeps the provided tokens when the DB row could not be loaded', () => {
    expect(pickAuthoritativeTokens(null, stale)).toBe(stale)
  })
})
