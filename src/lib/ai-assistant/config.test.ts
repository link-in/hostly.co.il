import { describe, it, expect } from 'vitest'
import { DEFAULT_MODEL_BY_PROVIDER, DEFAULT_RATE_LIMIT_PER_HOUR, createAssistantModel, parseAssistantConfig } from './config'

describe('parseAssistantConfig', () => {
  it('is disabled with Anthropic defaults when nothing is set', () => {
    expect(parseAssistantConfig({})).toEqual({
      enabled: false,
      provider: 'anthropic',
      apiKey: undefined,
      modelId: DEFAULT_MODEL_BY_PROVIDER.anthropic,
      rateLimitPerHour: DEFAULT_RATE_LIMIT_PER_HOUR,
    })
  })

  it('treats empty strings as unset', () => {
    const config = parseAssistantConfig({ AI_ASSISTANT_ENABLED: '', AI_ASSISTANT_PROVIDER: '', AI_ASSISTANT_MODEL: '', ANTHROPIC_API_KEY: '' })
    expect(config.enabled).toBe(false)
    expect(config.provider).toBe('anthropic')
    expect(config.modelId).toBe(DEFAULT_MODEL_BY_PROVIDER.anthropic)
  })

  it.each(['true', '1'])('enables the assistant for %s', (flag) => {
    const config = parseAssistantConfig({ AI_ASSISTANT_ENABLED: flag, ANTHROPIC_API_KEY: 'sk-test' })
    expect(config.enabled).toBe(true)
    expect(config.apiKey).toBe('sk-test')
  })

  it('requires the Anthropic key when enabled with the default provider', () => {
    expect(() => parseAssistantConfig({ AI_ASSISTANT_ENABLED: 'true' })).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('uses the Google key and default model when the provider is google', () => {
    const config = parseAssistantConfig({
      AI_ASSISTANT_ENABLED: 'true',
      AI_ASSISTANT_PROVIDER: 'google',
      ANTHROPIC_API_KEY: 'sk-ant',
      GOOGLE_GENERATIVE_AI_API_KEY: 'g-key',
    })
    expect(config).toMatchObject({ provider: 'google', apiKey: 'g-key', modelId: DEFAULT_MODEL_BY_PROVIDER.google })
  })

  it('requires the Google key when enabled with the google provider, even if an Anthropic key exists', () => {
    expect(() =>
      parseAssistantConfig({ AI_ASSISTANT_ENABLED: 'true', AI_ASSISTANT_PROVIDER: 'google', ANTHROPIC_API_KEY: 'sk-ant' }),
    ).toThrow(/GOOGLE_GENERATIVE_AI_API_KEY/)
  })

  it('rejects an unknown provider', () => {
    expect(() => parseAssistantConfig({ AI_ASSISTANT_PROVIDER: 'openai' })).toThrow()
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

describe('createAssistantModel', () => {
  it.each([
    ['anthropic', 'claude-sonnet-5-5', /anthropic/],
    ['google', 'gemini-3.5-flash', /google/],
  ] as const)('builds a %s model', (provider, modelId, providerPattern) => {
    const model = createAssistantModel({ enabled: true, provider, apiKey: 'key', modelId, rateLimitPerHour: 30 })
    expect(typeof model).toBe('object')
    if (typeof model === 'object') {
      expect(model.modelId).toBe(modelId)
      expect(model.provider).toMatch(providerPattern)
    }
  })

  it('refuses to build a model without a key', () => {
    expect(() => createAssistantModel({ enabled: true, provider: 'google', apiKey: undefined, modelId: 'm', rateLimitPerHour: 30 })).toThrow(
      /GOOGLE_GENERATIVE_AI_API_KEY/,
    )
  })
})
