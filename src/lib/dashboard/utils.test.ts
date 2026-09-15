import { describe, it, expect } from 'vitest'
import { formatStatus } from './utils'

describe('formatStatus', () => {
  it.each([
    ['confirmed', 'מאושר'],
    ['pending', 'ממתין'],
    ['request', 'בקשת הזמנה'],
    ['inquiry', 'בירור'],
    ['cancelled', 'בוטל'],
  ] as const)('%s → %s', (status, label) => {
    expect(formatStatus(status)).toBe(label)
  })
})
