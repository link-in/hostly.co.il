import { describe, it, expect } from 'vitest'
import { validateOwnerPhone, OWNER_PHONE_INVALID_MESSAGE, OWNER_PHONE_REQUIRED_MESSAGE } from './ownerPhone'

describe('validateOwnerPhone', () => {
  it('normalizes an Israeli mobile to international format', () => {
    expect(validateOwnerPhone('0524892229')).toEqual({ ok: true, phone: '+972524892229' })
    expect(validateOwnerPhone('052-489-2229')).toEqual({ ok: true, phone: '+972524892229' })
    expect(validateOwnerPhone(' +972524892229 ')).toEqual({ ok: true, phone: '+972524892229' })
  })

  it('rejects a missing phone', () => {
    expect(validateOwnerPhone('')).toEqual({ ok: false, error: OWNER_PHONE_REQUIRED_MESSAGE })
    expect(validateOwnerPhone('   ')).toEqual({ ok: false, error: OWNER_PHONE_REQUIRED_MESSAGE })
    expect(validateOwnerPhone(undefined)).toEqual({ ok: false, error: OWNER_PHONE_REQUIRED_MESSAGE })
    expect(validateOwnerPhone(null)).toEqual({ ok: false, error: OWNER_PHONE_REQUIRED_MESSAGE })
  })

  it('rejects a malformed phone', () => {
    expect(validateOwnerPhone('12345')).toEqual({ ok: false, error: OWNER_PHONE_INVALID_MESSAGE })
    expect(validateOwnerPhone('abc')).toEqual({ ok: false, error: OWNER_PHONE_INVALID_MESSAGE })
  })
})
