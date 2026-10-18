import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { parseCreatedPropertyRoomIds, type Beds24PropertyRoomIds } from '../beds24Response'
import {
  airbnbListingsResponseSchema,
  airbnbUsersResponseSchema,
  multiplePostResponseSchema,
} from '../schemas'

export interface AirbnbUserSummary {
  airbnbUserId: string
  name: string
  picture?: string
}

export interface AirbnbListingSummary {
  airbnbListingId: string
  name: string
  address?: string
  picture?: string
}

export interface AirbnbListingRef {
  airbnbUserId: string
  airbnbListingId: string
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

function nestedRecord(record: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = record[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return {}
}

export function toAirbnbListingSummary(raw: Record<string, unknown>): AirbnbListingSummary | null {
  const listing = { ...raw, ...nestedRecord(raw, ['airbnbListing', 'listing']) }
  const id = firstString(listing, ['airbnbListingId', 'listingId', 'id'])
  if (!id) return null
  const description = nestedRecord(listing, ['publicDescription', 'description'])
  const address = nestedRecord(listing, ['address'])
  return {
    airbnbListingId: id,
    name: firstString(listing, ['name', 'nickname', 'title', 'listingName'])
      ?? firstString(description, ['name', 'summary'])
      ?? `מודעה ${id}`,
    address: firstString(listing, ['address', 'city', 'location', 'neighborhood'])
      ?? firstString(address, ['full', 'formatted', 'city', 'street']),
    picture: firstString(listing, ['picture', 'photo', 'thumbnail', 'listingPicture']),
  }
}

export async function listAirbnbUsers(ctx: OnboardingCallContext): Promise<AirbnbUserSummary[]> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/channels/airbnb/users',
    schema: airbnbUsersResponseSchema,
  })

  return res.data.flatMap((entry) => {
    const user = entry.airbnbUser ?? entry
    const id = user.airbnbUserId ?? user.userId ?? user.id
    if (!id) return []
    return [{ airbnbUserId: id, name: user.firstName ?? id, picture: user.picture }]
  })
}

export async function listAirbnbListings(
  ctx: OnboardingCallContext,
  airbnbUserId: string,
): Promise<AirbnbListingSummary[]> {
  const res = await beds24Request(ctx, {
    method: 'GET',
    path: '/channels/airbnb/listings',
    query: { airbnbUserId },
    schema: airbnbListingsResponseSchema,
  })
  return res.data
    .map((raw) => toAirbnbListingSummary(raw))
    .filter((listing): listing is AirbnbListingSummary => listing !== null)
}

/** Maps an Airbnb listing onto the room created in the property step. */
export async function connectAirbnbListing(
  ctx: OnboardingCallContext,
  listing: AirbnbListingRef,
  roomId: string,
): Promise<void> {
  await beds24Request(ctx, {
    method: 'POST',
    path: '/channels/airbnb',
    body: [{
      action: 'connectToExistingRoom',
      airbnbUserId: listing.airbnbUserId,
      airbnbListingId: listing.airbnbListingId,
      roomId: Number(roomId),
      connect: 'full',
    }],
    schema: multiplePostResponseSchema,
  })
}

/** Lets Beds24 create the property and room from an existing Airbnb listing. */
export async function importAirbnbListing(
  ctx: OnboardingCallContext,
  listing: AirbnbListingRef,
): Promise<Beds24PropertyRoomIds> {
  const res = await beds24Request(ctx, {
    method: 'POST',
    path: '/channels/airbnb',
    body: [{
      action: 'importAsNewProperty',
      airbnbUserId: listing.airbnbUserId,
      airbnbListingId: listing.airbnbListingId,
      connect: 'full',
    }],
    schema: multiplePostResponseSchema,
  })
  return parseCreatedPropertyRoomIds(res)
}

export async function setAirbnbMultiplier(
  ctx: OnboardingCallContext,
  propertyId: string,
  multiplier: number,
): Promise<void> {
  await beds24Request(ctx, {
    method: 'POST',
    path: '/channels/settings',
    body: [{ channel: 'airbnb', properties: [{ id: Number(propertyId), multiplier }] }],
    schema: multiplePostResponseSchema,
  })
}
