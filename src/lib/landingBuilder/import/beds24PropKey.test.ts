import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: vi.fn() }))

import { resolvePropKey } from './beds24PropKey'

const STORED = 'stored-key-1234567890'
const ENV = { propKey: 'env-key-1234567890', propertyId: '306559' }

describe('resolvePropKey', () => {
  it("prefers the user's stored key", () => {
    expect(resolvePropKey(` ${STORED} `, '306559', ENV)).toBe(STORED)
  })

  it('uses the env key only for the property it belongs to', () => {
    expect(resolvePropKey(null, '306559', ENV)).toBe(ENV.propKey)
    expect(resolvePropKey(null, '111111', ENV)).toBeNull()
  })

  it('ignores keys shorter than Beds24 allows', () => {
    expect(resolvePropKey('short', '111111', ENV)).toBeNull()
    expect(resolvePropKey(null, '306559', { ...ENV, propKey: 'short' })).toBeNull()
  })
})
