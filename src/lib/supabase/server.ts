import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

/**
 * Create a Supabase client for server-side operations
 * This client uses the anon key and respects Row Level Security (RLS)
 */
export function createServerClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
