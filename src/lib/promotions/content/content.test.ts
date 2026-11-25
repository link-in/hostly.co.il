import { describe, expect, it, vi } from 'vitest'
import { campaignContentSchema } from '../domain/types'
import { discountedPrice, formatStayRange } from './offer'
import { buildContentPrompt } from './prompt'
import { createOpenAiContentGenerator } from './providers/openai'
import { buildTemplateContent, templateContentGenerator } from './providers/template'
import { resolveContentGenerator, withFallback } from './registry'
import type { ContentGenerator, ContentInput } from './types'

const input: ContentInput = {
  siteTitle: 'וילה בגליל',
  roomName: 'סוויטה',
  city: 'ראש פינה',
  trigger: 'weekend',
  checkIn: '2026-11-26',
  checkOut: '2026-11-28',
  nights: 2,
  nightlyPrice: 1000,
  discountPct: 15,
  currency: 'ILS',
}

const aiCopy = {
  headline: 'סופ״ש פנוי בגליל',
  primaryText: 'בואו לנוח אצלנו',
  description: 'הזמנה ישירה',
  callToAction: 'BOOK_TRAVEL',
  hashtags: ['#צימר'],
}

function openAiResponse(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    text: async () => 'boom',
    json: async () => body,
  })) as unknown as typeof fetch
}

describe('offer helpers', () => {
  it('formats the stay range and applies the discount', () => {
    expect(formatStayRange('2026-11-26', '2026-11-28')).toBe('26.11 עד 28.11')
    expect(discountedPrice(input)).toBe(850)
    expect(discountedPrice({ nightlyPrice: 500, discountPct: null })).toBe(500)
    expect(discountedPrice({ nightlyPrice: null, discountPct: 10 })).toBeNull()
  })
})

describe('buildContentPrompt', () => {
  it('passes only facts from the input', () => {
    const prompt = buildContentPrompt(input)
    expect(prompt.user).toContain('וילה בגליל – סוויטה')
    expect(prompt.user).toContain('26.11 עד 28.11 (2 nights)')
    expect(prompt.user).toContain('Price per night: 850₪')
    expect(prompt.user).toContain('15% off (was 1000₪)')
    expect(prompt.system).toContain('Hebrew')
  })

  it('omits price and discount lines when unknown', () => {
    const prompt = buildContentPrompt({ ...input, nightlyPrice: null, discountPct: null, city: null })
    expect(prompt.user).not.toContain('Price')
    expect(prompt.user).not.toContain('Discount')
  })
})

describe('template generator', () => {
  it('produces valid copy with the discounted price', async () => {
    const content = await templateContentGenerator.generate(input)
    expect(campaignContentSchema.parse(content)).toEqual(content)
    expect(content.primaryText).toContain('850₪')
    expect(content.headline).toContain('15%')
  })

  it('works without price or room name', () => {
    const content = buildTemplateContent({ ...input, nightlyPrice: null, discountPct: null, roomName: null })
    expect(content.primaryText).toContain('וילה בגליל פנוי')
    expect(content.primaryText).not.toContain('₪')
  })
})

describe('OpenAI generator', () => {
  it('sends a structured-output request and validates the reply', async () => {
    const fetchImpl = openAiResponse({ choices: [{ message: { content: JSON.stringify(aiCopy) } }] })
    const generator = createOpenAiContentGenerator({ apiKey: 'k', model: 'm', fetchImpl })

    expect(await generator.generate(input)).toEqual(aiCopy)
    const [, init] = vi.mocked(fetchImpl).mock.calls[0]
    const body = JSON.parse(String(init?.body))
    expect(body.model).toBe('m')
    expect(body.response_format.type).toBe('json_schema')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer k' })
  })

  it('rejects copy that breaks the schema', async () => {
    const tooLong = { ...aiCopy, headline: 'x'.repeat(100) }
    const fetchImpl = openAiResponse({ choices: [{ message: { content: JSON.stringify(tooLong) } }] })
    await expect(createOpenAiContentGenerator({ apiKey: 'k', model: 'm', fetchImpl }).generate(input)).rejects.toThrow()
  })

  it('throws on HTTP errors', async () => {
    const fetchImpl = openAiResponse({}, false)
    await expect(createOpenAiContentGenerator({ apiKey: 'k', model: 'm', fetchImpl }).generate(input)).rejects.toThrow(
      /500/,
    )
  })
})

describe('registry', () => {
  it('falls back to the template when the primary generator fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing: ContentGenerator = { id: 'x', generate: async () => Promise.reject(new Error('down')) }
    const content = await withFallback(failing, templateContentGenerator).generate(input)
    expect(content).toEqual(buildTemplateContent(input))
  })

  it('uses the template when no AI key is configured', () => {
    expect(resolveContentGenerator({} as unknown as NodeJS.ProcessEnv).id).toBe('template')
    expect(resolveContentGenerator({ OPENAI_API_KEY: 'k' } as unknown as NodeJS.ProcessEnv).id).toBe(
      'openai:gpt-4o-mini+template',
    )
  })
})
