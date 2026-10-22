import { createServiceRoleClient } from '@/lib/supabase/server'
import type { LandingDraft } from '../types'
import { parseStoredDraft } from './storedDraft'

const TABLE = 'landing_builder_drafts'

export interface SavedDraft {
  draft: LandingDraft
  updatedAt: string
}

/** Returns null when there is no draft, the table is missing, or the stored JSON no longer validates. */
export async function loadDraft(userId: string): Promise<SavedDraft | null> {
  const { data, error } = await createServiceRoleClient()
    .from(TABLE)
    .select('draft, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null

  const draft = parseStoredDraft(data.draft)
  return draft ? { draft, updatedAt: data.updated_at as string } : null
}

export async function saveDraft(userId: string, draft: LandingDraft): Promise<string> {
  const updatedAt = new Date().toISOString()
  const { error } = await createServiceRoleClient()
    .from(TABLE)
    .upsert({ user_id: userId, draft, updated_at: updatedAt }, { onConflict: 'user_id' })
  if (error) throw new Error(`Saving draft failed: ${error.message}`)
  return updatedAt
}
