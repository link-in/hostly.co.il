/**
 * Beds24 Airbnb OAuth URL builder
 *
 * Beds24 is a registered Airbnb API Partner.
 * These parameters are Beds24's own OAuth app credentials — they are
 * stable and the same for all Beds24 accounts worldwide.
 *
 * When a user completes the OAuth flow, Airbnb redirects to
 * Beds24's callback (push.php), which stores the Airbnb tokens
 * under the master Beds24 account. The propertyId association is
 * done separately via POST /channels/airbnb { action: "connectToExistingRoom" }.
 *
 * This approach bypasses the "channel not enabled" error that occurs
 * when calling GET /inventory/channels/airbnb/authorization via the API.
 */

const BEDS24_AIRBNB_CLIENT_ID = '6gsna623mfeic93fod1fcqlr'
const BEDS24_AIRBNB_REDIRECT_URI = 'https://api.beds24.com/airbnb.com/push.php'
const BEDS24_AIRBNB_SCOPES = [
  'property_management',
  'reservations_web_hooks',
  'messages_read',
  'messages_write',
].join(',')

// After OAuth, Airbnb redirects to Beds24's push.php which processes the token.
// push.php then redirects the user to the URL encoded in the state parameter.
// We redirect to our own success page — Beds24 still stores the token before redirecting.
function buildState(): string {
  const successUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/airbnb-success`
    : 'https://app.hostly.co.il/airbnb-success'
  // Beds24 uses "s://" as a prefix meaning "redirect to https://"
  return `s://${successUrl.replace(/^https?:\/\//, '')}`
}

/**
 * Builds the Airbnb OAuth URL that connects a user's Airbnb account to Beds24.
 * The propertyId is passed for logging/reference but does not need to be in the URL —
 * the actual room mapping is done afterwards via POST /channels/airbnb.
 */
export function buildAirbnbOAuthUrl(_propertyId?: string): string {
  const params = new URLSearchParams({
    client_id: BEDS24_AIRBNB_CLIENT_ID,
    redirect_uri: BEDS24_AIRBNB_REDIRECT_URI,
    scope: BEDS24_AIRBNB_SCOPES,
    state: buildState(),
  })

  return `https://www.airbnb.com/oauth2/auth?${params.toString()}`
}
