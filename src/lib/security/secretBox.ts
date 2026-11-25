import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const VERSION = 'v1'

function loadKey(base64Key: string | undefined): Buffer {
  if (!base64Key) throw new Error('Encryption key is not configured')
  const key = Buffer.from(base64Key, 'base64')
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes (base64)')
  return key
}

/** AES-256-GCM. Output: 'v1:<iv>:<tag>:<ciphertext>' (base64 parts). */
export function encryptSecret(plaintext: string, base64Key: string | undefined): string {
  const key = loadKey(base64Key)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decryptSecret(payload: string, base64Key: string | undefined): string {
  const key = loadKey(base64Key)
  const [version, iv, tag, ciphertext] = payload.split(':')
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error('Malformed encrypted secret')
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8')
}
