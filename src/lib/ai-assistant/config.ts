import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'
import { z } from 'zod'

export const ASSISTANT_PROVIDERS = ['anthropic', 'google'] as const
export type AssistantProvider = (typeof ASSISTANT_PROVIDERS)[number]

export const DEFAULT_ASSISTANT_PROVIDER: AssistantProvider = 'anthropic'
export const DEFAULT_MODEL_BY_PROVIDER: Record<AssistantProvider, string> = {
  anthropic: 'claude-sonnet-5-5',
  google: 'gemini-3.5-flash',
}
export const API_KEY_ENV_BY_PROVIDER = {
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
} as const satisfies Record<AssistantProvider, string>
export const DEFAULT_RATE_LIMIT_PER_HOUR = 30

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1')

const optionalText = z.string().trim().min(1).optional()

const assistantEnvSchema = z
  .object({
    AI_ASSISTANT_ENABLED: booleanFlag,
    AI_ASSISTANT_PROVIDER: z.enum(ASSISTANT_PROVIDERS).default(DEFAULT_ASSISTANT_PROVIDER),
    ANTHROPIC_API_KEY: optionalText,
    GOOGLE_GENERATIVE_AI_API_KEY: optionalText,
    AI_ASSISTANT_MODEL: optionalText,
    AI_ASSISTANT_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(DEFAULT_RATE_LIMIT_PER_HOUR),
  })
  .superRefine((env, ctx) => {
    const keyEnv = API_KEY_ENV_BY_PROVIDER[env.AI_ASSISTANT_PROVIDER]
    if (env.AI_ASSISTANT_ENABLED && !env[keyEnv]) {
      ctx.addIssue({ code: 'custom', path: [keyEnv], message: `${keyEnv} is required when AI_ASSISTANT_ENABLED is true` })
    }
  })

export interface AssistantConfig {
  enabled: boolean
  provider: AssistantProvider
  apiKey: string | undefined
  modelId: string
  rateLimitPerHour: number
}

/** Parses assistant settings from an env object. Throws on invalid configuration. */
export function parseAssistantConfig(env: Record<string, string | undefined>): AssistantConfig {
  const parsed = assistantEnvSchema.parse({
    AI_ASSISTANT_ENABLED: env.AI_ASSISTANT_ENABLED || undefined,
    AI_ASSISTANT_PROVIDER: env.AI_ASSISTANT_PROVIDER || undefined,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || undefined,
    GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY || undefined,
    AI_ASSISTANT_MODEL: env.AI_ASSISTANT_MODEL || undefined,
    AI_ASSISTANT_RATE_LIMIT_PER_HOUR: env.AI_ASSISTANT_RATE_LIMIT_PER_HOUR || undefined,
  })
  const provider = parsed.AI_ASSISTANT_PROVIDER
  return {
    enabled: parsed.AI_ASSISTANT_ENABLED,
    provider,
    apiKey: parsed[API_KEY_ENV_BY_PROVIDER[provider]],
    modelId: parsed.AI_ASSISTANT_MODEL ?? DEFAULT_MODEL_BY_PROVIDER[provider],
    rateLimitPerHour: parsed.AI_ASSISTANT_RATE_LIMIT_PER_HOUR,
  }
}

export function getAssistantConfig(): AssistantConfig {
  return parseAssistantConfig(process.env)
}

export function isAssistantEnabled(): boolean {
  try {
    return getAssistantConfig().enabled
  } catch (err) {
    console.error('[ai-assistant] Invalid configuration, assistant disabled:', err)
    return false
  }
}

export function createAssistantModel(config: AssistantConfig = getAssistantConfig()): LanguageModel {
  if (!config.apiKey) throw new Error(`${API_KEY_ENV_BY_PROVIDER[config.provider]} is not configured`)
  switch (config.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey })(config.modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.modelId)
  }
}
