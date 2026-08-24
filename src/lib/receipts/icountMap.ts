import type { PaymentMethod, ReceiptDocumentType } from './types'

/** Preferred iCount doctype codes per Hostly document type (first available wins). */
export const DOCTYPE_PREFERENCES: Record<ReceiptDocumentType, string[]> = {
  receipt: ['receipt'],
  tax_invoice: ['invoice', 'taxinv'],
  tax_invoice_receipt: ['invrec', 'taxinvrec', 'receipt'],
}

/** iCount doctype values for Hostly document types (static fallback before live resolve). */
export function toICountDoctype(documentType: ReceiptDocumentType): string {
  return DOCTYPE_PREFERENCES[documentType][0]
}

/**
 * Pick the first preferred doctype that exists and is creatable on this account.
 * Exempt / no-VAT accounts often only have `receipt` (no invrec/invoice).
 */
export function resolveICountDoctype(
  documentType: ReceiptDocumentType,
  available: Record<string, { doctype?: string; can_create?: boolean }>
): { doctype: string; fallback: boolean } | null {
  const preferred = DOCTYPE_PREFERENCES[documentType] || []
  for (const code of preferred) {
    const meta = available[code]
    if (!meta) continue
    if (meta.can_create === false) continue
    return { doctype: code, fallback: code !== preferred[0] }
  }
  return null
}

/**
 * iCount v3 payment fields (verified against live account).
 * - cash / banktransfer use associative keys: cash[sum], banktransfer[sum]
 * - cc / cheques use indexed keys: cc[0][sum], cheques[0][sum]
 */
export function toICountPaymentFields(
  method: PaymentMethod,
  amount: number
): Record<string, number | string> {
  switch (method) {
    case 'cash':
      return { 'cash[sum]': amount }
    case 'credit_card':
      return { 'cc[0][sum]': amount }
    case 'bank_transfer':
      return { 'banktransfer[sum]': amount }
    case 'bit':
      // Bit is typically recorded as a bank transfer in Israeli accounting systems
      return { 'banktransfer[sum]': amount }
    case 'other':
      return { 'cash[sum]': amount }
    default: {
      const _exhaustive: never = method
      return _exhaustive
    }
  }
}

/** Convert YYYY-MM-DD (or Date) to iCount YYYYMMDD. */
export function toICountDate(isoDate?: string): string {
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate.replace(/-/g, '')
  }
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** Normalize doc/types response (field may be `doctypes` or `types`). */
export function normalizeICountDoctypes(data: Record<string, any>): Record<
  string,
  {
    doctype: string
    title_he?: string
    title?: string
    can_create?: boolean
    has_payment?: boolean
    has_items?: boolean
    has_vat?: boolean
  }
> {
  const raw = data.doctypes ?? data.types ?? {}
  if (Array.isArray(raw)) {
    const map: Record<string, any> = {}
    for (const item of raw) {
      const code = String(item.doctype || item.id || '')
      if (code) map[code] = { ...item, doctype: code }
    }
    return map
  }
  return raw as Record<string, any>
}
