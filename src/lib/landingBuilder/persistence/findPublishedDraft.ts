import type { LandingDraft } from '../types'
import { loadPublishedDraft } from './publishedSiteRepository'

/** Never breaks a public page: on any failure the caller falls back to the old landing renderer. */
export async function findPublishedDraft(address: string): Promise<LandingDraft | null> {
  try {
    return await loadPublishedDraft(address)
  } catch (error) {
    console.warn('[landing-builder] Loading the published site failed:', error)
    return null
  }
}
