import { exceedsMonthlyCap } from '../eligibility'
import { todayInIsrael } from '../domain/dates'
import type { CampaignEdit, IsoDate, PromotionCampaign } from '../domain/types'
import { monthStart } from './createDrafts'
import type { PromotionsDeps } from './ports'

const HOUR_MS = 60 * 60 * 1000
/** Meta needs lifetime-budget ad sets to run at least a day. */
export const MIN_RUN_MS = 24 * HOUR_MS

export type ActionErrorCode =
  | 'not_found'
  | 'invalid_state'
  | 'too_late'
  | 'no_connection'
  | 'monthly_cap_exceeded'
  | 'launch_failed'
  | 'stop_failed'

export type ActionResult =
  | { ok: true; campaign: PromotionCampaign }
  | { ok: false; code: ActionErrorCode; message: string }

function fail(code: ActionErrorCode, message: string): ActionResult {
  return { ok: false, code, message }
}

/**
 * Ads run from now until the end of the check-in day (Israel), and at least MIN_RUN_MS.
 * Null when there isn't a full day left before check-in ends.
 */
export function campaignSchedule(now: Date, checkIn: IsoDate): { start: Date; end: Date } | null {
  const checkInDayEnd = new Date(`${checkIn}T21:00:00.000Z`)
  const checkInNoon = new Date(`${checkIn}T10:00:00.000Z`)
  const end = new Date(Math.max(checkInNoon.getTime(), now.getTime() + MIN_RUN_MS))
  return end > checkInDayEnd ? null : { start: now, end }
}

async function reload(deps: PromotionsDeps, campaign: PromotionCampaign): Promise<PromotionCampaign> {
  return (await deps.store.getCampaign(campaign.userId, campaign.id)) ?? campaign
}

async function loadPending(deps: PromotionsDeps, userId: string, campaignId: string) {
  const campaign = await deps.store.getCampaign(userId, campaignId)
  if (!campaign) return { error: fail('not_found', 'הקמפיין לא נמצא') }
  if (campaign.status !== 'pending_approval') return { error: fail('invalid_state', 'הקמפיין כבר טופל') }
  return { campaign }
}

export async function editCampaign(
  deps: PromotionsDeps,
  userId: string,
  campaignId: string,
  edit: CampaignEdit,
): Promise<ActionResult> {
  const loaded = await loadPending(deps, userId, campaignId)
  if (loaded.error) return loaded.error
  await deps.store.updateCampaign(campaignId, { content: edit.content, totalBudget: edit.totalBudget })
  return { ok: true, campaign: await reload(deps, loaded.campaign) }
}

export async function rejectCampaign(deps: PromotionsDeps, userId: string, campaignId: string): Promise<ActionResult> {
  const loaded = await loadPending(deps, userId, campaignId)
  if (loaded.error) return loaded.error
  const won = await deps.store.transitionCampaign(campaignId, 'pending_approval', { status: 'rejected' })
  if (!won) return fail('invalid_state', 'הקמפיין כבר טופל')
  return { ok: true, campaign: await reload(deps, loaded.campaign) }
}

async function checkLaunchPreconditions(deps: PromotionsDeps, campaign: PromotionCampaign, now: Date) {
  const schedule = campaignSchedule(now, campaign.checkIn)
  if (!schedule) return { error: fail('too_late', 'לא נשאר מספיק זמן לפרסום לפני תאריך ההגעה') }

  const connection = await deps.store.getConnection(campaign.userId, campaign.channel)
  const publisher = deps.publishers.get(campaign.channel)
  if (connection?.status !== 'active' || !publisher.isReady(connection.assets)) {
    return { error: fail('no_connection', `צריך לחבר את ${publisher.label} לפני האישור`) }
  }

  const committed = await deps.store.sumCommittedBudget(campaign.userId, campaign.channel, monthStart(todayInIsrael(now)))
  if (exceedsMonthlyCap(committed, campaign.totalBudget, connection.monthlyBudgetCap)) {
    return { error: fail('monthly_cap_exceeded', 'האישור יחרוג מתקרת התקציב החודשית') }
  }
  return { schedule, connection, publisher }
}

/** Host approval: the only path that spends money. Publishes and records the channel ids. */
export async function approveCampaign(
  deps: PromotionsDeps,
  userId: string,
  campaignId: string,
  now: Date = new Date(),
): Promise<ActionResult> {
  const loaded = await loadPending(deps, userId, campaignId)
  if (loaded.error) return loaded.error
  const campaign = loaded.campaign

  const pre = await checkLaunchPreconditions(deps, campaign, now)
  if (pre.error) {
    if (pre.error.ok === false && pre.error.code === 'too_late') {
      await deps.store.transitionCampaign(campaignId, 'pending_approval', { status: 'expired' })
    }
    return pre.error
  }

  const won = await deps.store.transitionCampaign(campaignId, 'pending_approval', {
    status: 'launching',
    approvedAt: now.toISOString(),
  })
  if (!won) return fail('invalid_state', 'הקמפיין כבר טופל')

  try {
    const result = await pre.publisher.launch(deps.credentials(pre.connection), {
      campaignId: campaign.id,
      name: `Hostly – ${campaign.roomName ?? campaign.roomId} – ${campaign.checkIn}`,
      content: campaign.content,
      imageUrls: campaign.imageUrls,
      landingUrl: campaign.landingUrl,
      totalBudget: campaign.totalBudget,
      currency: campaign.currency,
      audience: campaign.audience,
      startTime: pre.schedule.start,
      endTime: pre.schedule.end,
    })
    await deps.store.updateCampaign(campaignId, {
      status: 'active',
      externalIds: result.externalIds,
      launchedAt: new Date().toISOString(),
      error: null,
    })
    return { ok: true, campaign: await reload(deps, campaign) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await deps.store.updateCampaign(campaignId, { status: 'failed', error: message })
    const host = await deps.hosts.load(userId)
    if (host) await deps.notifier.launchFailed(host, campaign, message).catch(() => {})
    return fail('launch_failed', message)
  }
}

export async function stopCampaign(
  deps: PromotionsDeps,
  userId: string,
  campaignId: string,
  now: Date = new Date(),
): Promise<ActionResult> {
  const campaign = await deps.store.getCampaign(userId, campaignId)
  if (!campaign) return fail('not_found', 'הקמפיין לא נמצא')
  if (campaign.status !== 'active') return fail('invalid_state', 'אפשר לעצור רק קמפיין פעיל')

  const connection = await deps.store.getConnection(userId, campaign.channel)
  try {
    if (connection) {
      await deps.publishers.get(campaign.channel).stop(deps.credentials(connection), campaign.externalIds)
    }
  } catch (err) {
    return fail('stop_failed', err instanceof Error ? err.message : String(err))
  }
  await deps.store.updateCampaign(campaignId, { status: 'stopped', stopReason: 'manual', stoppedAt: now.toISOString() })
  return { ok: true, campaign: await reload(deps, campaign) }
}
