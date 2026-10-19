import { extractErrorMessages } from './creditGuard'

/**
 * Beds24 מחזירה לעיתים HTTP 2xx (למשל 201) כשהפעולה עצמה נכשלה,
 * ומסמנת זאת בגוף התגובה כ-`success: false` (למשל "invalid roomId").
 * הפונקציה בודקת את הגוף ולא רק את קוד ה-HTTP.
 */
export function hasBeds24Failure(body: unknown): boolean {
  const items = Array.isArray(body) ? body : [body]
  return items.some(
    (item) => !!item && typeof item === 'object' && (item as { success?: unknown }).success === false,
  )
}

/** מחזירה טקסט שגיאה קריא מגוף תגובה כושל של Beds24. */
export function describeBeds24Failure(body: unknown, fallback = 'Beds24 דחתה את הבקשה'): string {
  const messages = extractErrorMessages(body).filter(Boolean)
  return messages.length ? Array.from(new Set(messages)).join('; ') : fallback
}
