import { describe, expect, it } from 'vitest'
import { isSiteBuilderEnabled } from './featureFlag'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('isSiteBuilderEnabled', () => {
  it('is on in local development', () => {
    expect(isSiteBuilderEnabled(env({ NODE_ENV: 'development' }))).toBe(true)
  })

  it('is off in production by default', () => {
    expect(isSiteBuilderEnabled(env({ NODE_ENV: 'production' }))).toBe(false)
  })

  it('can be switched on explicitly via env', () => {
    expect(
      isSiteBuilderEnabled(env({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_BUILDER_ENABLED: 'true' })),
    ).toBe(true)
  })
})
