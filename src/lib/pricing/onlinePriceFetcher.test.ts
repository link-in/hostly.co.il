import { describe, it, expect, vi } from 'vitest'
import {
  buildAirbnbUrl,
  buildBookingUrl,
  buildDirectWebsiteUrl,
  buildChannelUrl,
  extractPriceFromHtml,
  detectBotProtection,
  calculatePriceMatch,
  calculateHostlyPrice,
  scanChannelOnlinePrice,
  onlinePriceCheckInputSchema,
} from './onlinePriceFetcher'

describe('onlinePriceFetcher URL builders', () => {
  const params = {
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    numAdult: 2,
    numChild: 1,
  }

  it('builds Airbnb URL from numeric listing ID', () => {
    const url = buildAirbnbUrl('12345678', params)
    expect(url).toContain('https://www.airbnb.co.il/rooms/12345678')
    expect(url).toContain('check_in=2026-07-01')
    expect(url).toContain('check_out=2026-07-05')
    expect(url).toContain('adults=2')
    expect(url).toContain('children=1')
  })

  it('builds Airbnb URL from full URL preserving listing and setting dates', () => {
    const url = buildAirbnbUrl('https://www.airbnb.com/rooms/87654321?foo=bar', params)
    expect(url).toContain('rooms/87654321')
    expect(url).toContain('check_in=2026-07-01')
    expect(url).toContain('adults=2')
  })

  it('builds Booking URL from slug or full URL', () => {
    const url1 = buildBookingUrl('mountain-view-dafna', params)
    expect(url1).toContain('booking.com/hotel/il/mountain-view-dafna.html')
    expect(url1).toContain('checkin=2026-07-01')
    expect(url1).toContain('group_adults=2')
    expect(url1).toContain('group_children=1')

    const url2 = buildBookingUrl('https://www.booking.com/hotel/il/custom-hotel.html', params)
    expect(url2).toContain('checkin=2026-07-01')
  })

  it('builds Direct Website URL correctly', () => {
    const url1 = buildDirectWebsiteUrl('dafna-view', params, 'https://example.com')
    expect(url1).toContain('https://example.com/sites/dafna-view')
    expect(url1).toContain('checkIn=2026-07-01')
    expect(url1).toContain('adults=2')

    const url2 = buildDirectWebsiteUrl('https://mycustomdomain.co.il/book', params)
    expect(url2).toContain('https://mycustomdomain.co.il/book')
    expect(url2).toContain('checkIn=2026-07-01')
  })

  it('returns empty string for empty input', () => {
    expect(buildChannelUrl('airbnb', '', params)).toBe('')
    expect(buildChannelUrl('booking', '   ', params)).toBe('')
    expect(buildChannelUrl('direct', '', params)).toBe('')
  })
})

