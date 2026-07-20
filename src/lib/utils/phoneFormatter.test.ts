import { describe, it, expect } from 'vitest'
import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from './phoneFormatter'

describe('normalizePhoneNumber', () => {
  it.each([
    ['0528676516',  '+972528676516', 'Israeli mobile 052'],
    ['0501234567',  '+972501234567', 'Israeli mobile 050'],
    ['0521234567',  '+972521234567', 'Israeli mobile 052 (2)'],
    ['0531234567',  '+972531234567', 'Israeli mobile 053'],
    ['0541234567',  '+972541234567', 'Israeli mobile 054'],
    ['052-867-6516', '+972528676516', 'Israeli with dashes'],
    ['050-123-4567', '+972501234567', 'Israeli with dashes (2)'],
    ['052 867 6516', '+972528676516', 'Israeli with spaces'],
    ['+972528676516', '+972528676516', 'Already international'],
    ['972528676516',  '+972528676516', 'International without +'],
    ['528676516',    '+972528676516', 'Missing leading 0'],
    ['021234567',    '+97221234567',  'Jerusalem landline'],
    ['031234567',    '+97231234567',  'Tel Aviv landline'],
  ])('%s → %s (%s)', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected)
  })
})

describe('formatPhoneForDisplay', () => {
  it.each([
    ['0528676516',    '052-867-6516', 'Israeli mobile, already local format'],
    ['972505952822',  '050-595-2822', 'Israeli mobile from Beds24, no leading 0/plus'],
    ['+972505952822', '050-595-2822', 'Israeli mobile, already international'],
    ['052 867 6516',  '052-867-6516', 'Israeli mobile with spaces'],
    ['052-867-6516',  '052-867-6516', 'Israeli mobile with dashes (idempotent)'],
    ['021234567',     '02-123-4567', 'Jerusalem landline'],
    ['+33612345678',  '+33612345678', 'Non-Israeli international number — unchanged'],
    ['',              '', 'Empty string'],
  ])('%s → %s (%s)', (input, expected) => {
    expect(formatPhoneForDisplay(input)).toBe(expected)
  })
})

describe('isValidPhoneNumber', () => {
  it.each([
    ['0528676516',   true,  'Valid Israeli mobile'],
    ['+972528676516', true,  'Valid international'],
    ['123',          false, 'Too short'],
    ['abc',          false, 'Not a number'],
    ['',             false, 'Empty string'],
  ])('%s → %s (%s)', (input, expected) => {
    expect(isValidPhoneNumber(input)).toBe(expected)
  })
})
