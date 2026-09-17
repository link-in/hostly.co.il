import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAnonEnv } from './env'

export function createClient() {
  const { url, anonKey } = getSupabaseAnonEnv()
  return createSupabaseClient(url, anonKey)
}
