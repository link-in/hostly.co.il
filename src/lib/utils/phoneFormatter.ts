// Phone Number Formatter for WhatsApp
// Converts Israeli phone numbers to international format

/**
 * Normalize Israeli phone number to international format
 * 
 * @param phone - Phone number in various formats
 * @returns Phone number in international format (+972...)
 * 
 * @example
 * normalizePhoneNumber('0528676516') // '+972528676516'
 * normalizePhoneNumber('052-867-6516') // '+972528676516'
 * normalizePhoneNumber('+972528676516') // '+972528676516'
 * normalizePhoneNumber('972528676516') // '+972528676516'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // If starts with +972, return as is
  if (cleaned.startsWith('+972')) {
    return cleaned
  }
  
  // If starts with 972 (without +), add +
  if (cleaned.startsWith('972')) {
    return `+${cleaned}`
  }
  
  // If starts with 0 (Israeli format), replace with +972
  if (cleaned.startsWith('0')) {
    return `+972${cleaned.slice(1)}`
  }
  
  // If no country code and looks like Israeli mobile (starts with 5)
  // Assume it's missing the leading 0
  if (cleaned.startsWith('5') && cleaned.length === 9) {
    return `+972${cleaned}`
  }
  
  // If has + but not 972, return as is (international number from other country)
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // Default: assume Israeli number, add +972
  return `+972${cleaned}`
}

/**
 * Format a phone number for human display in the dashboard.
 *
 * Guest phone numbers come straight from Beds24 in whatever format the guest
 * (or channel) entered — no dashes, random dashes/spaces, missing/extra
 * leading zero, etc. This normalizes first, then renders Israeli numbers in
 * the familiar local grouping (e.g. `050-595-2822`, `02-123-4567`) instead of
 * showing the raw, inconsistent value. Non-Israeli numbers fall back to the
 * normalized international form.
 *
 * @example
 * formatPhoneForDisplay('972505952822')   // '050-595-2822'
 * formatPhoneForDisplay('05059 52822')    // '050-595-2822'
 * formatPhoneForDisplay('+33612345678')   // '+33612345678'
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return phone

  const normalized = normalizePhoneNumber(phone)

  if (!normalized.startsWith('+972')) {
    return normalized
  }

  const local = `0${normalized.slice(4)}`

  // Mobile / most short-code numbers: 0XX-XXX-XXXX (10 digits)
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  }

  // Landline, single-digit area code: 0X-XXX-XXXX (9 digits)
  if (local.length === 9) {
    return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`
  }

  return local
}

/**
 * Validate that a phone number is in a valid format
 * More permissive - accepts Israeli and international formats
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false
  
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Must have at least 9 digits (Israeli mobile without country code)
  const digitCount = cleaned.replace(/\D/g, '').length
  if (digitCount < 9) return false
  
  // Check common formats
  const patterns = [
    /^0[2-9]\d{7,8}$/,           // Israeli format: 050-1234567, 02-1234567
    /^972[2-9]\d{7,8}$/,         // Israeli without +: 972501234567
    /^\+972[2-9]\d{7,8}$/,       // Israeli with +: +972501234567
    /^\+[1-9]\d{1,14}$/,         // International format
  ]
  
  return patterns.some(pattern => pattern.test(cleaned))
}
