/** Neutral document types supported by Hostly (mapped per provider). */
export type ReceiptDocumentType = 'receipt' | 'tax_invoice' | 'tax_invoice_receipt'

export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'bit' | 'other'

export type ReceiptProviderType = 'icount' | 'mock'

export interface ReceiptCustomer {
  name: string
  email?: string
  phone?: string
  /** ח.פ / ע.מ – required for tax invoices when applicable */
  vatId?: string
}

export interface IssueReceiptInput {
  customer: ReceiptCustomer
  amount: number
  currency: 'ILS'
  description: string
  documentType: ReceiptDocumentType
  paymentMethod: PaymentMethod
  bookingId: string
  userId: string
  /** YYYY-MM-DD; defaults to today in provider if omitted */
  docDate?: string
}

export interface IssueReceiptResult {
  success: boolean
  provider: string
  externalDocId?: string
  externalDocNumber?: string
  pdfUrl?: string
  error?: string
  rawResponse?: unknown
}

export interface ReceiptProviderConfig {
  provider: ReceiptProviderType
  /** Provider-specific secrets / connection details */
  credentials: Record<string, unknown>
  defaultVatId?: string | null
  isActive: boolean
}

export interface ReceiptProvider {
  name: string
  validateConfig(): boolean
  issueDocument(input: IssueReceiptInput): Promise<IssueReceiptResult>
  /** Optional connectivity check (e.g. list doc types). */
  testConnection?(): Promise<{ ok: boolean; error?: string }>
  /** Optional: list creatable document types from the provider account. */
  listDocumentTypes?(): Promise<
    Array<{
      doctype: string
      title: string
      canCreate: boolean
      hasPayment: boolean
      hasVat: boolean
    }>
  >
}

/** Draft used to prefill the issue-receipt modal from a Reservation. */
export interface ReceiptDraft {
  bookingId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amount: number
  description: string
  documentType: ReceiptDocumentType
  paymentMethod: PaymentMethod
}
