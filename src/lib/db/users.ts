/**
 * DB repository — users table
 * All Supabase queries for user lookups are centralised here.
 * Route handlers should call these functions instead of querying directly.
 */

import { createServerClient } from '@/lib/supabase/server'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'

export interface OwnerInfo {
  phoneNumber: string | null
  roomName: string | null
}

export interface UserBeds24Tokens {
  accessToken: string | null
  refreshToken: string | null
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
 * Resolve the property owner's phone number and display name.
 * Falls back to OWNER_PHONE_NUMBER env var when no DB match is found.
 */
export async function getOwnerInfoByPropertyRoom(
  propertyId: number | string | undefined,
  roomId: number | string | undefined,
): Promise<OwnerInfo> {
  const envFallback = (): OwnerInfo => ({
    phoneNumber: process.env.OWNER_PHONE_NUMBER?.trim() ?? null,
    roomName: null,
  })

  try {
    const supabase = createServerClient()

    if (!propertyId && !roomId) {
      return envFallback()
    }

    let query = supabase.from('users').select('display_name, phone_number')

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

    if (!data.phone_number?.trim()) {
      return { phoneNumber: null, roomName: data.display_name ?? null }
    }

    return {
      phoneNumber: normalizePhoneNumber(data.phone_number),
      roomName: data.display_name ?? null,
    }
  } catch (err) {
    console.error('getOwnerInfoByPropertyRoom error:', err)
    return envFallback()
  }
}
