import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'
import { z } from 'zod'

export const DEFAULT_ASSISTANT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_RATE_LIMIT_PER_HOUR = 30

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1')

const assistantEnvSchema = z
  .object({
    AI_ASSISTANT_ENABLED: booleanFlag,
    ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
    AI_ASSISTANT_MODEL: z.string().trim().min(1).default(DEFAULT_ASSISTANT_MODEL),
    AI_ASSISTANT_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(DEFAULT_RATE_LIMIT_PER_HOUR),
  })
  .refine((env) => !env.AI_ASSISTANT_ENABLED || env.ANTHROPIC_API_KEY, {
    message: 'ANTHROPIC_API_KEY is required when AI_ASSISTANT_ENABLED is true',
    path: ['ANTHROPIC_API_KEY'],
  })

export interface AssistantConfig {
  enabled: boolean
  apiKey: string | undefined
  modelId: string
  rateLimitPerHour: number
}

/** Parses assistant settings from an env object. Throws on invalid configuration. */
export function parseAssistantConfig(env: Record<string, string | undefined>): AssistantConfig {
  const parsed = assistantEnvSchema.parse({
    AI_ASSISTANT_ENABLED: env.AI_ASSISTANT_ENABLED || undefined,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || undefined,
    AI_ASSISTANT_MODEL: env.AI_ASSISTANT_MODEL || undefined,
    AI_ASSISTANT_RATE_LIMIT_PER_HOUR: env.AI_ASSISTANT_RATE_LIMIT_PER_HOUR || undefined,
  })
  return {
    enabled: parsed.AI_ASSISTANT_ENABLED,
    apiKey: parsed.ANTHROPIC_API_KEY,
    modelId: parsed.AI_ASSISTANT_MODEL,
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
  if (!config.apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  return createAnthropic({ apiKey: config.apiKey })(config.modelId)
}
