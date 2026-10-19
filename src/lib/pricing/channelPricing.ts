/**
 * Hostly — Channel Pricing Calculations
 *
 * Domain Rules:
 * - Airbnb: 1.21 multiplier (covers 15% host commission + payment fees)
 * - Booking.com: 1.21 multiplier (covers 15% commission + VAT + processing)
 * - Direct: 1.00 multiplier (no channel commission)
 */

export interface ChannelPriceInfo {
  channelKey: 'airbnb' | 'booking' | 'direct'
  name: string
  price: number
  multiplier: number
  markupPercent: number
  logoUrl?: string
  note: string
}

export const AIRBNB_PRICE_MULTIPLIER = 1.21
export const BOOKING_PRICE_MULTIPLIER = 1.21
export const DIRECT_PRICE_MULTIPLIER = 1.0

export function calculateChannelPrices(basePrice: number): ChannelPriceInfo[] {
  const safeBase = Math.max(0, Number(basePrice) || 0)

  return [
    {
      channelKey: 'airbnb',
      name: 'Airbnb',
      multiplier: AIRBNB_PRICE_MULTIPLIER,
      markupPercent: Math.round((AIRBNB_PRICE_MULTIPLIER - 1) * 100),
      price: Math.round(safeBase * AIRBNB_PRICE_MULTIPLIER),
      logoUrl: '/airbnb-logo.png',
      note: 'מכפיל 1.21 לכיסוי 15% עמלה ועמלות נלוות',
    },
    {
      channelKey: 'booking',
      name: 'Booking.com',
      multiplier: BOOKING_PRICE_MULTIPLIER,
      markupPercent: Math.round((BOOKING_PRICE_MULTIPLIER - 1) * 100),
      price: Math.round(safeBase * BOOKING_PRICE_MULTIPLIER),
      logoUrl: '/booking-logo.png',
      note: 'מכפיל 1.21 לכיסוי עמלת ערוץ ומע״מ',
    },
    {
      channelKey: 'direct',
      name: 'הזמנה ישירה',
      multiplier: DIRECT_PRICE_MULTIPLIER,
      markupPercent: 0,
      price: Math.round(safeBase * DIRECT_PRICE_MULTIPLIER),
      note: 'מחיר בסיס ללא עמלת תיווך',
    },
  ]
}
