import { CALENDAR_BOOKING_STATUS_LIST } from '@/lib/dashboard/reservationStatus'

/**
 * Build the Beds24 GET /bookings URL used by the dashboard.
 * Always includes request + inquiry unless the caller already set `status`.
 *
 * Beds24 API V2 accepts only one `status` value per parameter, so we use
 * URLSearchParams.append() to produce ?status=confirmed&status=new&…
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
      // Skip comma-separated status values — append them individually below
      if (key === 'status' && value.includes(',')) return
      url.searchParams.set(key, value)
    })
  } else {
    url.searchParams.set('arrivalFrom', '2024-01-01')
    url.searchParams.set('includeInvoice', 'true')
  }

  // Beds24 V2 requires one `status` param per value — append each individually
  if (!url.searchParams.has('status')) {
    for (const status of CALENDAR_BOOKING_STATUS_LIST) {
      url.searchParams.append('status', status)
    }
  }

  url.searchParams.set('propertyId', opts.propertyId)
  if (opts.roomId) {
    url.searchParams.set('roomId', opts.roomId)
  }

  return url
}
