import { beds24Request, type OnboardingCallContext } from '../beds24Client'
import { extractCreatedIds, type Beds24PropertyRoomIds } from '../beds24Response'
import { Beds24RequestError } from '../errors'
import { findNewProperty, listPropertyRooms } from './property'
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

/**
 * Lets Beds24 create the property and room from an existing Airbnb listing.
 * The import response shape is not documented, so when it carries no IDs the new
 * property is found by diffing the account's properties before and after the import.
 */
export async function importAirbnbListing(
  ctx: OnboardingCallContext,
  listing: AirbnbListingRef,
): Promise<Beds24PropertyRoomIds> {
  const before = await listPropertyRooms(ctx)
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

  const fromResponse = extractCreatedIds(res)
  if (fromResponse.propertyId && fromResponse.roomId) {
    return { propertyId: fromResponse.propertyId, roomId: fromResponse.roomId }
  }

  console.warn('[onboarding] importAsNewProperty response had no IDs:', JSON.stringify(res))
  const found = findNewProperty(before, await listPropertyRooms(ctx))
  if (!found) {
    throw new Beds24RequestError(
      'הייבוא נשלח ל-Beds24 אבל לא זוהה הנכס החדש. ייתכן שהנכס כבר נוצר – בדוק ב-Beds24 לפני ניסיון חוזר',
      res,
    )
  }
  return found
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
