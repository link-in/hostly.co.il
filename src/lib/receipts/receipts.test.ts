import { describe, expect, it } from 'vitest'
import type { Reservation } from '@/lib/dashboard/types'
import { mapReservationToDraft } from './mapReservationToDraft'
import {
  resolveICountDoctype,
  toICountDate,
  toICountDoctype,
  toICountPaymentFields,
} from './icountMap'
import { MockReceiptProvider } from './providers/mock'
import { IssueReceiptBodySchema } from './schemas'
import { getReceiptProvider } from './factory'

const sampleReservation: Reservation = {
  id: '12345',
  guestName: 'ישראל ישראלי',
  checkIn: '2026-08-10',
  checkOut: '2026-08-12',
  nights: 2,
  total: 1500,
  status: 'confirmed',
  email: 'guest@example.com',
  phone: '0501234567',
  unitName: 'נוף הרים',
}

describe('mapReservationToDraft', () => {
  it('prefills guest, amount and stay description', () => {
    const draft = mapReservationToDraft(sampleReservation)
    expect(draft.bookingId).toBe('12345')
    expect(draft.customerName).toBe('ישראל ישראלי')
    expect(draft.customerEmail).toBe('guest@example.com')
    expect(draft.customerPhone).toBe('0501234567')
    expect(draft.amount).toBe(1500)
    expect(draft.description).toContain('2026-08-10')
    expect(draft.description).toContain('2026-08-12')
    expect(draft.description).toContain('#12345')
    expect(draft.description).toContain('נוף הרים')
    expect(draft.documentType).toBe('receipt')
    expect(draft.paymentMethod).toBe('cash')
  })

  it('falls back gracefully when optional fields missing', () => {
    const draft = mapReservationToDraft({
      id: '9',
      guestName: '',
      checkIn: '2026-01-01',
      checkOut: '2026-01-02',
      nights: 1,
      total: 100,
      status: 'confirmed',
    })
    expect(draft.customerName).toBe('אורח')
    expect(draft.customerEmail).toBe('')
    expect(draft.amount).toBe(100)
  })
})

describe('icountMap', () => {
  it('maps document types to preferred iCount doctypes', () => {
    expect(toICountDoctype('receipt')).toBe('receipt')
    expect(toICountDoctype('tax_invoice')).toBe('invoice')
    expect(toICountDoctype('tax_invoice_receipt')).toBe('invrec')
  })

  it('falls back tax_invoice_receipt to receipt when invrec missing (exempt)', () => {
    const resolved = resolveICountDoctype('tax_invoice_receipt', {
      receipt: { doctype: 'receipt', can_create: true },
      deal: { doctype: 'deal', can_create: true },
    })
    expect(resolved).toEqual({ doctype: 'receipt', fallback: true })
  })

  it('maps payment methods to iCount sum fields', () => {
    expect(toICountPaymentFields('cash', 100)).toEqual({ 'cash[sum]': 100 })
    expect(toICountPaymentFields('credit_card', 200)).toEqual({ 'cc[0][sum]': 200 })
    expect(toICountPaymentFields('bank_transfer', 300)).toEqual({
      'banktransfer[sum]': 300,
    })
    expect(toICountPaymentFields('bit', 50)).toEqual({ 'banktransfer[sum]': 50 })
  })

  it('formats dates as YYYYMMDD', () => {
    expect(toICountDate('2026-08-11')).toBe('20260811')
    expect(toICountDate()).toMatch(/^\d{8}$/)
  })
})

describe('IssueReceiptBodySchema', () => {
  it('accepts a valid payload', () => {
    const parsed = IssueReceiptBodySchema.safeParse({
      bookingId: '1',
      documentType: 'receipt',
      paymentMethod: 'bit',
      amount: 200,
      customerName: 'אבי',
      description: 'אירוח',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects non-positive amount', () => {
    const parsed = IssueReceiptBodySchema.safeParse({
      bookingId: '1',
      documentType: 'receipt',
      paymentMethod: 'cash',
      amount: 0,
      customerName: 'אבי',
      description: 'אירוח',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('MockReceiptProvider', () => {
  it('issues a successful mock document', async () => {
    const provider = new MockReceiptProvider()
    const result = await provider.issueDocument({
      customer: { name: 'Test' },
      amount: 100,
      currency: 'ILS',
      description: 'test',
      documentType: 'receipt',
      paymentMethod: 'cash',
      bookingId: 'b1',
      userId: 'u1',
    })
    expect(result.success).toBe(true)
    expect(result.provider).toBe('mock')
    expect(result.externalDocNumber).toBeTruthy()
    expect(result.pdfUrl).toContain('b1')
  })
})

describe('getReceiptProvider', () => {
  it('returns mock provider for mock settings', () => {
    const p = getReceiptProvider({
      provider: 'mock',
      credentials: {},
      isActive: true,
    })
    expect(p.name).toBe('mock')
  })

  it('returns icount provider for icount settings', () => {
    const p = getReceiptProvider({
      provider: 'icount',
      credentials: { apiToken: 'tok_test' },
      isActive: true,
    })
    expect(p.name).toBe('icount')
    expect(p.validateConfig()).toBe(true)
  })
})
