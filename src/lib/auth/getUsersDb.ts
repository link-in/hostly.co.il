import bcrypt from 'bcryptjs'
import type { User, AuthUser } from './types'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Get user by email from Supabase
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
        // No rows returned
        return null
      }
      console.error('Failed to fetch user from Supabase:', error)
      return null
    }

    if (!data) {
      return null
    }

    // Map database columns to User interface
    const user = {
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
    }
    
    // Debug logging
    console.log('[DB] User fetched from database:', {
      email: user.email,
      role: user.role,
      dbRole: data.role,
      hasRole: !!data.role
    })
    
    return user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
}

/**
 * Verify password against hash
 */
export const verifyPassword = async (plainPassword: string, passwordHash: string): Promise<boolean> => {
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
  propertyId: string
  roomId: string
  landingPageUrl?: string
  phoneNumber?: string
  role?: 'owner' | 'admin'
  beds24Token?: string
  beds24RefreshToken?: string
}): Promise<User | null> => {
  try {
    const supabase = createServerClient()
    
    // Check if email already exists
    const exists = await emailExists(userData.email)
    if (exists) {
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
      property_id: userData.propertyId,
      room_id: userData.roomId,
      landing_page_url: userData.landingPageUrl || null,
      phone_number: userData.phoneNumber || null,
      role: userData.role || 'owner',
      is_demo: false,
      beds24_token: userData.beds24Token || null,
      beds24_refresh_token: userData.beds24RefreshToken || null,
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
    }
  } catch (error) {
    console.error('Failed to create user:', error)
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
  }
}
