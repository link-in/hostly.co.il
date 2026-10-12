import { describe, it, expect } from 'vitest'
import { canRunPushQaTest, isPushQaTestActive, QA_PUSH_TEST_HREF } from './qaTest'

describe('canRunPushQaTest', () => {
  it('allows admins only', () => {
    expect(canRunPushQaTest('admin')).toBe(true)
    expect(canRunPushQaTest('owner')).toBe(false)
    expect(canRunPushQaTest(undefined)).toBe(false)
    expect(canRunPushQaTest(null)).toBe(false)
  })
})

describe('isPushQaTestActive', () => {
  it('is active only with param=1 and an admin', () => {
    expect(isPushQaTestActive('1', 'admin')).toBe(true)
  })

  it('is inactive for non-admins even with the param', () => {
    expect(isPushQaTestActive('1', 'owner')).toBe(false)
    expect(isPushQaTestActive('1', undefined)).toBe(false)
  })

  it('is inactive without the param', () => {
    expect(isPushQaTestActive(null, 'admin')).toBe(false)
    expect(isPushQaTestActive('0', 'admin')).toBe(false)
  })
})

describe('QA_PUSH_TEST_HREF', () => {
  it('points to the dashboard with the QA param', () => {
    expect(QA_PUSH_TEST_HREF).toBe('/dashboard?test_push=1')
  })
})
