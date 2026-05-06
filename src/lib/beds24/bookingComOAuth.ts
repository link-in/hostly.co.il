/**
 * Booking.com Channel Manager connection URL builder
 *
 * Beds24 is a registered Booking.com channel manager (provider_id=299).
 *
 * Unlike Airbnb (where we construct a standard OAuth URL), Booking.com uses
 * a proprietary protobuf-encoded `op_token` that includes PKCE parameters
 * and a server-validated `auth_attempt_id`. This token must be generated
 * server-side by Booking.com or a registered partner — we cannot forge it.
 *
 * Instead, we use the direct channel manager widget URL, which works for
 * users who are already logged into Booking.com (extranet).
 *
 * ⚠️ Limitation: Room mapping on Booking.com CANNOT be done via Beds24 API.
 * After connecting, the user must map rooms manually in:
 * Beds24 → Channels → Booking.com → Map rooms
 * Docs: https://wiki.beds24.com/index.php/Booking.com:_Synchronise_bookings_prices_availability
 */

/** Beds24's registered Booking.com provider ID */
const BEDS24_BOOKING_PROVIDER_ID = '299'

const CHANNEL_MANAGER_WIDGET = [
  'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage',
  '/channel-manager/widget.html',
  `?provider_id=${BEDS24_BOOKING_PROVIDER_ID}`,
  `&origin=https://beds24.com`,
].join('')

/**
 * Returns the Booking.com channel manager URL for connecting to Beds24.
 * The user must be logged into their Booking.com extranet account.
 * If not, the page will prompt for login and then redirect to the widget.
 */
export function buildBookingComConnectUrl(): string {
  // Booking.com's sign-in page supports a `redirect_url` param that works
  // for users not yet logged in. The `op_token` format (protobuf+PKCE) is
  // session-specific and generated server-side — we use the simpler redirect.
  const signInWithRedirect =
    'https://account.booking.com/sign-in?' +
    'lang=en&' +
    'redirect_url=' + encodeURIComponent(CHANNEL_MANAGER_WIDGET)

  return signInWithRedirect
}

/** Direct widget URL (only works when already logged in to Booking.com extranet) */
export function buildBookingComWidgetUrl(): string {
  return CHANNEL_MANAGER_WIDGET
}
