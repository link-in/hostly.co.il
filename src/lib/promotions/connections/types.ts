import type { ChannelId } from '../domain/types'

export type ConnectionStatus = 'pending_setup' | 'active' | 'expired' | 'revoked'

export interface ConnectionRecord {
  id: string
  userId: string
  channel: ChannelId
  status: ConnectionStatus
  accessTokenEnc: string
  tokenExpiresAt: string | null
  assets: Record<string, unknown>
  monthlyBudgetCap: number | null
}

/** Safe to send to the browser: never includes the token. */
export interface ConnectionSummary {
  channel: ChannelId
  status: ConnectionStatus
  tokenExpiresAt: string | null
  assets: Record<string, unknown>
  monthlyBudgetCap: number | null
  ready: boolean
}
