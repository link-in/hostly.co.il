import type { ConnectionRecord } from '../connections/types'
import type { PromotionsDeps } from './ports'

const DAY_MS = 24 * 60 * 60 * 1000
export const EXPIRY_WARNING_DAYS = 7

export interface HealthSummary {
  checked: number
  expired: number
  expiringSoon: number
  failed: number
}

export function expiresSoon(connection: Pick<ConnectionRecord, 'tokenExpiresAt'>, now: Date): boolean {
  if (!connection.tokenExpiresAt) return false
  return new Date(connection.tokenExpiresAt).getTime() - now.getTime() <= EXPIRY_WARNING_DAYS * DAY_MS
}

async function checkOne(deps: PromotionsDeps, connection: ConnectionRecord, now: Date, summary: HealthSummary) {
  const publisher = deps.publishers.get(connection.channel)
  const valid = await publisher.verifyConnection(deps.credentials(connection))
  const host = await deps.hosts.load(connection.userId)

  if (!valid) {
    await deps.store.updateConnection(connection.userId, connection.channel, { status: 'expired' })
    summary.expired += 1
    if (host) await deps.notifier.connectionNeedsAttention(host, publisher.label, true)
    return
  }
  if (expiresSoon(connection, now)) {
    summary.expiringSoon += 1
    if (host) await deps.notifier.connectionNeedsAttention(host, publisher.label, false)
  }
}

/** Daily: mark revoked/expired channel tokens and warn hosts before they expire. */
export async function checkConnectionHealth(deps: PromotionsDeps, now: Date = new Date()): Promise<HealthSummary> {
  const summary: HealthSummary = { checked: 0, expired: 0, expiringSoon: 0, failed: 0 }
  for (const connection of await deps.store.listConnectionsByStatus(['active', 'pending_setup'])) {
    summary.checked += 1
    try {
      await checkOne(deps, connection, now, summary)
    } catch (err) {
      summary.failed += 1
      console.error(`[Promotions] connection health check failed for ${connection.userId}/${connection.channel}:`, err)
    }
  }
  return summary
}
