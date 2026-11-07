import { describe, expect, it } from 'vitest'
import {
  buildInquiryMessage,
  buildMailtoHref,
  buildWhatsAppHref,
  contactFromLegacyMeta,
  getInvalidContactFields,
  hasContact,
  toTelHref,
  toWhatsAppNumber,
} from './contact'

describe('toWhatsAppNumber', () => {
  it('converts Israeli local numbers to the international form', () => {
    expect(toWhatsAppNumber('050-1234567')).toBe('972501234567')
    expect(toWhatsAppNumber('+972 50 123 4567')).toBe('972501234567')
  })

  it('rejects short or non-numeric input', () => {
    expect(toWhatsAppNumber('1234')).toBeNull()
    expect(toWhatsAppNumber('call me 0501234567')).toBeNull()
    expect(toWhatsAppNumber('')).toBeNull()
  })
})

describe('toTelHref', () => {
  it('keeps the leading plus and drops separators', () => {
    expect(toTelHref('+972-50-123-4567')).toBe('tel:+972501234567')
    expect(toTelHref('04 690 1234')).toBe('tel:046901234')
  })
})

describe('getInvalidContactFields', () => {
  it('allows empty fields and reports malformed ones', () => {
    expect(getInvalidContactFields({ whatsapp: '', phone: '', email: '' })).toEqual([])
    expect(getInvalidContactFields({ whatsapp: '050', phone: '050-1234567', email: 'zur@' })).toEqual(['whatsapp', 'email'])
  })

  it('needs at least one filled field to count as contactable', () => {
    expect(hasContact({ whatsapp: '', phone: '', email: '' })).toBe(false)
    expect(hasContact({ whatsapp: '', phone: '', email: 'host@example.com' })).toBe(true)
  })
})

describe('inquiry links', () => {
  const details = { siteTitle: 'נוף הרים', checkIn: '2026-11-05', checkOut: '2026-11-07', nights: 2 }

  it('writes the dates into the message', () => {
    expect(buildInquiryMessage(details)).toBe('שלום, אשמח לבדוק זמינות בנוף הרים מ-05/11/2026 עד 07/11/2026 (2 לילות).')
    expect(buildInquiryMessage({ ...details, checkOut: null })).toBe('שלום, אשמח לבדוק זמינות בנוף הרים.')
  })

  it('builds an encoded wa.me link only for a usable number', () => {
    expect(buildWhatsAppHref('050-1234567', 'שלום')).toBe(`https://wa.me/972501234567?text=${encodeURIComponent('שלום')}`)
    expect(buildWhatsAppHref('', 'שלום')).toBeNull()
  })

  it('builds a mailto link only for a valid email', () => {
    expect(buildMailtoHref('host@example.com', 'נוף', 'hi')).toMatch(/^mailto:host@example\.com\?subject=.+&body=hi$/)
    expect(buildMailtoHref('host@', 'נוף', 'hi')).toBeNull()
  })
})

describe('contactFromLegacyMeta', () => {
  it('maps the old editor settings and drops invalid values', () => {
    expect(
      contactFromLegacyMeta({ whatsapp_number: ' 050-1234567 ', phone: 'n/a', email: 'host@example.com', address: 'Dafna' }),
    ).toEqual({ whatsapp: '050-1234567', phone: '', email: 'host@example.com' })
  })

  it('returns empty contact for missing or malformed settings', () => {
    expect(contactFromLegacyMeta(null)).toEqual({ whatsapp: '', phone: '', email: '' })
    expect(contactFromLegacyMeta({ phone: 42 })).toEqual({ whatsapp: '', phone: '', email: '' })
  })
})
