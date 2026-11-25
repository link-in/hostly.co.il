import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export interface StatePayload {
  userId: string
  issuedAt: number
  nonce: string
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

/** Tamper-proof OAuth `state`: base64url(JSON) + '.' + HMAC. */
export function createSignedState(userId: string, secret: string, now = Date.now()): string {
  const payload: StatePayload = { userId, issuedAt: now, nonce: randomBytes(8).toString('hex') }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data, secret)}`
}

export function verifySignedState(
  state: string,
  secret: string,
  maxAgeMs: number,
  now = Date.now(),
): StatePayload | null {
  const [data, signature] = state.split('.')
  if (!data || !signature) return null

  const expected = Buffer.from(sign(data, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as StatePayload
    if (typeof payload.userId !== 'string' || typeof payload.issuedAt !== 'number') return null
    if (now - payload.issuedAt > maxAgeMs || payload.issuedAt > now) return null
    return payload
  } catch {
    return null
  }
}
