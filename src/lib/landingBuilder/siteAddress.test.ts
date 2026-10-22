import { describe, expect, it } from 'vitest'
import {
  buildSiteHost,
  normalizeSiteAddress,
  suggestSiteAddress,
  transliterateHebrew,
  validateSiteAddress,
} from './siteAddress'

describe('normalizeSiteAddress', () => {
  it('lowercases and turns spaces, underscores and dots into hyphens', () => {
    expect(normalizeSiteAddress('Your_Domain')).toBe('your-domain')
    expect(normalizeSiteAddress('Mountain View  Dafna')).toBe('mountain-view-dafna')
    expect(normalizeSiteAddress('nof.harim')).toBe('nof-harim')
  })

  it('drops characters a hostname cannot contain and caps the length', () => {
    expect(normalizeSiteAddress('נוף!@#abc')).toBe('abc')
    expect(normalizeSiteAddress('a'.repeat(40))).toHaveLength(30)
  })
})

describe('validateSiteAddress', () => {
  it('accepts lowercase letters, digits and inner hyphens', () => {
    expect(validateSiteAddress('nof-harim-dafna')).toBeNull()
    expect(validateSiteAddress('villa2')).toBeNull()
  })

  it('reports why an address is not usable', () => {
    expect(validateSiteAddress('')).toBe('empty')
    expect(validateSiteAddress('ab')).toBe('too_short')
    expect(validateSiteAddress('a'.repeat(31))).toBe('too_long')
    expect(validateSiteAddress('-dafna')).toBe('invalid')
    expect(validateSiteAddress('dafna-')).toBe('invalid')
    expect(validateSiteAddress('Dafna')).toBe('invalid')
    expect(validateSiteAddress('dashboard')).toBe('reserved')
    expect(validateSiteAddress('www')).toBe('reserved')
  })
})

describe('transliterateHebrew', () => {
  it('maps Hebrew letters to a readable Latin approximation', () => {
    expect(transliterateHebrew('נוף')).toBe('nof')
    expect(transliterateHebrew('דפנה')).toBe('dfna')
    expect(transliterateHebrew('וילה')).toBe('vila')
  })
})

describe('suggestSiteAddress', () => {
  it('prefers an English property name', () => {
    expect(suggestSiteAddress({ name: 'Mountain View Dafna', city: 'Dafna' })).toBe('mountain-view-dafna')
  })

  it('falls back to the English city, then to the transliterated name', () => {
    expect(suggestSiteAddress({ name: 'נוף הרים בדפנה', city: 'Dafna' })).toBe('dafna')
    expect(suggestSiteAddress({ name: 'נוף הרים', city: '' })).toBe('nof-hrim')
  })

  it('returns an empty suggestion when nothing valid remains', () => {
    expect(suggestSiteAddress({ name: '!!', city: '' })).toBe('')
    expect(suggestSiteAddress({ name: 'Admin', city: '' })).toBe('')
  })
})

describe('buildSiteHost', () => {
  it('puts the address under the Hostly domain', () => {
    expect(buildSiteHost('dafna')).toBe('dafna.hostly.co.il')
  })
})
