/**
 * Hostly — Price Check Input Validation
 */

export interface PriceCheckFormValues {
  checkIn: string
  checkOut: string
  numAdult: number
  numChild: number
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validatePriceCheckInput(
  values: PriceCheckFormValues,
  referenceDate: Date = new Date()
): ValidationResult {
  const { checkIn, checkOut, numAdult, numChild } = values

  if (!checkIn || !checkOut) {
    return { valid: false, error: 'יש למלא תאריכי כניסה ויציאה' }
  }

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return { valid: false, error: 'תאריכים אינם תקינים' }
  }

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  if (checkInDate < today) {
    return { valid: false, error: 'תאריך כניסה לא יכול להיות בעבר' }
  }

  if (checkOutDate <= checkInDate) {
    return { valid: false, error: 'תאריך יציאה חייב להיות אחרי תאריך כניסה' }
  }

  if (!Number.isFinite(numAdult) || numAdult < 1) {
    return { valid: false, error: 'נדרש לפחות מבוגר אחד' }
  }

  if (!Number.isFinite(numChild) || numChild < 0) {
    return { valid: false, error: 'מספר ילדים לא יכול להיות שלילי' }
  }

  return { valid: true }
}

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
