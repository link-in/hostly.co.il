import {
  normalizeICountDoctypes,
  resolveICountDoctype,
  toICountDate,
  toICountPaymentFields,
} from '../icountMap'
import type {
  IssueReceiptInput,
  IssueReceiptResult,
  ReceiptProvider,
} from '../types'

const DEFAULT_BASE_URL = 'https://api.icount.co.il/api/v3.php'

export interface ICountCredentials {
  apiToken: string
  /** Optional override; defaults to production iCount API */
  baseUrl?: string
}

/**
 * iCount v3 provider — Bearer token auth, form-urlencoded requests.
 * @see https://api.icount.co.il
 */
export class ICountProvider implements ReceiptProvider {
  name = 'icount'
  private readonly apiToken: string
  private readonly baseUrl: string

  constructor(credentials: ICountCredentials) {
    this.apiToken = (credentials.apiToken || '').trim()
    this.baseUrl = (credentials.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
  }

  validateConfig(): boolean {
    return this.apiToken.length > 0
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.validateConfig()) {
      return { ok: false, error: 'חסר API Token של iCount' }
    }

    try {
      const data = await this.postJson('doc/types', {})
      if (data.status === false || data.status === 0) {
        return {
          ok: false,
          error: formatICountError(data),
        }
      }
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async listDocumentTypes(): Promise<
    Array<{
      doctype: string
      title: string
      canCreate: boolean
      hasPayment: boolean
      hasVat: boolean
    }>
  > {
    const data = await this.postJson('doc/types', {})
    if (data.status === false || data.status === 0) {
      throw new Error(formatICountError(data))
    }
    const map = normalizeICountDoctypes(data)
    return Object.values(map)
      .filter((t) => t.can_create !== false)
      .map((t) => ({
        doctype: t.doctype,
        title: t.title_he || t.title || t.doctype,
        canCreate: t.can_create !== false,
        hasPayment: Boolean(t.has_payment),
        hasVat: Boolean(t.has_vat),
      }))
  }

  async issueDocument(input: IssueReceiptInput): Promise<IssueReceiptResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        provider: this.name,
        error: 'חסר API Token של iCount בהגדרות',
      }
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return {
        success: false,
        provider: this.name,
        error: 'סכום לא תקין',
      }
    }

    try {
      const typesData = await this.postJson('doc/types', {})
      if (typesData.status === false || typesData.status === 0) {
        return {
          success: false,
          provider: this.name,
          error: formatICountError(typesData),
          rawResponse: typesData,
        }
      }

      const available = normalizeICountDoctypes(typesData)
      const resolved = resolveICountDoctype(input.documentType, available)
      if (!resolved) {
        const availableList = Object.values(available)
          .filter((t) => t.can_create !== false)
          .map((t) => `${t.doctype} (${t.title_he || t.title || ''})`)
          .join(', ')
        return {
          success: false,
          provider: this.name,
          error: `סוג המסמך לא זמין בחשבון iCount שלך. זמינים: ${availableList || 'אין'}`,
          rawResponse: { requested: input.documentType, available: Object.keys(available) },
        }
      }

      const meta = available[resolved.doctype]
      const docDate = toICountDate(input.docDate)
      const body: Record<string, string | number> = {
        doctype: resolved.doctype,
        client_name: input.customer.name,
        doc_date: docDate,
        // Account currency_code is ILS (mapped to ש״ח); NIS also accepted but ILS matches stored docs
        currency: 'ILS',
        'desc[0]': input.description,
        'unitprice[0]': input.amount,
        'quantity[0]': 1,
      }

      if (meta?.has_vat) {
        body.vattype = 1
      }

      if (input.customer.email) body.email = input.customer.email
      if (input.customer.phone) {
        body.client_phone = input.customer.phone
        body.phone = input.customer.phone
      }
      if (input.customer.vatId) body.vat_id = input.customer.vatId

      // Payment fields required for receipt / documents with has_payment
      if (
        meta?.has_payment !== false &&
        (resolved.doctype === 'receipt' ||
          resolved.doctype === 'invrec' ||
          meta?.has_payment)
      ) {
        Object.assign(body, toICountPaymentFields(input.paymentMethod, input.amount))
      }

      const data = await this.postJson('doc/create', body)

      if (data.status === false || data.status === 0) {
        console.error('[icount] doc/create failed:', JSON.stringify(data).slice(0, 800))
        return {
          success: false,
          provider: this.name,
          error: formatICountError(data),
          rawResponse: data,
        }
      }

      const docnum =
        data.docnum ?? data.doc_number ?? data.doc?.docnum ?? data.doc?.doc_number
      const docId = data.doc_id ?? data.docid ?? data.doc?.doc_id ?? data.doc?.docid
      const pdfUrl =
        data.pdf_link ?? data.pdfurl ?? data.doc?.pdf_link ?? data.doc?.pdfurl

      return {
        success: true,
        provider: this.name,
        externalDocId: docId != null ? String(docId) : undefined,
        externalDocNumber: docnum != null ? String(docnum) : undefined,
        pdfUrl: pdfUrl != null ? String(pdfUrl) : undefined,
        rawResponse: data,
      }
    } catch (err) {
      console.error('[icount] issueDocument error:', err)
      return {
        success: false,
        provider: this.name,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async postJson(
    endpoint: string,
    fields: Record<string, string | number>
  ): Promise<Record<string, any>> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(fields)) {
      params.set(key, String(value))
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const text = await response.text()
    let data: Record<string, any>
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(
        `תשובה לא תקינה מ-iCount (HTTP ${response.status}): ${text.slice(0, 200)}`
      )
    }

    if (!response.ok && data.status === undefined) {
      throw new Error(`iCount HTTP ${response.status}: ${text.slice(0, 200)}`)
    }

    return data
  }
}

function formatICountError(data: Record<string, any>): string {
  const details = Array.isArray(data.error_details)
    ? data.error_details.filter(Boolean).join(' · ')
    : ''
  const desc = data.error_description || data.error || data.reason
  if (details && details !== desc) {
    return `${desc}: ${details}`
  }
  const reason = data.reason && data.reason !== desc ? ` (${data.reason})` : ''
  return String(desc || 'יצירת מסמך נכשלה') + reason
}

export function parseICountCredentials(
  credentials: Record<string, unknown>
): ICountCredentials {
  const apiToken = String(credentials.apiToken ?? credentials.api_token ?? '').trim()
  const baseUrl = credentials.baseUrl
    ? String(credentials.baseUrl)
    : undefined
  return { apiToken, baseUrl }
}
