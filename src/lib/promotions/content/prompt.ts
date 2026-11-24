import { currencySymbol, discountedPrice, formatStayRange, placeName } from './offer'
import type { ContentInput } from './types'

export interface ContentPrompt {
  system: string
  user: string
}

const SYSTEM_PROMPT = [
  'You write short, high-converting Facebook and Instagram ads in Hebrew for vacation rentals (צימרים ווילות) in Israel.',
  'Tone: warm, inviting, urgent but honest. No exaggerated claims, no ALL CAPS, at most two emojis.',
  'Mention the dates and the price when given. Never invent amenities, prices or discounts that are not in the input.',
  'Write date ranges as "26.11 עד 28.11" — never with a dash, which flips order in right-to-left text.',
  'headline: up to 40 characters. primaryText: 2–4 short lines, up to 400 characters. description: up to 30 characters.',
  'hashtags: 3–5 relevant Hebrew or English hashtags without spaces, each starting with #.',
  'callToAction: BOOK_TRAVEL.',
].join('\n')

function offerLines(input: ContentInput): string[] {
  const price = discountedPrice(input)
  const symbol = currencySymbol(input.currency)
  const lines = [
    `Place: ${placeName(input)}`,
    `Dates: ${formatStayRange(input.checkIn, input.checkOut)} (${input.nights} nights)`,
    `Occasion: ${input.trigger === 'weekend' ? 'last-minute free weekend' : 'last-minute free dates'}`,
  ]
  if (input.city) lines.push(`City/area: ${input.city}`)
  if (price !== null) lines.push(`Price per night: ${price}${symbol}`)
  if (input.discountPct) lines.push(`Discount: ${input.discountPct}% off (was ${input.nightlyPrice}${symbol})`)
  return lines
}

export function buildContentPrompt(input: ContentInput): ContentPrompt {
  return { system: SYSTEM_PROMPT, user: offerLines(input).join('\n') }
}
