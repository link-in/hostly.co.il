import { z } from 'zod'
import { AIRBNB_PRICE_MULTIPLIER, BOOKING_PRICE_MULTIPLIER, DIRECT_PRICE_MULTIPLIER } from './channelPricing'

export interface PriceCheckDateParams {
  checkIn: string
  checkOut: string
  numAdult: number
  numChild: number
}

export type ChannelKey = 'airbnb' | 'booking' | 'direct'

export interface ChannelUrlConfig {
  airbnb?: string
  booking?: string
  direct?: string
}

export const onlinePriceCheckInputSchema = z.object({
  checkIn: z.string().min(1, 'תאריך כניסה נדרש'),
  checkOut: z.string().min(1, 'תאריך יציאה נדרש'),
  numAdult: z.coerce.number().int().min(1, 'נדרש לפחות מבוגר 1').default(2),
  numChild: z.coerce.number().int().min(0).default(0),
  basePrice: z.coerce.number().nonnegative().optional(),
  roomId: z.string().optional(),
  channels: z
    .object({
      airbnb: z.string().optional().default(''),
      booking: z.string().optional().default(''),
      direct: z.string().optional().default(''),
    })
    .optional()
    .default({ airbnb: '', booking: '', direct: '' }),
})

export type OnlinePriceCheckInput = z.infer<typeof onlinePriceCheckInputSchema>

export type OnlineScanStatus = 'success' | 'bot_protected' | 'no_url' | 'not_found' | 'error'
export type PriceMatchStatus = 'matched' | 'discrepancy' | 'unknown'

export interface OnlineChannelPriceResult {
  channelKey: ChannelKey
  name: string
  url: string
  status: OnlineScanStatus
  statusMessage: string
  hostlyPrice: number
  beds24Price: number
  onlinePrice: number | null
  currency: string
  diff: number | null
  diffPercent: number | null
  matchStatus: PriceMatchStatus
  matchMessage: string
  fetchedAt: string
}

export interface OnlinePriceCheckReport {
  checkIn: string
  checkOut: string
  numAdult: number
  numChild: number
  nights: number
  channels: OnlineChannelPriceResult[]
}

/**
 * Builds parameterized URL for Airbnb listing.
 */
export function buildAirbnbUrl(
  listingOrUrl: string,
  params: PriceCheckDateParams,
  fallbackQuery?: string
): string {
  const clean = listingOrUrl.trim()
  if (!clean) {
    if (fallbackQuery?.trim()) {
      try {
        const parsed = new URL(`https://www.airbnb.co.il/s/${encodeURIComponent(fallbackQuery.trim())}/homes`)
        parsed.searchParams.set('check_in', params.checkIn)
        parsed.searchParams.set('check_out', params.checkOut)
        parsed.searchParams.set('adults', String(params.numAdult))
        if (params.numChild > 0) {
          parsed.searchParams.set('children', String(params.numChild))
        }
        return parsed.toString()
      } catch {
        return ''
      }
    }
    return ''
  }

  try {
    const urlStr = clean.startsWith('http://') || clean.startsWith('https://')
      ? clean
      : /^\d+$/.test(clean)
      ? `https://www.airbnb.co.il/rooms/${clean}`
      : `https://www.airbnb.co.il/rooms/${clean.replace(/^[^\d]*/, '')}`

    const parsed = new URL(urlStr)
    parsed.searchParams.set('check_in', params.checkIn)
    parsed.searchParams.set('check_out', params.checkOut)
    parsed.searchParams.set('adults', String(params.numAdult))
    if (params.numChild > 0) {
      parsed.searchParams.set('children', String(params.numChild))
    } else {
      parsed.searchParams.delete('children')
    }
    return parsed.toString()
  } catch {
    return clean
  }
}

/**
 * Builds parameterized URL for Booking.com property.
 */
