import { describe, expect, it } from 'vitest'
import {
  billingCycleLabel,
  expiryLabel,
  formatHebrewDate,
  isTrialEndingSoon,
  subscriptionStatusView,
} from './subscriptionView'

describe('subscriptionStatusView', () => {
  it.each([
    ['active', 'פעיל', 'success'],
    ['trial', 'ניסיון', 'info'],
    ['cancelled', 'בוטל', 'warning'],
    ['expired', 'פג תוקף', 'danger'],
  ] as const)('maps %s', (status, label, tone) => {
    expect(subscriptionStatusView(status)).toEqual({ label, tone })
  })
})

describe('billingCycleLabel', () => {
  it('labels known cycles and returns null otherwise', () => {
    expect(billingCycleLabel('monthly')).toBe('חודשי — ₪150')
    expect(billingCycleLabel('annual')).toBe('שנתי — ₪1,000')
    expect(billingCycleLabel(null)).toBeNull()
  })
})

describe('expiryLabel', () => {
  it('says "access until" for cancelled subscriptions', () => {
    expect(expiryLabel('cancelled')).toBe('גישה עד')
    expect(expiryLabel('active')).toBe('תוקף עד')
  })
})

describe('isTrialEndingSoon', () => {
  it('flags trials with 3 days or fewer', () => {
    expect(isTrialEndingSoon('trial', 3)).toBe(true)
    expect(isTrialEndingSoon('trial', 4)).toBe(false)
    expect(isTrialEndingSoon('active', 1)).toBe(false)
  })
})

describe('formatHebrewDate', () => {
  it('returns null for empty values', () => {
    expect(formatHebrewDate(null)).toBeNull()
    expect(formatHebrewDate('2026-11-05T00:00:00Z')).toMatch(/2026/)
  })
})
