import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAnonEnv } from './env'

/**
 * Create a Supabase client for server-side operations
 * This client uses the anon key and respects Row Level Security (RLS)
 */
export function createServerClient() {
  const { url, anonKey } = getSupabaseAnonEnv()
  return createSupabaseClient(url, anonKey)
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use ONLY for trusted server-side operations
 */
export function createServiceRoleClient() {
  const { url } = getSupabaseAnonEnv()
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Required for admin operations.',
    )
  }

  return createSupabaseClient(url, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
