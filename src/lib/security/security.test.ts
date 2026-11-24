import { randomBytes } from 'crypto'
import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from './secretBox'
import { createSignedState, verifySignedState } from './signedState'

const KEY = randomBytes(32).toString('base64')

describe('secretBox', () => {
  it('round-trips and never returns the plaintext', () => {
    const encrypted = encryptSecret('EAAB-token', KEY)
    expect(encrypted).not.toContain('EAAB')
    expect(decryptSecret(encrypted, KEY)).toBe('EAAB-token')
  })

  it('uses a fresh IV each time', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY))
  })

  it('fails with a wrong key, tampering or missing key', () => {
    const encrypted = encryptSecret('secret', KEY)
    expect(() => decryptSecret(encrypted, randomBytes(32).toString('base64'))).toThrow()
    expect(() => decryptSecret(encrypted.slice(0, -2) + 'AA', KEY)).toThrow()
    expect(() => encryptSecret('x', undefined)).toThrow(/not configured/)
    expect(() => encryptSecret('x', Buffer.from('short').toString('base64'))).toThrow(/32 bytes/)
  })
})

describe('signedState', () => {
  const SECRET = 'state-secret'

  it('verifies a fresh state', () => {
    const state = createSignedState('u1', SECRET, 1000)
    expect(verifySignedState(state, SECRET, 60_000, 2000)?.userId).toBe('u1')
  })

  it('rejects expired, tampered or foreign states', () => {
    const state = createSignedState('u1', SECRET, 1000)
    expect(verifySignedState(state, SECRET, 500, 2000)).toBeNull()
    expect(verifySignedState(state, 'other', 60_000, 2000)).toBeNull()
    const [data, sig] = state.split('.')
    const forged = Buffer.from(JSON.stringify({ userId: 'u2', issuedAt: 1000, nonce: 'x' })).toString('base64url')
    expect(verifySignedState(`${forged}.${sig}`, SECRET, 60_000, 2000)).toBeNull()
    expect(verifySignedState(data, SECRET, 60_000, 2000)).toBeNull()
  })
})
