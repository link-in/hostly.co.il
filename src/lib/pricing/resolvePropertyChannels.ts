import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import type { ChannelUrlConfig } from './onlinePriceFetcher'

const DEFAULT_BASE_URL = '[REDACTED]'
const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

export interface ResolvedPropertyChannels {
  urls: ChannelUrlConfig
  propertyName: string
  isAutoDetected: {
    airbnb: boolean
    booking: boolean
    direct: boolean
  }
}

export interface ResolveOptions {
  userId?: string
  propertyId?: string
  roomId?: string
  userTokens?: { accessToken: string; refreshToken: string }
  isDemo?: boolean
}

/**
 * Automatically discovers channel IDs / URLs for a property from:
 * 1. Saved custom channel URLs in user's profile (`onboarding_state.channelUrls`)
 * 2. Beds24 channel settings API (`GET /channels/settings?propertyId=...&channel=airbnb`)
 * 3. Supabase `landing_pages` table (`subdomain`)
 * 4. User's `landing_page_url` and `display_name`
 * 5. Beds24 `GET /properties` name, used as the OTA search query when no listing is known
 */
export async function resolvePropertyChannels(
  options: ResolveOptions
): Promise<ResolvedPropertyChannels> {
  const { userId, propertyId, roomId, userTokens, isDemo } = options

  const resolvedUrls: ChannelUrlConfig = {
    airbnb: '',
    booking: '',
    direct: '',
  }

  const isAutoDetected = {
    airbnb: false,
    booking: false,
    direct: false,
  }

  let propertyName = ''
  let searchName = ''

  // 1. If demo mode, provide realistic mock identifiers
  if (isDemo) {
    return {
      urls: {
        airbnb: '10000001',
        booking: 'demo-suites',
        direct: 'demo-property',
      },
      propertyName: 'נוף הרים בדפנה (דמו)',
      isAutoDetected: {
        airbnb: true,
        booking: true,
        direct: true,
      },
    }
  }

  // 2. Fetch user information from Supabase
  if (userId) {
    try {
      const supabase = createServiceRoleClient()
      const { data: userRow } = await supabase
        .from('users')
        .select('display_name, landing_page_url, onboarding_state')
        .eq('id', userId)
        .maybeSingle()

      if (userRow) {
        propertyName = String(userRow.display_name || '').trim()

        const onboardingState = (userRow.onboarding_state as Record<string, unknown>) || {}
        const savedChannelUrls = (onboardingState.channelUrls as Record<string, ChannelUrlConfig>) || {}
        const roomSaved = roomId && savedChannelUrls[roomId] ? savedChannelUrls[roomId] : savedChannelUrls['default']

        if (roomSaved) {
          if (roomSaved.airbnb?.trim()) resolvedUrls.airbnb = roomSaved.airbnb.trim()
          if (roomSaved.booking?.trim()) resolvedUrls.booking = roomSaved.booking.trim()
          if (roomSaved.direct?.trim()) resolvedUrls.direct = roomSaved.direct.trim()
        }

        // Onboarding step fallbacks
        const steps = (onboardingState.steps as Record<string, { data?: Record<string, unknown> }>) || {}
        if (!resolvedUrls.airbnb && steps.airbnbConnect?.data?.airbnbListingId) {
          resolvedUrls.airbnb = String(steps.airbnbConnect.data.airbnbListingId)
          isAutoDetected.airbnb = true
        }

        if (!resolvedUrls.booking && steps.bookingCom?.data?.hotelId) {
          resolvedUrls.booking = String(steps.bookingCom.data.hotelId)
          isAutoDetected.booking = true
        }

        // User landing page URL fallback
        if (!resolvedUrls.direct && userRow.landing_page_url) {
          resolvedUrls.direct = String(userRow.landing_page_url)
          isAutoDetected.direct = true
        }
      }

      // 3. Check published site in landing_pages table
      if (!resolvedUrls.direct) {
        const { data: landingPage } = await supabase
          .from('landing_pages')
          .select('subdomain')
          .eq('user_id', userId)
          .maybeSingle()

        if (landingPage?.subdomain) {
          resolvedUrls.direct = landingPage.subdomain
          isAutoDetected.direct = true
        }
      }
    } catch (err) {
      console.warn('⚠️ [resolvePropertyChannels] DB resolution error:', err)
    }
  }

  if (propertyId) {
    // Sequential so an expired token is refreshed once, not by two concurrent calls.
    const listingId = resolvedUrls.airbnb ? null : await fetchAirbnbListingId(propertyId, roomId, userTokens, userId)
    const beds24Name = await fetchBeds24PropertyName(propertyId, userTokens, userId)
    if (listingId) {
      resolvedUrls.airbnb = listingId
      isAutoDetected.airbnb = true
    }
    // Beds24 holds the name the OTAs publish (often English); the dashboard display name is usually Hebrew.
    if (beds24Name) searchName = beds24Name
  }

  return {
    urls: resolvedUrls,
    propertyName: searchName || propertyName || 'Hostly Property',
    isAutoDetected,
  }
}

type Beds24Tokens = ResolveOptions['userTokens']

async function fetchAirbnbListingId(
  propertyId: string,
  roomId: string | undefined,
  userTokens: Beds24Tokens,
  userId: string | undefined
): Promise<string | null> {
  try {
    const settingsUrl = new URL(`${getBaseUrl()}/channels/settings`)
    settingsUrl.searchParams.set('propertyId', propertyId)
    settingsUrl.searchParams.set('channel', 'airbnb')

    const response = await fetchWithTokenRefresh(settingsUrl.toString(), {}, userTokens, userId)
    if (!response.ok) return null

    const json = await response.json()
    const data = Array.isArray(json?.data) ? json.data : []
    const airbnbSetting = data.find((e: any) => !e.channel || e.channel === 'airbnb')
    const prop = airbnbSetting?.properties?.find((p: any) => String(p.id) === String(propertyId))
    const rooms = prop?.roomTypes || []
    const targetRoom = roomId ? rooms.find((r: any) => String(r.id) === String(roomId)) : rooms[0]
    const listingId = targetRoom?.airbnbListingId || rooms[0]?.airbnbListingId
    return listingId ? String(listingId) : null
  } catch (err) {
    console.warn('⚠️ [resolvePropertyChannels] Beds24 channel settings fetch error:', err)
    return null
  }
}

async function fetchBeds24PropertyName(
  propertyId: string,
  userTokens: Beds24Tokens,
  userId: string | undefined
): Promise<string> {
  try {
    const url = new URL(`${getBaseUrl()}/properties`)
    url.searchParams.set('id', propertyId)
    const response = await fetchWithTokenRefresh(url.toString(), {}, userTokens, userId)
    if (!response.ok) return ''
    const json = await response.json()
    const name = Array.isArray(json?.data) ? json.data[0]?.name : ''
    return typeof name === 'string' ? name.trim() : ''
  } catch (err) {
    console.warn('⚠️ [resolvePropertyChannels] Beds24 property name fetch error:', err)
    return ''
  }
}
