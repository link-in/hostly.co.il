import { describe, it, expect } from 'vitest'
import { DEFAULT_ASSISTANT_MODEL, DEFAULT_RATE_LIMIT_PER_HOUR, parseAssistantConfig } from './config'

describe('parseAssistantConfig', () => {
  it('is disabled with defaults when nothing is set', () => {
    expect(parseAssistantConfig({})).toEqual({
      enabled: false,
      apiKey: undefined,
      modelId: DEFAULT_ASSISTANT_MODEL,
      rateLimitPerHour: DEFAULT_RATE_LIMIT_PER_HOUR,
    })
  })

  it('treats empty strings as unset', () => {
    const config = parseAssistantConfig({ AI_ASSISTANT_ENABLED: '', AI_ASSISTANT_MODEL: '', ANTHROPIC_API_KEY: '' })
    expect(config.enabled).toBe(false)
    expect(config.modelId).toBe(DEFAULT_ASSISTANT_MODEL)
  })

  it.each(['true', '1'])('enables the assistant for %s', (flag) => {
    const config = parseAssistantConfig({ AI_ASSISTANT_ENABLED: flag, ANTHROPIC_API_KEY: 'sk-test' })
    expect(config.enabled).toBe(true)
    expect(config.apiKey).toBe('sk-test')
  })

  it('requires an API key when enabled', () => {
    expect(() => parseAssistantConfig({ AI_ASSISTANT_ENABLED: 'true' })).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('rejects an unknown flag value instead of guessing', () => {
    expect(() => parseAssistantConfig({ AI_ASSISTANT_ENABLED: 'yes' })).toThrow()
  })

  it('reads model and rate limit overrides', () => {
    const config = parseAssistantConfig({ AI_ASSISTANT_MODEL: 'claude-haiku-4-5', AI_ASSISTANT_RATE_LIMIT_PER_HOUR: '5' })
    expect(config.modelId).toBe('claude-haiku-4-5')
    expect(config.rateLimitPerHour).toBe(5)
  })

  it('rejects a non-positive rate limit', () => {
    expect(() => parseAssistantConfig({ AI_ASSISTANT_RATE_LIMIT_PER_HOUR: '0' })).toThrow()
  })
})