describe('onlinePriceFetcher HTML price extraction', () => {
  it('extracts price from JSON-LD schema with offers.price', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "LodgingBusiness",
              "name": "Luxury Cabin",
              "offers": {
                "@type": "Offer",
                "price": "1210",
                "priceCurrency": "ILS"
              }
            }
          </script>
        </head>
      </html>
    `
    expect(extractPriceFromHtml(html)).toBe(1210)
  })

  it('extracts price from meta tags (og:price:amount)', () => {
    const html = `
      <html>
        <head>
          <meta property="og:price:amount" content="1,210.00" />
        </head>
      </html>
    `
    expect(extractPriceFromHtml(html)).toBe(1210)
  })

  it('extracts price from data attributes', () => {
    const html = `<div data-price="1210" class="room-card">חדר דלוקס</div>`
    expect(extractPriceFromHtml(html)).toBe(1210)
  })

  it('extracts price from currency regex in HTML text', () => {
    const html = `<div>סה״כ להזמנה: ₪ 1,210 כולל מיסים</div>`
    expect(extractPriceFromHtml(html)).toBe(1210)
  })

  it('returns null when no price is found', () => {
    const html = `<div>ברוכים הבאים לדף ההזמנות ללא מחיר זמין</div>`
    expect(extractPriceFromHtml(html)).toBeNull()
  })
})

describe('onlinePriceFetcher bot detection', () => {
  it('detects 403 and 429 status codes as bot protected', () => {
    expect(detectBotProtection('', 403)).toBe(true)
    expect(detectBotProtection('', 429)).toBe(true)
    expect(detectBotProtection('', 200)).toBe(false)
  })

  it('detects Cloudflare or PerimeterX challenge HTML', () => {
    expect(detectBotProtection('<html>Attention Required! | Cloudflare</html>', 200)).toBe(true)
    expect(detectBotProtection('<html>cf-browser-verification in progress</html>', 200)).toBe(true)
    expect(detectBotProtection('<html>PerimeterX captcha block</html>', 200)).toBe(true)
    expect(detectBotProtection('<div>Normal room details</div>', 200)).toBe(false)
  })
})

describe('onlinePriceFetcher calculations and matching', () => {
  it('calculates Hostly expected prices with 1.21 multiplier for Airbnb & Booking', () => {
    expect(calculateHostlyPrice('airbnb', 1000)).toBe(1210)
    expect(calculateHostlyPrice('booking', 1000)).toBe(1210)
    expect(calculateHostlyPrice('direct', 1000)).toBe(1000)
  })

  it('calculates exact match within ₪2', () => {
    const match1 = calculatePriceMatch(1210, 1210)
    expect(match1.matchStatus).toBe('matched')
    expect(match1.diff).toBe(0)

    const match2 = calculatePriceMatch(1211, 1210)
    expect(match2.matchStatus).toBe('matched')
  })

  it('calculates higher price discrepancy', () => {
    const res = calculatePriceMatch(1300, 1210)
    expect(res.matchStatus).toBe('discrepancy')
    expect(res.diff).toBe(90)
    expect(res.diffPercent).toBe(7)
    expect(res.matchMessage).toContain('גבוה ב-₪90')
  })

  it('calculates lower price discrepancy', () => {
    const res = calculatePriceMatch(1150, 1210)
    expect(res.matchStatus).toBe('discrepancy')
    expect(res.diff).toBe(-60)
    expect(res.matchMessage).toContain('נמוך ב-₪60')
  })

  it('returns unknown when live price is missing', () => {
    const res = calculatePriceMatch(null, 1210)
    expect(res.matchStatus).toBe('unknown')
  })
})

describe('scanChannelOnlinePrice', () => {
  const params = {
    checkIn: '2026-08-01',
    checkOut: '2026-08-03',
    numAdult: 2,
    numChild: 0,
  }

  it('returns no_url status when channel URL is empty', async () => {
    const res = await scanChannelOnlinePrice('airbnb', '', params, 1000)
    expect(res.status).toBe('no_url')
    expect(res.onlinePrice).toBeNull()
    expect(res.hostlyPrice).toBe(1210)
    expect(res.matchStatus).toBe('unknown')
  })

  it('scrapes online price successfully when page contains price', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><meta property="og:price:amount" content="1210" /></html>',
    })

    const res = await scanChannelOnlinePrice(
      'airbnb',
      '12345678',
      params,
      1000,
      { fetchFn: mockFetch as unknown as typeof fetch }
    )

    expect(res.status).toBe('success')
    expect(res.onlinePrice).toBe(1210)
    expect(res.hostlyPrice).toBe(1210)
    expect(res.matchStatus).toBe('matched')
    expect(res.url).toContain('check_in=2026-08-01')
  })

  it('handles bot protection gracefully with fallback message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 403,
      text: async () => '<html>Attention Required! | Cloudflare</html>',
    })

    const res = await scanChannelOnlinePrice(
      'booking',
      'test-hotel',
      params,
      1000,
      { fetchFn: mockFetch as unknown as typeof fetch }
    )

    expect(res.status).toBe('bot_protected')
    expect(res.onlinePrice).toBeNull()
    expect(res.statusMessage).toContain('מערכת מניעת בוטים')
    expect(res.url).toContain('checkin=2026-08-01')
  })

  it('handles network errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection failed'))

    const res = await scanChannelOnlinePrice(
      'direct',
      'my-cabin',
      params,
      1000,
      { fetchFn: mockFetch as unknown as typeof fetch }
    )

    expect(res.status).toBe('error')
    expect(res.statusMessage).toContain('שגיאה בהתחברות')
  })
})

describe('onlinePriceCheckInputSchema validation', () => {
  it('validates correct input with coercion and defaults', () => {
    const parsed = onlinePriceCheckInputSchema.safeParse({
      checkIn: '2026-07-01',
      checkOut: '2026-07-03',
      numAdult: '2',
      basePrice: '1000',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.numAdult).toBe(2)
      expect(parsed.data.numChild).toBe(0)
      expect(parsed.data.basePrice).toBe(1000)
    }
  })

  it('rejects missing dates', () => {
    const parsed = onlinePriceCheckInputSchema.safeParse({
      checkIn: '',
      checkOut: '2026-07-03',
    })
    expect(parsed.success).toBe(false)
  })
})
