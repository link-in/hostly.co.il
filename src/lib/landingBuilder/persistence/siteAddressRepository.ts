import { createServiceRoleClient } from '@/lib/supabase/server'

/** `landing_pages.subdomain` is the one address space shared by the old editor and the wizard. */
export async function findSiteAddressOwner(address: string): Promise<string | null> {
  const { data, error } = await createServiceRoleClient()
    .from('landing_pages')
    .select('user_id')
    .eq('subdomain', address)
    .maybeSingle()
  if (error) throw new Error(`Looking up site address failed: ${error.message}`)
  return (data?.user_id as string | undefined) ?? null
}

export async function loadUserSiteAddress(userId: string): Promise<string | null> {
  const { data, error } = await createServiceRoleClient()
    .from('landing_pages')
    .select('subdomain')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Loading site address failed: ${error.message}`)
  return (data?.subdomain as string | undefined) ?? null
}
