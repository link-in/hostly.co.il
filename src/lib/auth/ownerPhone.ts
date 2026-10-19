import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/utils/phoneFormatter'

export const OWNER_PHONE_REQUIRED_MESSAGE = 'מספר טלפון הוא שדה חובה (נדרש לקבלת התראות WhatsApp)'
export const OWNER_PHONE_INVALID_MESSAGE = 'מספר הטלפון אינו תקין'

export type OwnerPhoneResult = { ok: true; phone: string } | { ok: false; error: string }

/**
 * ולידציה של טלפון בעל הנכס בהוספת לקוח חדש. הטלפון הוא יעד התראות ה-WhatsApp
 * על הזמנות, ולכן בלעדיו לקוח חדש לא יקבל שום התראה.
 * מחזיר את המספר בפורמט בינלאומי (+972...).
 */
export function validateOwnerPhone(raw: unknown): OwnerPhoneResult {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return { ok: false, error: OWNER_PHONE_REQUIRED_MESSAGE }
  if (!isValidPhoneNumber(value)) return { ok: false, error: OWNER_PHONE_INVALID_MESSAGE }
  return { ok: true, phone: normalizePhoneNumber(value) }
}
