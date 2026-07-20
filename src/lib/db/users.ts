/**
 * DB repository — users table
 * All Supabase queries for user lookups are centralised here.
 * Route handlers should call these functions instead of querying directly.
 */

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOwnerPhoneList } from '@/lib/notifications/ownerPhones'

export interface OwnerInfo {
  /** Primary owner phone (kept for backward compatibility / guest-facing display). */
  phoneNumber: string | null
  /** Every phone number that should receive owner-facing system notifications (primary + optional secondary). */
  phoneNumbers: string[]
  roomName: string | null
}

export interface UserBeds24Tokens {
  accessToken: string | null
  refreshToken: string | null
}

/** A host with enough Beds24 credentials configured to be queried by scheduled jobs (e.g. the review-reminders cron). */
export interface UserWithBeds24Access {
  id: string
  propertyId: string
  displayName: string | null
  googleReviewUrl: string | null
  beds24Token: string
  beds24RefreshToken: string
}

/** Find a user's UUID given the Beds24 propertyId + roomId from a booking. */
export async function getUserIdByPropertyRoom(
  propertyId: number | string,
  roomId: number | string,
): Promise<string | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('property_id', String(propertyId))
      .eq('room_id', String(roomId))
      .single()

    if (error || !data) {
      console.warn(`⚠️ No user found for property ${propertyId}, room ${roomId}`)
      return null
    }

    return data.id
  } catch (err) {
    console.error('getUserIdByPropertyRoom error:', err)
    return null
  }
}

/** Fetch a specific user's own Beds24 tokens (multi-tenant — never use env tokens for this). */
export async function getUserBeds24Tokens(userId: string): Promise<UserBeds24Tokens> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('beds24_token, beds24_refresh_token')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.warn(`⚠️ No Beds24 tokens found for user ${userId}`)
      return { accessToken: null, refreshToken: null }
    }

    return {
      accessToken: data.beds24_token ?? null,
      refreshToken: data.beds24_refresh_token ?? null,
    }
  } catch (err) {
    console.error('getUserBeds24Tokens error:', err)
    return { accessToken: null, refreshToken: null }
  }
}

/**
 * List every host that has a `property_id` and a Beds24 access token configured —
 * the set of tenants scheduled jobs (like the review-reminders cron) should iterate over.
 * `beds24_refresh_token` is NOT required here: many hosts only have a long-lived access
 * token and no refresh token, same as every other Beds24 call site in this app
 * (see `fetchWithTokenRefresh`, which falls back to the global env tokens when a
 * user has no refresh token of their own).
 * Uses the service-role client since this runs from an unauthenticated cron context.
 */
export async function getUsersWithBeds24Access(): Promise<UserWithBeds24Access[]> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, property_id, display_name, google_review_url, beds24_token, beds24_refresh_token')
      .not('property_id', 'is', null)
      .neq('property_id', '')
      .not('beds24_token', 'is', null)

    if (error || !data) {
      console.error('getUsersWithBeds24Access error:', error)
      return []
    }

    return data
      .filter((row) => row.beds24_token && row.property_id)
      .map((row) => ({
        id: row.id,
        propertyId: String(row.property_id),
        displayName: row.display_name ?? null,
        googleReviewUrl: row.google_review_url ?? null,
        beds24Token: row.beds24_token as string,
        beds24RefreshToken: (row.beds24_refresh_token as string) ?? '',
      }))
  } catch (err) {
    console.error('getUsersWithBeds24Access error:', err)
    return []
  }
}

/**
 * Resolve the property owner's phone number and display name.
 * Falls back to OWNER_PHONE_NUMBER env var when no DB match is found.
 */
export async function getOwnerInfoByPropertyRoom(
  propertyId: number | string | undefined,
  roomId: number | string | undefined,
): Promise<OwnerInfo> {
  const envFallback = (): OwnerInfo => {
    const phoneNumbers = buildOwnerPhoneList(process.env.OWNER_PHONE_NUMBER)
    return {
      phoneNumber: phoneNumbers[0] ?? null,
      phoneNumbers,
      roomName: null,
    }
  }

  try {
    const supabase = createServerClient()

    if (!propertyId && !roomId) {
      return envFallback()
    }

    let query = supabase.from('users').select('display_name, phone_number, secondary_phone_number')

    if (propertyId) {
      query = query.eq('property_id', String(propertyId))
    } else {
      query = query.eq('room_id', String(roomId))
    }

    const { data, error } = await query.single()

    if (error || !data) {
      console.warn('⚠️ Owner not found in DB, using env fallback')
      return envFallback()
    }

    const phoneNumbers = buildOwnerPhoneList(data.phone_number, data.secondary_phone_number)

    return {
      phoneNumber: phoneNumbers[0] ?? null,
      phoneNumbers,
      roomName: data.display_name ?? null,
    }
  } catch (err) {
    console.error('getOwnerInfoByPropertyRoom error:', err)
    return envFallback()
  }
}
