/**
 * HOS-17 — עמוד ניהול דפי נחיתה מוסתר זמנית מהאתר.
 * להחזיר את העמוד לתפריט ולנתיב `/dashboard/landing`, שנו ל-true.
 */
export const LANDING_EDITOR_ENABLED = false

export function isDashboardNavPageVisible(
  page: string | undefined,
  enabled = LANDING_EDITOR_ENABLED,
): boolean {
  if (page === 'landing') return enabled
  return true
}
