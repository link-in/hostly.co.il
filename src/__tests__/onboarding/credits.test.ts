import { afterEach, describe, expect, it } from 'vitest'
import {
  assertCreditBudget,
  getLastCreditSnapshot,
  readCreditHeaders,
  recordCreditSnapshot,
  resetCreditSnapshot,
} from '@/lib/onboarding/credits'
import { CreditBudgetError } from '@/lib/onboarding/errors'

const NOW = 1_000_000

afterEach(() => resetCreditSnapshot())

describe('readCreditHeaders', () => {
  it('reads the OpenAPI header names', () => {
    const headers = new Headers({
      'X-FiveMinCreditLimit': '100',
      'X-FiveMinCreditLimit-Remaining': '80',
      'X-FiveMinCreditLimit-ResetsIn': '120',
      'X-RequestCost': '2',
    })
    expect(readCreditHeaders(headers, NOW)).toEqual({
      limit: 100,
      remaining: 80,
      resetsInSeconds: 120,
      requestCost: 2,
      observedAt: NOW,
    })
  })

  it('reads the wiki header names', () => {
    const headers = new Headers({ 'x-five-min-limit-remaining': '5', 'x-request-cost': '1' })
    const snapshot = readCreditHeaders(headers, NOW)
    expect(snapshot.remaining).toBe(5)
    expect(snapshot.requestCost).toBe(1)
    expect(snapshot.limit).toBeNull()
  })
})

describe('assertCreditBudget', () => {
  it('allows calls when nothing has been observed yet', () => {
    expect(() => assertCreditBudget(10, NOW)).not.toThrow()
  })

  it('ignores snapshots without a remaining count', () => {
    recordCreditSnapshot(readCreditHeaders(new Headers(), NOW))
    expect(getLastCreditSnapshot()).toBeNull()
  })

  it('throws when remaining credits are below the minimum and the window is still open', () => {
    recordCreditSnapshot({ limit: 100, remaining: 3, resetsInSeconds: 60, requestCost: 1, observedAt: NOW })
    try {
      assertCreditBudget(10, NOW + 20_000)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(CreditBudgetError)
      expect((err as CreditBudgetError).status).toBe(429)
      expect((err as CreditBudgetError).resetsInSeconds).toBe(40)
    }
  })

  it('allows calls again once the window has reset', () => {
    recordCreditSnapshot({ limit: 100, remaining: 3, resetsInSeconds: 60, requestCost: 1, observedAt: NOW })
    expect(() => assertCreditBudget(10, NOW + 61_000)).not.toThrow()
  })

  it('allows calls when enough credits remain', () => {
    recordCreditSnapshot({ limit: 100, remaining: 50, resetsInSeconds: 60, requestCost: 1, observedAt: NOW })
    expect(() => assertCreditBudget(10, NOW)).not.toThrow()
  })
})
