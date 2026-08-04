/**
 * Builds a deep-link into the OTA host dashboard for a channel booking,
 * when we have a channel-specific reference (Beds24 `apiReference` / `reference`).
 * Returns null when we cannot build a reliable specific URL.
 */
export function buildChannelBookingUrl(
  source: string | undefined | null,
  apiReference: string | undefined | null,
): string | null {
  const ref = apiReference?.trim()
  if (!ref) return null

  const channel = (source || '').toLowerCase()

  if (channel.includes('airbnb')) {
    // Host reservation / request details page (requires host login).
    // Confirmation codes are typically like HMXXXXXXXX.
    return `https://www.airbnb.com/hosting/reservations/details/${encodeURIComponent(ref)}`
  }

  if (channel.includes('booking')) {
    // Booking.com extranet reservation page — works when res_id is known.
    // hotel_id is optional in some sessions; hosts are usually already logged in.
    if (!/^\d+$/.test(ref)) return null
    return `https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html?res_id=${encodeURIComponent(ref)}`
  }

  return null
}

export function channelLinkLabel(source: string | undefined | null): string {
  const channel = (source || '').toLowerCase()
  if (channel.includes('airbnb')) return 'פתח באיירבנב'
  if (channel.includes('booking')) return 'פתח ב-Booking.com'
  return 'פתח במקור ההזמנה'
}
