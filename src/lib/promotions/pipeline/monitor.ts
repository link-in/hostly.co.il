import { addDays } from '../domain/dates'
import type { IsoDate, PromotionCampaign, StopReason } from '../domain/types'
import type { PromotionsDeps } from './ports'

export interface MonitorSummary {
  expiredDrafts: number
  stopped: Partial<Record<StopReason, number>>
  statsUpdated: number
  failed: number
}

/** Pure: should this active campaign stop, and why. */
export function stopReasonFor(
  campaign: Pick<PromotionCampaign, 'checkIn' | 'checkOut'>,
  today: IsoDate,
  nightsAvailable: boolean[],
): StopReason | null {
  if (today >= campaign.checkIn) return 'window_started'
  if (nightsAvailable.length === 0 || nightsAvailable.some((available) => !available)) return 'booked'
  return null
}

async function windowStillFree(deps: PromotionsDeps, campaign: PromotionCampaign): Promise<boolean[]> {
  const lastNight = addDays(campaign.checkOut, -1)
  const days = await deps.availability.getDays(campaign.userId, campaign.roomId, campaign.checkIn, lastNight)
  return days.map((day) => day.available)
}

async function stopOnChannel(deps: PromotionsDeps, campaign: PromotionCampaign, reason: StopReason) {
  const connection = await deps.store.getConnection(campaign.userId, campaign.channel)
  if (connection) {
    await deps.publishers.get(campaign.channel).stop(deps.credentials(connection), campaign.externalIds)
  }
  await deps.store.updateCampaign(campaign.id, {
    status: reason === 'window_started' ? 'expired' : 'stopped',
    stopReason: reason,
    stoppedAt: new Date().toISOString(),
  })
}

async function refreshStats(deps: PromotionsDeps, campaign: PromotionCampaign) {
  const connection = await deps.store.getConnection(campaign.userId, campaign.channel)
  if (!connection) return false
  const stats = await deps.publishers.get(campaign.channel).fetchStats(deps.credentials(connection), campaign.externalIds)
  await deps.store.updateCampaign(campaign.id, { stats })
  return true
}

async function monitorActive(deps: PromotionsDeps, campaign: PromotionCampaign, today: IsoDate, summary: MonitorSummary) {
  const reason = stopReasonFor(campaign, today, await windowStillFree(deps, campaign))
  if (reason) {
    // Final stats before stopping, so the host sees the full spend.
    await refreshStats(deps, campaign).catch(() => false)
    await stopOnChannel(deps, campaign, reason)
    summary.stopped[reason] = (summary.stopped[reason] ?? 0) + 1
    return
  }
  if (await refreshStats(deps, campaign)) summary.statsUpdated += 1
}

/** Periodic: expire stale drafts, stop campaigns whose dates got booked or started, refresh stats. */
export async function monitorCampaigns(deps: PromotionsDeps, today: IsoDate): Promise<MonitorSummary> {
  const summary: MonitorSummary = { expiredDrafts: 0, stopped: {}, statsUpdated: 0, failed: 0 }
  const campaigns = await deps.store.listCampaignsByStatus(['pending_approval', 'active'])

  for (const campaign of campaigns) {
    try {
      if (campaign.status === 'pending_approval') {
        if (today >= campaign.checkIn) {
          await deps.store.transitionCampaign(campaign.id, 'pending_approval', { status: 'expired' })
          summary.expiredDrafts += 1
        }
        continue
      }
      await monitorActive(deps, campaign, today, summary)
    } catch (err) {
      summary.failed += 1
      console.error(`[Promotions] monitor failed for campaign ${campaign.id}:`, err)
    }
  }
  return summary
}
