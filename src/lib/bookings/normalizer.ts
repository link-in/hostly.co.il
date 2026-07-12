/**
 * Pure helper functions for Beds24 booking payloads.
 * No HTTP, no DB, no side-effects — fully unit-testable.
 */

/** Sum all invoice item amounts from a Beds24 invoice array. */
export function extractInvoiceTotal(items: unknown[]): number {
  return items.reduce<number>((sum, entry) => {
    if (!entry || typeof entry !== 'object') return sum
    const e = entry as Record<string, unknown>
    const amount =
      (typeof e.amount === 'number' && e.amount) ||
      (typeof e.amount === 'string' && Number.parseFloat(e.amount)) ||
      (typeof e.total === 'number' && e.total) ||
      (typeof e.total === 'string' && Number.parseFloat(e.total)) ||
      0
    return Number.isFinite(amount as number) ? sum + (amount as number) : sum
  }, 0)
}

/** Canonical booking source/channel label, shared across the codebase. */
export type BookingSource = 'airbnb' | 'booking.com' | 'direct' | 'other'

/** Map Beds24 apiSource field to a canonical booking source label. */
export function parseBookingSource(apiSource: unknown): BookingSource {
  const src = String(apiSource ?? '').toLowerCase()
  if (src.includes('airbnb')) return 'airbnb'
  if (src.includes('booking')) return 'booking.com'
  return 'other'
}

/** Extract the booking ID from a Beds24 POST /bookings response. */
export function extractBookingId(beds24Response: unknown): string {
  if (Array.isArray(beds24Response)) {
    const first = beds24Response[0]
    if (first?.new?.id) return String(first.new.id)
    if (first?.bookingId) return String(first.bookingId)
  }
  return 'N/A'
}

/** Normalise a raw booking item into the shape Beds24 POST /bookings expects. */
export function normalizeBookingItem(
  item: Record<string, unknown>,
  propertyId: string | number,
  roomId: string | number,
): Record<string, unknown> {
  const invoiceItems = Array.isArray(item.invoice) ? item.invoice : []
  const explicitPrice =
    (typeof item.price === 'number' && item.price) ||
    (typeof item.price === 'string' && Number.parseFloat(item.price)) ||
    0
  const price = explicitPrice || extractInvoiceTotal(invoiceItems)

  const booking: Record<string, unknown> = {
    propertyId: Number(propertyId),
    roomId: Number(roomId),
    arrival: item.arrival,
    departure: item.departure,
    firstName: item.firstName,
    lastName: item.lastName,
    status: item.status ?? 'confirmed',
    invoice: invoiceItems,
    ...(price ? { price } : {}),
  }

  for (const key of ['mobile', 'phone', 'email', 'numAdult', 'numChild', 'address', 'city', 'postcode', 'country'] as const) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      booking[key] = item[key]
    }
  }
  // notes is always included even when empty
  if (item.notes !== undefined) {
    booking.notes = item.notes || ''
  }

  return booking
}

/** Returns true if the booking status should be processed (not cancelled/pending). */
export function isConfirmedBookingStatus(status: string): boolean {
  const valid = ['confirmed', 'new', '1']
  return valid.includes(status.toLowerCase()) || status === '1'
}

/** Extract user-specific Beds24 tokens from a session object, or undefined for global tokens. */
export function extractUserTokens(
  session: { user?: { beds24Token?: string; beds24RefreshToken?: string } } | null,
): { accessToken: string; refreshToken: string } | undefined {
  if (session?.user?.beds24Token && session?.user?.beds24RefreshToken) {
    return {
      accessToken: session.user.beds24Token,
      refreshToken: session.user.beds24RefreshToken,
    }
  }
  return undefined
}
