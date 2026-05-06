import bcrypt from 'bcryptjs'
import type { User, AuthUser } from './types'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createTrialSubscription } from './subscriptionDb'

function mapRowToUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    passwordHash: (data.password_hash as string) ?? null,
    displayName: data.display_name as string,
    firstName: (data.first_name as string) || undefined,
    lastName: (data.last_name as string) || undefined,
    propertyId: (data.property_id as string) ?? '',
    roomId: (data.room_id as string) ?? '',
    landingPageUrl: (data.landing_page_url as string) || undefined,
    phoneNumber: (data.phone_number as string) || undefined,
    role: (data.role as User['role']) || 'owner',
    isDemo: (data.is_demo as boolean) || false,
    beds24Token: (data.beds24_token as string) || undefined,
    beds24RefreshToken: (data.beds24_refresh_token as string) || undefined,
    beds24AccountId: (data.beds24_account_id as string) || undefined,
    checkInSettings: data.check_in_settings as User['checkInSettings'],
  }
}

/**
 * Get user by email from Supabase (uses anon key, respects RLS)
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Failed to fetch user from Supabase:', error)
      return null
    }

    if (!data) return null
    return mapRowToUser(data as Record<string, unknown>)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
}

/**
 * Get user by email for credential auth (uses service role when available, bypasses RLS).
 * Use only in NextAuth authorize() so login works regardless of RLS on users.
 */
export const getUserByEmailForAuth = async (email: string): Promise<User | null> => {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch user for auth:', error)
      return null
    }

    if (!data) return null
    return mapRowToUser(data as Record<string, unknown>)
  } catch (_) {
    // Service role not configured or other error – fall back to anon (RLS may block)
    return getUserByEmail(email)
  }
}

/**
 * Verify password against hash.
 * Returns false for Google-only users (null hash).
 */
export const verifyPassword = async (plainPassword: string, passwordHash: string | null): Promise<boolean> => {
  if (!passwordHash) return false
  try {
    return await bcrypt.compare(plainPassword, passwordHash)
  } catch (error) {
    console.error('Failed to verify password:', error)
    return false
  }
}

/**
 * Hash password (for user creation/update)
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  const saltRounds = 10
  return await bcrypt.hash(plainPassword, saltRounds)
}

/**
 * Update user in Supabase
 */
export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const supabase = createServerClient()
    
    // Map User interface to database columns
    const dbUpdates: Record<string, any> = {}
    
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
    if (updates.passwordHash !== undefined) dbUpdates.password_hash = updates.passwordHash
    if (updates.propertyId !== undefined) dbUpdates.property_id = updates.propertyId
    if (updates.roomId !== undefined) dbUpdates.room_id = updates.roomId
    if (updates.landingPageUrl !== undefined) dbUpdates.landing_page_url = updates.landingPageUrl
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber
    if (updates.role !== undefined) dbUpdates.role = updates.role
    if (updates.beds24Token !== undefined) dbUpdates.beds24_token = updates.beds24Token
    if (updates.beds24RefreshToken !== undefined) dbUpdates.beds24_refresh_token = updates.beds24RefreshToken
    if (updates.checkInSettings !== undefined) dbUpdates.check_in_settings = updates.checkInSettings

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user in Supabase:', error)
      return null
    }

    if (!data) {
      return null
    }

    // Map database columns back to User interface
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      displayName: data.display_name,
      firstName: data.first_name || undefined,
      lastName: data.last_name || undefined,
      propertyId: data.property_id,
      roomId: data.room_id,
      landingPageUrl: data.landing_page_url || undefined,
      phoneNumber: data.phone_number || undefined,
      role: data.role || 'owner',
      isDemo: data.is_demo || false,
      beds24Token: data.beds24_token || undefined,
      beds24RefreshToken: data.beds24_refresh_token || undefined,
      checkInSettings: data.check_in_settings || undefined,
    }
  } catch (error) {
    console.error('Failed to update user:', error)
    return null
  }
}

/**
 * Check if email exists (for another user)
 */
export const emailExists = async (email: string, excludeUserId?: string): Promise<boolean> => {
  try {
    const supabase = createServerClient()
    
    let query = supabase
      .from('users')
      .select('id')
      .ilike('email', email)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - email doesn't exist
        return false
      }
      console.error('Failed to check email existence:', error)
      return false
    }

    return data !== null
  } catch (error) {
    console.error('Failed to check email:', error)
    return false
  }
}

/**
 * Create a new user in Supabase
 */
