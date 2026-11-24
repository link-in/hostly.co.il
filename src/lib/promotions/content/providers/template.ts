import type { CampaignContent } from '../../domain/types'
import { currencySymbol, discountedPrice, formatStayRange, placeName } from '../offer'
import type { ContentGenerator, ContentInput } from '../types'

function headline(input: ContentInput): string {
  if (input.discountPct) return `${input.discountPct}% הנחה ל${input.trigger === 'weekend' ? 'סופ״ש' : 'תאריכים'} הקרוב`
  return input.trigger === 'weekend' ? 'התפנה סופ״ש! מקום אחרון' : 'התפנו תאריכים! מקום אחרון'
}

function priceLine(input: ContentInput): string | null {
  const price = discountedPrice(input)
  return price === null ? null : `רק ${price}${currencySymbol(input.currency)} ללילה`
}

export function buildTemplateContent(input: ContentInput): CampaignContent {
  const lines = [
    `${placeName(input)} פנוי בין ${formatStayRange(input.checkIn, input.checkOut)}.`,
    priceLine(input),
    'הזמינו עכשיו ישירות באתר – בלי עמלות.',
  ].filter((line): line is string => line !== null)

  return {
    headline: headline(input),
    primaryText: lines.join('\n'),
    description: 'הזמנה ישירה',
    callToAction: 'BOOK_TRAVEL',
    hashtags: ['#צימר', '#חופשה', '#סופש'],
  }
}

/** Deterministic copy. Used when no AI provider is configured or the AI call fails. */
export const templateContentGenerator: ContentGenerator = {
  id: 'template',
  async generate(input) {
    return buildTemplateContent(input)
  },
}
