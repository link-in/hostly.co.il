import { z } from 'zod'
import { campaignContentSchema, CALL_TO_ACTIONS } from '../../domain/types'
import { buildContentPrompt } from '../prompt'
import type { ContentGenerator } from '../types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const RESPONSE_JSON_SCHEMA = {
  name: 'ad_copy',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'primaryText', 'description', 'callToAction', 'hashtags'],
    properties: {
      headline: { type: 'string' },
      primaryText: { type: 'string' },
      description: { type: 'string' },
      callToAction: { type: 'string', enum: [...CALL_TO_ACTIONS] },
      hashtags: { type: 'array', items: { type: 'string' } },
    },
  },
} as const

const chatResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
})

export interface OpenAiGeneratorOptions {
  apiKey: string
  model: string
  fetchImpl?: typeof fetch
}

export function createOpenAiContentGenerator(options: OpenAiGeneratorOptions): ContentGenerator {
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    id: `openai:${options.model}`,
    async generate(input) {
      const prompt = buildContentPrompt(input)
      const response = await fetchImpl(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          temperature: 0.8,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
        }),
      })
      if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`)
      }

      const content = chatResponseSchema.parse(await response.json()).choices[0].message.content
      if (!content) throw new Error('OpenAI returned an empty message')
      return campaignContentSchema.parse(JSON.parse(content))
    },
  }
}
