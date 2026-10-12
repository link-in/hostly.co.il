import { createServiceRoleClient } from '@/lib/supabase/server'

export interface Beds24UserTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Returns the user's own Beds24 tokens when both are stored (sub-account),
 * otherwise `undefined` so callers fall back to the master account tokens.
 */
export async function resolveBeds24Tokens(userId: string): Promise<Beds24UserTokens | undefined> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('users')
    .select('beds24_token, beds24_refresh_token')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return undefined

  const row = data as { beds24_token: string | null; beds24_refresh_token: string | null }
  if (!row.beds24_token || !row.beds24_refresh_token) return undefined

  return { accessToken: row.beds24_token, refreshToken: row.beds24_refresh_token }
}
