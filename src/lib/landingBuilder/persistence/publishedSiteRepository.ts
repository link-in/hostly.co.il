import { createServiceRoleClient } from '@/lib/supabase/server'
import type { LandingDraft } from '../types'
import { parseStoredDraft } from './storedDraft'

const UNIQUE_VIOLATION = '23505'

export class SiteAddressTakenError extends Error {
  constructor(address: string) {
    super(`Site address "${address}" is taken`)
    this.name = 'SiteAddressTakenError'
  }
}

/** Upserts the user's one `landing_pages` row; the unique `subdomain` index settles races for the same address. */
export async function publishSite(userId: string, draft: LandingDraft): Promise<string> {
  const publishedAt = new Date().toISOString()
  const { error } = await createServiceRoleClient()
    .from('landing_pages')
    .upsert(
      {
        user_id: userId,
        subdomain: draft.siteAddress,
        site_title: draft.content.siteTitle || draft.content.heroTitle,
        site_subtitle: draft.content.heroSubtitle,
        published_draft: draft,
        published_at: publishedAt,
        updated_at: publishedAt,
      },
      { onConflict: 'user_id' },
    )
  if (error?.code === UNIQUE_VIOLATION) throw new SiteAddressTakenError(draft.siteAddress)
  if (error) throw new Error(`Publishing the site failed: ${error.message}`)
  return publishedAt
}

/** Public read: only the published snapshot, never the working draft or owner data. */
export async function loadPublishedDraft(address: string): Promise<LandingDraft | null> {
  const { data, error } = await createServiceRoleClient()
    .from('landing_pages')
    .select('published_draft')
    .eq('subdomain', address)
    .not('published_draft', 'is', null)
    .maybeSingle()
  if (error) throw new Error(`Loading the published site failed: ${error.message}`)
  return data ? parseStoredDraft(data.published_draft) : null
}
