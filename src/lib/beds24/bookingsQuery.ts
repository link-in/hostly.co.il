import { CALENDAR_BOOKING_STATUSES } from '@/lib/dashboard/reservationStatus'

/**
 * Build the Beds24 GET /bookings URL used by the dashboard.
 * Always includes request + inquiry unless the caller already set `status`.
 */
export function buildBookingsListUrl(
  baseUrl: string,
  opts: {
    propertyId: string
    roomId?: string | null
    extraQuery?: string
  },
): URL {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/bookings`)

  if (opts.extraQuery) {
    const params = new URLSearchParams(opts.extraQuery)
    params.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  } else {
    url.searchParams.set('arrivalFrom', '2024-01-01')
    url.searchParams.set('includeInvoice', 'true')
  }

  if (!url.searchParams.has('status')) {
    url.searchParams.set('status', CALENDAR_BOOKING_STATUSES)
  }

  url.searchParams.set('propertyId', opts.propertyId)
  if (opts.roomId) {
    url.searchParams.set('roomId', opts.roomId)
  }

  return url
}
