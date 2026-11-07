import { describe, expect, it } from 'vitest'
import { isSiteBuilderEnabled } from './featureFlag'

describe('isSiteBuilderEnabled', () => {
  it('is on by default, including production', () => {
    expect(isSiteBuilderEnabled({ flag: undefined })).toBe(true)
    expect(isSiteBuilderEnabled({ flag: '' })).toBe(true)
  })

  it('can be switched off explicitly via env', () => {
    expect(isSiteBuilderEnabled({ flag: 'false' })).toBe(false)
    expect(isSiteBuilderEnabled({ flag: ' FALSE ' })).toBe(false)
  })

  it('stays on for any other value', () => {
    expect(isSiteBuilderEnabled({ flag: 'true' })).toBe(true)
    expect(isSiteBuilderEnabled({ flag: '0' })).toBe(true)
  })
})