export function buildBookingUrl(
  hotelOrUrl: string,
  params: PriceCheckDateParams,
  fallbackQuery?: string
): string {
  const clean = hotelOrUrl.trim()
  if (!clean) {
    if (fallbackQuery?.trim()) {
      try {
        const parsed = new URL('https://www.booking.com/searchresults.html')
        parsed.searchParams.set('ss', fallbackQuery.trim())
        parsed.searchParams.set('checkin', params.checkIn)
        parsed.searchParams.set('checkout', params.checkOut)
        parsed.searchParams.set('group_adults', String(params.numAdult))
        if (params.numChild > 0) {
          parsed.searchParams.set('group_children', String(params.numChild))
        }
        return parsed.toString()
      } catch {
        return ''
      }
    }
    return ''
  }

  try {
    const urlStr = clean.startsWith('http://') || clean.startsWith('https://')
      ? clean
      : `https://www.booking.com/hotel/il/${clean.replace(/^\/+/, '')}.html`

    const parsed = new URL(urlStr)
    parsed.searchParams.set('checkin', params.checkIn)
    parsed.searchParams.set('checkout', params.checkOut)
    parsed.searchParams.set('group_adults', String(params.numAdult))
    if (params.numChild > 0) {
      parsed.searchParams.set('group_children', String(params.numChild))
    } else {
      parsed.searchParams.delete('group_children')
    }
    return parsed.toString()
  } catch {
    return clean
  }
}

/**
 * Builds parameterized URL for Direct Website / Hostly site.
 */
export function buildDirectWebsiteUrl(
  siteOrUrl: string,
  params: PriceCheckDateParams,
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hostly.site',
  fallbackSite?: string
): string {
  const clean = (siteOrUrl || fallbackSite || '').trim()
  if (!clean) return ''

  try {
    const urlStr = clean.startsWith('http://') || clean.startsWith('https://')
      ? clean
      : clean.startsWith('/')
      ? `${baseUrl}${clean}`
      : `${baseUrl}/sites/${clean}`

    const parsed = new URL(urlStr)
    parsed.searchParams.set('checkIn', params.checkIn)
    parsed.searchParams.set('checkOut', params.checkOut)
    parsed.searchParams.set('adults', String(params.numAdult))
    if (params.numChild > 0) {
      parsed.searchParams.set('children', String(params.numChild))
    } else {
      parsed.searchParams.delete('children')
    }
    return parsed.toString()
  } catch {
    return clean
  }
}

/**
 * Universal channel URL builder with check-in, check-out, and guest parameters.
 */
export function buildChannelUrl(
  channel: ChannelKey,
  rawInput: string,
  params: PriceCheckDateParams,
  fallbackQuery?: string,
  siteBaseUrl?: string
): string {
  switch (channel) {
    case 'airbnb':
      return buildAirbnbUrl(rawInput, params, fallbackQuery)
    case 'booking':
      return buildBookingUrl(rawInput, params, fallbackQuery)
    case 'direct':
      return buildDirectWebsiteUrl(rawInput, params, siteBaseUrl, fallbackQuery)
  }
}

/**
 * Traverses JSON-LD data to find price fields.
 */
export function findPriceInJsonLd(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findPriceInJsonLd(item)
      if (found !== null) return found
    }
    return null
  }

  const record = data as Record<string, unknown>

  // Direct price fields
  if (record.price !== undefined) {
    const p = parseFloat(String(record.price).replace(/,/g, ''))
    if (!Number.isNaN(p) && p > 0) return p
  }

  if (record.lowPrice !== undefined) {
    const p = parseFloat(String(record.lowPrice).replace(/,/g, ''))
    if (!Number.isNaN(p) && p > 0) return p
  }

  // Nested in offers
  if (record.offers) {
    const found = findPriceInJsonLd(record.offers)
    if (found !== null) return found
  }

  // Nested in priceSpecification
  if (record.priceSpecification) {
    const found = findPriceInJsonLd(record.priceSpecification)
    if (found !== null) return found
  }

  return null
}

/**
 * Checks if HTML or response headers indicate Cloudflare / PerimeterX / bot block.
 */
export function detectBotProtection(html: string, statusCode: number): boolean {
  if (statusCode === 403 || statusCode === 429) return true

  const lower = html.toLowerCase()
  return (
    lower.includes('cf-browser-verification') ||
    lower.includes('attention required! | cloudflare') ||
    lower.includes('checking your browser') ||
    lower.includes('perimeterx') ||
    lower.includes('px-captcha') ||
    lower.includes('challenge-running') ||
    lower.includes('just a moment...') ||
    lower.includes('recaptcha')
  )
}

/**
 * Extracts price from HTML using multiple strategies (JSON-LD, meta tags, data attributes, regex).
 */
