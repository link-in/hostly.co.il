import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { accountsResponseSchema, channelSettingsResponseSchema, type ChannelSettingsResponse } from '../schemas'

export interface AirbnbRoomStatus {
  connected: boolean
  airbnbListingId: string | null
  multiplier: number | null
}

export interface AccountChannelLinks {
  airbnb: number
  booking: number
}

export function readAirbnbRoomStatus(
  settings: ChannelSettingsResponse,
  propertyId: string,
  roomId: string,
): AirbnbRoomStatus {
  const airbnb = settings.data.find((entry) => !entry.channel || entry.channel === 'airbnb')
  const property = airbnb?.properties.find((p) => p.id === propertyId)
  const room = property?.roomTypes.find((r) => r.id === roomId)
  const listingId = room?.airbnbListingId ?? null

  return {
    connected: !!listingId && room?.enabled !== false,
    airbnbListingId: listingId,
    multiplier: property?.multiplier ?? null,
  }
}

export async function getAirbnbRoomStatus(
  ctx: OnboardingCallContext,
  propertyId: string,
  roomId: string,
): Promise<AirbnbRoomStatus> {
  const settings = await beds24Request(ctx, {
    method: 'GET',
    path: '/channels/settings',
    query: { propertyId, channel: 'airbnb' },
    schema: channelSettingsResponseSchema,
  })
  return readAirbnbRoomStatus(settings, propertyId, roomId)
}

/** Account-wide active link counts (Beds24 has no per-property Booking.com status endpoint). */
export async function getAccountChannelLinks(ctx: OnboardingCallContext): Promise<AccountChannelLinks> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/accounts',
    query: { includeUsage: true },
    schema: accountsResponseSchema,
  })
  const links = res.data[0]?.usage?.channelLinks ?? {}
  return { airbnb: links.airbnb ?? 0, booking: links.booking ?? 0 }
}
