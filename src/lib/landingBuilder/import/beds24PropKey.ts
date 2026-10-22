import { createServiceRoleClient } from '@/lib/supabase/server'

const MIN_PROP_KEY_LENGTH = 16

export interface PropKeyEnv {
  propKey: string | undefined
  propertyId: string | undefined
}

const readEnv = (): PropKeyEnv => ({
  propKey: process.env.BEDS24_PROP_KEY,
  propertyId: process.env.BEDS24_PROPERTY_ID,
})

const isUsable = (key: string | null | undefined): key is string =>
  typeof key === 'string' && key.trim().length >= MIN_PROP_KEY_LENGTH

/** The env key belongs to one property, so it is never used for anyone else's. */
export function resolvePropKey(
  storedKey: string | null | undefined,
  propertyId: string,
  env: PropKeyEnv = readEnv(),
): string | null {
  if (isUsable(storedKey)) return storedKey.trim()
  if (env.propertyId === propertyId && isUsable(env.propKey)) return env.propKey.trim()
  return null
}

/** `users.beds24_prop_key` (server-only, never put in the session). Missing column or row -> env fallback. */
export async function loadBeds24PropKey(userId: string, propertyId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('users').select('beds24_prop_key').eq('id', userId).maybeSingle()
  const stored = error ? null : (data as { beds24_prop_key: string | null } | null)?.beds24_prop_key
  return resolvePropKey(stored, propertyId)
}
