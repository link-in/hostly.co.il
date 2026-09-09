/**
 * Colors and helpers for channel icons in the reservations list.
 *
 * Airbnb / Booking.com render brand logos. Every other source uses a lucide
 * fallback (Globe for Direct, Map/Plane/etc. for other OTAs). Those fallbacks
 * must share one muted color so Direct bookings are not highlighted in brand
 * purple while neighboring rows stay neutral.
 */

export const RESERVATION_PLATFORM_ICON_COLOR = '#5B6670'
export const RESERVATION_ACTION_ICON_COLOR = '#7133D9'

export function usesChannelLogo(source: string | null | undefined): boolean {
  const sourceLower = (source || '').toLowerCase()
  return sourceLower.includes('airbnb') || sourceLower.includes('booking')
}

/** Lucide fallback color for a reservation source. Logo channels ignore this. */
export function getPlatformFallbackIconColor(_source: string | null | undefined): string {
  return RESERVATION_PLATFORM_ICON_COLOR
}
