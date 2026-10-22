import { createServiceRoleClient } from '@/lib/supabase/server'
import { contactFromLegacyMeta, type SiteContact } from '../contact'
import type { LandingDraft } from '../types'
import { parseStoredDraft } from './storedDraft'

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

export interface ExistingSite {
  address: string
  contact: SiteContact
  publishedDraft: LandingDraft | null
  publishedAt: string | null
}

/** The user's `landing_pages` row (old editor and/or a published wizard site), if any. */
export async function loadExistingSite(userId: string): Promise<ExistingSite | null> {
  const { data, error } = await createServiceRoleClient()
    .from('landing_pages')
    .select('subdomain, meta_settings, published_draft, published_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Loading the existing site failed: ${error.message}`)
  if (!data) return null
  return {
    address: data.subdomain as string,
    contact: contactFromLegacyMeta(data.meta_settings),
    publishedDraft: parseStoredDraft(data.published_draft),
    publishedAt: (data.published_at as string | null) ?? null,
  }
}