export function extractPriceFromHtml(html: string): number | null {
  if (!html) return null

  // 1. JSON-LD Strategy
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      const price = findPriceInJsonLd(parsed)
      if (price !== null && price > 0) return Math.round(price)
    } catch {
      // Continue to next match
    }
  }

  // 2. Meta tags Strategy (og:price:amount, etc.)
  const metaRegexes = [
    /<meta[^>]+(?:property|name)=["']og:price:amount["'][^>]+content=["']([\d.,]+)["']/i,
    /<meta[^>]+content=["']([\d.,]+)["'][^>]+(?:property|name)=["']og:price:amount["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([\d.,]+)["']/i,
    /<meta[^>]+content=["']([\d.,]+)["'][^>]+itemprop=["']price["']/i,
  ]

  for (const regex of metaRegexes) {
    const metaMatch = html.match(regex)
    if (metaMatch?.[1]) {
      const p = parseFloat(metaMatch[1].replace(/,/g, ''))
      if (!Number.isNaN(p) && p > 0) return Math.round(p)
    }
  }

  // 3. Data attributes Strategy (data-price, data-total-price, b_raw_price)
  const dataAttrRegex = /(?:data-price|data-total-price|b_raw_price)=["']([\d.,]+)["']/i
  const dataMatch = html.match(dataAttrRegex)
  if (dataMatch?.[1]) {
    const p = parseFloat(dataMatch[1].replace(/,/g, ''))
    if (!Number.isNaN(p) && p > 0) return Math.round(p)
  }

  // 4. Currency pattern Strategy (₪ 1,234 or 1,234 ₪)
  const ilsPatterns = [
    /(?:₪|ILS)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:₪|ILS)/i,
  ]

  for (const pattern of ilsPatterns) {
    const ilsMatch = html.match(pattern)
    if (ilsMatch?.[1]) {
      const p = parseFloat(ilsMatch[1].replace(/,/g, ''))
      // Only accept plausible accommodation total prices (> 50)
      if (!Number.isNaN(p) && p >= 50) return Math.round(p)
    }
  }

  return null
}

/**
 * Calculate match discrepancy between live online price and expected Hostly price.
 */
export function calculatePriceMatch(
  onlinePrice: number | null,
  hostlyPrice: number
): {
  diff: number | null
  diffPercent: number | null
  matchStatus: PriceMatchStatus
  matchMessage: string
} {
  if (onlinePrice === null || onlinePrice <= 0) {
    return {
      diff: null,
      diffPercent: null,
      matchStatus: 'unknown',
      matchMessage: 'לא נסרק מחיר מהאתר',
    }
  }

  const diff = onlinePrice - hostlyPrice
  const diffPercent = hostlyPrice > 0 ? Math.round((diff / hostlyPrice) * 100) : 0
  const isMatch = Math.abs(diff) <= 2 // Allow up to ₪2 difference for rounding

  if (isMatch) {
    return {
      diff: 0,
      diffPercent: 0,
      matchStatus: 'matched',
      matchMessage: 'תואם במדויק',
    }
  }

  const sign = diff > 0 ? '+' : ''
  const message = diff > 0
    ? `גבוה ב-₪${diff.toLocaleString()} (${sign}${diffPercent}%)`
    : `נמוך ב-₪${Math.abs(diff).toLocaleString()} (${diffPercent}%)`

  return {
    diff,
    diffPercent,
    matchStatus: 'discrepancy',
    matchMessage: message,
  }
}

/**
 * Calculates Hostly expected price according to channel commission logic.
 * - Airbnb: 1.21 multiplier
 * - Booking.com: 1.21 multiplier
 * - Direct: 1.00 multiplier
 */
export function calculateHostlyPrice(channel: ChannelKey, basePrice: number): number {
  const safeBase = Math.max(0, Number(basePrice) || 0)
  switch (channel) {
    case 'airbnb':
      return Math.round(safeBase * AIRBNB_PRICE_MULTIPLIER)
    case 'booking':
      return Math.round(safeBase * BOOKING_PRICE_MULTIPLIER)
    case 'direct':
      return Math.round(safeBase * DIRECT_PRICE_MULTIPLIER)
  }
}

export const CHANNEL_META: Record<
  ChannelKey,
  { name: string; multiplier: number; defaultNote: string }
> = {
  airbnb: {
    name: 'Airbnb',
    multiplier: AIRBNB_PRICE_MULTIPLIER,
    defaultNote: 'מכפיל 1.21 (15% עמלה + הוצאות סליקה)',
  },
  booking: {
    name: 'Booking.com',
    multiplier: BOOKING_PRICE_MULTIPLIER,
    defaultNote: 'מכפיל 1.21 (15% עמלה + מע״מ)',
  },
  direct: {
    name: 'אתר הזמנות ישיר',
    multiplier: DIRECT_PRICE_MULTIPLIER,
    defaultNote: 'מחיר בסיס ללא עמלות תיווך',
  },
}

export interface FetchOnlinePriceOptions {
  fetchFn?: typeof fetch
  timeoutMs?: number
  fallbackQuery?: string
  siteBaseUrl?: string
}

/**
 * Core function that surfs to the channel URL with parameters and extracts the online price.
 */
export async function scanChannelOnlinePrice(
  channel: ChannelKey,
  rawUrlOrId: string,
  params: PriceCheckDateParams,
  basePrice: number,
  options: FetchOnlinePriceOptions = {}
): Promise<OnlineChannelPriceResult> {
  const { fetchFn = fetch, timeoutMs = 6000, fallbackQuery, siteBaseUrl } = options
  const meta = CHANNEL_META[channel]
  const hostlyPrice = calculateHostlyPrice(channel, basePrice)
  const beds24Price = hostlyPrice // Beds24 syncs hostly-configured rate
  const now = new Date().toISOString()

  const parameterizedUrl = buildChannelUrl(channel, rawUrlOrId, params, fallbackQuery, siteBaseUrl)

  if (!parameterizedUrl) {
    return {
      channelKey: channel,
      name: meta.name,
      url: '',
      status: 'no_url',
      statusMessage: 'לא הוגדר קישור לנכס בערוץ זה',
      hostlyPrice,
      beds24Price,
      onlinePrice: null,
      currency: 'ILS',
      diff: null,
      diffPercent: null,
      matchStatus: 'unknown',
      matchMessage: 'לא הוגדר קישור',
      fetchedAt: now,
    }
  }

  // If this is a search query fallback rather than a direct listing ID
  if (!rawUrlOrId.trim() && fallbackQuery) {
    return {
      channelKey: channel,
      name: meta.name,
      url: parameterizedUrl,
      status: 'not_found',
      statusMessage: `חיפוש לפי שם הנכס "${fallbackQuery}". לחץ על "גלוש לאתר" לאיתור המודעה.`,
      hostlyPrice,
      beds24Price,
      onlinePrice: null,
      currency: 'ILS',
      diff: null,
      diffPercent: null,
      matchStatus: 'unknown',
      matchMessage: 'חיפוש לפי שם נכס',
      fetchedAt: now,
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetchFn(parameterizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    const html = await response.text()

    if (detectBotProtection(html, response.status)) {
      return {
        channelKey: channel,
        name: meta.name,
        url: parameterizedUrl,
        status: 'bot_protected',
        statusMessage:
          'האתר מוגן במערכת מניעת בוטים (Cloudflare / WAF). לחץ על "גלוש לאתר" לצפייה ישירה עם הפרמטרים.',
        hostlyPrice,
        beds24Price,
        onlinePrice: null,
        currency: 'ILS',
        diff: null,
        diffPercent: null,
        matchStatus: 'unknown',
        matchMessage: 'מוגן בוטים - גלוש לבדיקה',
        fetchedAt: now,
      }
    }

    const price = extractPriceFromHtml(html)

    if (price !== null && price > 0) {
      const match = calculatePriceMatch(price, hostlyPrice)
      return {
        channelKey: channel,
        name: meta.name,
        url: parameterizedUrl,
        status: 'success',
        statusMessage: 'המחיר נסרק בהצלחה מאתר ההזמנות',
        hostlyPrice,
        beds24Price,
        onlinePrice: price,
        currency: 'ILS',
        diff: match.diff,
        diffPercent: match.diffPercent,
        matchStatus: match.matchStatus,
        matchMessage: match.matchMessage,
        fetchedAt: now,
      }
    }

    return {
      channelKey: channel,
      name: meta.name,
      url: parameterizedUrl,
      status: 'not_found',
      statusMessage: 'לא אותר מחיר בדף היעד (יתכן שהיחידה תפוסה או דורשת בחירת חדר)',
      hostlyPrice,
      beds24Price,
      onlinePrice: null,
      currency: 'ILS',
      diff: null,
      diffPercent: null,
      matchStatus: 'unknown',
      matchMessage: 'מחיר לא זוהה בדף',
      fetchedAt: now,
    }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return {
      channelKey: channel,
      name: meta.name,
      url: parameterizedUrl,
      status: 'error',
      statusMessage: isAbort
        ? 'תם הזמן המוקצב לסריקה (Timeout)'
        : 'שגיאה בהתחברות לאתר היעד',
      hostlyPrice,
      beds24Price,
      onlinePrice: null,
      currency: 'ILS',
      diff: null,
      diffPercent: null,
      matchStatus: 'unknown',
      matchMessage: 'שגיאת התחברות',
      fetchedAt: now,
    }
  }
}
