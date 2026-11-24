import { createOpenAiContentGenerator } from './providers/openai'
import { templateContentGenerator } from './providers/template'
import type { ContentGenerator } from './types'

const DEFAULT_MODEL = 'gpt-4o-mini'

/** Uses `primary`, and `fallback` when it throws — a draft is always produced. */
export function withFallback(primary: ContentGenerator, fallback: ContentGenerator): ContentGenerator {
  return {
    id: `${primary.id}+${fallback.id}`,
    async generate(input) {
      try {
        return await primary.generate(input)
      } catch (err) {
        console.error(`[Promotions] content generator ${primary.id} failed, using ${fallback.id}:`, err)
        return fallback.generate(input)
      }
    },
  }
}

/** Add a new AI provider: implement `ContentGenerator` and select it here by env. */
export function resolveContentGenerator(env: NodeJS.ProcessEnv = process.env): ContentGenerator {
  if (!env.OPENAI_API_KEY) return templateContentGenerator
  const ai = createOpenAiContentGenerator({
    apiKey: env.OPENAI_API_KEY,
    model: env.PROMOTIONS_AI_MODEL || DEFAULT_MODEL,
  })
  return withFallback(ai, templateContentGenerator)
}
