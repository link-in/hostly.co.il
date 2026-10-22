import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'

/**
 * HOS-17 — עמוד ניהול דפי נחיתה מוסתר זמנית מהאתר.
 * להחזיר את העמוד לתפריט ולנתיב `/dashboard/landing`, שנו ל-true.
 */
export const LANDING_EDITOR_ENABLED = false

export function isDashboardNavPageVisible(
  page: string | undefined,
  enabled = LANDING_EDITOR_ENABLED,
  siteBuilderEnabled = isSiteBuilderEnabled(),
): boolean {
  if (page === 'landing') return enabled
  if (page === 'site-builder') return siteBuilderEnabled
  return true
}
