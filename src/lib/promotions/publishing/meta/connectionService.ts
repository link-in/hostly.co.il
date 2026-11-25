import { encryptAccessToken, toCredentials } from '../../connections/credentials'
import {
  getConnection,
  saveConnectionToken,
  updateConnection,
} from '../../connections/repository'
import type { ConnectionSummary } from '../../connections/types'
import { getPublisher } from '../registry'
import { resolveAssetSelection, type MetaAssetSelection, type SelectionResult } from './assetSelection'
import { createGraphClient } from './graphClient'
import { exchangeCodeForLongLivedToken, listMetaAssetOptions, type MetaAppConfig, type MetaAssetOptions } from './oauth'

const CHANNEL = 'meta_ads' as const

export async function getMetaConnectionSummary(userId: string): Promise<ConnectionSummary | null> {
  const connection = await getConnection(userId, CHANNEL)
  if (!connection) return null
  return {
    channel: CHANNEL,
    status: connection.status,
    tokenExpiresAt: connection.tokenExpiresAt,
    assets: connection.assets,
    monthlyBudgetCap: connection.monthlyBudgetCap,
    ready: connection.status === 'active' && getPublisher(CHANNEL).isReady(connection.assets),
  }
}

/** OAuth callback: store the encrypted long-lived token; the host picks assets next. */
export async function completeMetaOAuth(userId: string, code: string, config: MetaAppConfig): Promise<void> {
  const token = await exchangeCodeForLongLivedToken(config, code)
  await saveConnectionToken({
    userId,
    channel: CHANNEL,
    accessTokenEnc: encryptAccessToken(token.accessToken),
    tokenExpiresAt: token.expiresAt,
  })
}

async function graphClientFor(userId: string) {
  const connection = await getConnection(userId, CHANNEL)
  if (!connection || connection.status === 'revoked') return null
  return createGraphClient({
    accessToken: toCredentials(connection).accessToken,
    version: process.env.META_GRAPH_VERSION || undefined,
  })
}

export async function loadMetaAssetOptions(userId: string): Promise<MetaAssetOptions | null> {
  const client = await graphClientFor(userId)
  return client ? listMetaAssetOptions(client) : null
}

export async function selectMetaAssets(userId: string, selection: MetaAssetSelection): Promise<SelectionResult> {
  const options = await loadMetaAssetOptions(userId)
  if (!options) return { ok: false, error: 'אין חיבור ל-Meta' }
  const result = resolveAssetSelection(selection, options)
  if (!result.ok) return result
  await updateConnection(userId, CHANNEL, {
    assets: result.assets,
    monthlyBudgetCap: selection.monthlyBudgetCap,
    status: 'active',
  })
  return result
}

export async function disconnectMeta(userId: string): Promise<void> {
  await updateConnection(userId, CHANNEL, { status: 'revoked', assets: {} })
}
