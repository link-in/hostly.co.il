import { decryptSecret, encryptSecret } from '@/lib/security/secretBox'
import type { ChannelCredentials } from '../publishing/types'
import type { ConnectionRecord } from './types'

function encryptionKey(env: NodeJS.ProcessEnv): string | undefined {
  return env.PROMOTIONS_ENCRYPTION_KEY
}

export function encryptAccessToken(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return encryptSecret(token, encryptionKey(env))
}

export function toCredentials(connection: ConnectionRecord, env: NodeJS.ProcessEnv = process.env): ChannelCredentials {
  return {
    accessToken: decryptSecret(connection.accessTokenEnc, encryptionKey(env)),
    assets: connection.assets,
  }
}
