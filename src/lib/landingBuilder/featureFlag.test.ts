import { describe, expect, it } from 'vitest'
import { isSiteBuilderEnabled } from './featureFlag'

describe('isSiteBuilderEnabled', () => {
  it('is on in local development', () => {
    expect(isSiteBuilderEnabled({ nodeEnv: 'development', flag: undefined })).toBe(true)
  })

  it('is off in production by default', () => {
    expect(isSiteBuilderEnabled({ nodeEnv: 'production', flag: undefined })).toBe(false)
  })

  it('can be switched on explicitly via env', () => {
    expect(isSiteBuilderEnabled({ nodeEnv: 'production', flag: 'true' })).toBe(true)
  })

  it('ignores values other than "true"', () => {
    expect(isSiteBuilderEnabled({ nodeEnv: 'production', flag: '1' })).toBe(false)
  })
})