export const createUser = async (userData: {
  email: string
  password: string
  displayName: string
  firstName?: string
  lastName?: string
  propertyId?: string
  roomId?: string
  landingPageUrl?: string
  phoneNumber?: string
  role?: 'owner' | 'admin'
  beds24Token?: string
  beds24RefreshToken?: string
  beds24AccountId?: string
}): Promise<User | null> => {
  try {
    // Use service role to bypass RLS for admin-driven user creation
    const supabase = createServiceRoleClient()
    
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('email', userData.email)
      .maybeSingle()

    if (existing) {
      console.error('Email already exists:', userData.email)
      return null
    }
    
    // Hash the password
    const passwordHash = await hashPassword(userData.password)
    
    // Generate unique ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Prepare data for database
    const dbData = {
      id: userId,
      email: userData.email.toLowerCase(),
      password_hash: passwordHash,
      display_name: userData.displayName,
      first_name: userData.firstName || null,
      last_name: userData.lastName || null,
      property_id: userData.propertyId || '',
      room_id: userData.roomId || '',
      landing_page_url: userData.landingPageUrl || null,
      phone_number: userData.phoneNumber || null,
      role: userData.role || 'owner',
      is_demo: false,
      beds24_token: userData.beds24Token || null,
      beds24_refresh_token: userData.beds24RefreshToken || null,
      beds24_account_id: userData.beds24AccountId || null,
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert(dbData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create user in Supabase:', error)
      return null
    }
    
    if (!data) {
      return null
    }

    await createTrialSubscription(userId)
    
    // Map database columns to User interface
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.password_hash,
      displayName: data.display_name,
      firstName: data.first_name || undefined,
      lastName: data.last_name || undefined,
      propertyId: data.property_id,
      roomId: data.room_id,
      landingPageUrl: data.landing_page_url || undefined,
      phoneNumber: data.phone_number || undefined,
      role: data.role || 'owner',
      isDemo: data.is_demo || false,
      beds24Token: data.beds24_token || undefined,
      beds24RefreshToken: data.beds24_refresh_token || undefined,
      checkInSettings: data.check_in_settings || undefined,
    }
  } catch (error) {
    console.error('Failed to create user:', error)
    return null
  }
}

/**
 * Find an existing user by email, or create a new one for Google OAuth sign-in.
 * New users get empty propertyId/roomId and require onboarding.
 */
export const findOrCreateGoogleUser = async (
  email: string,
  displayName: string,
): Promise<AuthUser | null> => {
  const existing = await getUserByEmailForAuth(email)
  if (existing) {
    return toAuthUser(existing)
  }

  try {
    const supabase = createServiceRoleClient()
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: null,
        display_name: displayName,
        property_id: '',
        room_id: '',
        role: 'owner',
        is_demo: false,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create Google user:', error)
      return null
    }

    await createTrialSubscription(userId)

    return toAuthUser(mapRowToUser(data as Record<string, unknown>))
  } catch (err) {
    console.error('findOrCreateGoogleUser error:', err)
    return null
  }
}

/**
 * Convert full User to AuthUser (without password hash)
 */
export const toAuthUser = (user: User): AuthUser => {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    propertyId: user.propertyId,
    roomId: user.roomId,
    landingPageUrl: user.landingPageUrl,
    phoneNumber: user.phoneNumber,
    role: user.role,
    isDemo: user.isDemo,
    beds24Token: user.beds24Token,
    beds24RefreshToken: user.beds24RefreshToken,
    beds24AccountId: user.beds24AccountId,
    checkInSettings: user.checkInSettings,
  }
}

const DEMO_EMAIL = 'demo@hostly.co.il'
const DEMO_PASSWORD = 'demo2026'
const DEMO_USER_ID = 'demo_user_001'

/**
 * Ensure demo user exists with correct password (uses service role, bypasses RLS).
 * Use for seeding / fixing demo login. Safe to call multiple times.
 */
export async function ensureDemoUser(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = createServiceRoleClient()
    const passwordHash = await hashPassword(DEMO_PASSWORD)

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('email', DEMO_EMAIL)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          display_name: 'דמו - Mountain View',
          first_name: 'דמו',
          last_name: 'משתמש',
          property_id: 'DEMO_999999',
          room_id: 'DEMO_ROOM_999',
          landing_page_url: 'https://demo.hostly.co.il',
          phone_number: '+972501234567',
          role: 'owner',
          is_demo: true,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Failed to update demo user:', error)
        return { ok: false, message: error.message }
      }
      return { ok: true, message: 'Demo user password updated' }
    }

    const { error } = await supabase.from('users').insert({
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      password_hash: passwordHash,
      display_name: 'דמו - Mountain View',
      first_name: 'דמו',
      last_name: 'משתמש',
      property_id: 'DEMO_999999',
      room_id: 'DEMO_ROOM_999',
      landing_page_url: 'https://demo.hostly.co.il',
      phone_number: '+972501234567',
      role: 'owner',
      is_demo: true,
    })

    if (error) {
      console.error('Failed to create demo user:', error)
      return { ok: false, message: error.message }
    }
    return { ok: true, message: 'Demo user created' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('ensureDemoUser error:', err)
    return { ok: false, message: msg }
  }
}
