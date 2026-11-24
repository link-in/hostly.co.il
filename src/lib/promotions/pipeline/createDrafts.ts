import { planCampaignBudget } from '../domain/budget'
import { buildLandingUrl } from '../domain/landingUrl'
import type { AvailabilityDay, ChannelId, IsoDate, Opportunity, PromotionCampaign, PromotionRule } from '../domain/types'
import { checkEligibility, type ExistingCampaignWindow, type IneligibleReason } from '../eligibility'
import type { HostProfile, HostRoom } from '../hosts/hostProfile'
import { getDetector } from '../opportunities/registry'
import type { PromotionsDeps } from './ports'

export interface DraftRunSummary {
  hosts: number
  opportunities: number
  drafts: number
  skipped: Partial<Record<IneligibleReason | 'duplicate', number>>
  failed: number
}

function emptySummary(): DraftRunSummary {
  return { hosts: 0, opportunities: 0, drafts: 0, skipped: {}, failed: 0 }
}

function countSkip(summary: DraftRunSummary, reason: IneligibleReason | 'duplicate') {
  summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1
}

export function groupRulesByUser(rules: PromotionRule[]): Map<string, PromotionRule[]> {
  const byUser = new Map<string, PromotionRule[]>()
  for (const rule of rules) byUser.set(rule.userId, [...(byUser.get(rule.userId) ?? []), rule])
  return byUser
}

export function roomsForRule(rule: PromotionRule, host: HostProfile): HostRoom[] {
  if (!rule.roomId) return host.rooms
  return [host.rooms.find((room) => room.id === rule.roomId) ?? { id: rule.roomId, name: null }]
}

export function monthStart(today: IsoDate): string {
  return `${today.slice(0, 7)}-01T00:00:00.000Z`
}

function lowestPrice(opportunity: Opportunity): number | null {
  const prices = opportunity.nights.map((night) => night.price).filter((price): price is number => price !== null)
  return prices.length ? Math.min(...prices) : null
}

/** Per-host state shared across that host's rules so overlapping rules don't double-draft. */
interface HostRun {
  host: HostProfile
  windows: ExistingCampaignWindow[]
  committed: Map<ChannelId, number>
  availability: Map<string, AvailabilityDay[]>
  created: PromotionCampaign[]
}

async function loadDays(deps: PromotionsDeps, run: HostRun, roomId: string, today: IsoDate, horizon: IsoDate) {
  const key = `${roomId}|${horizon}`
  if (!run.availability.has(key)) {
    run.availability.set(key, await deps.availability.getDays(run.host.userId, roomId, today, horizon))
  }
  return run.availability.get(key)!
}

async function committedBudget(deps: PromotionsDeps, run: HostRun, channel: ChannelId, today: IsoDate) {
  if (!run.committed.has(channel)) {
    run.committed.set(channel, await deps.store.sumCommittedBudget(run.host.userId, channel, monthStart(today)))
  }
  return run.committed.get(channel)!
}

async function draftForChannel(
  deps: PromotionsDeps,
  run: HostRun,
  rule: PromotionRule,
  room: HostRoom,
  opportunity: Opportunity,
  channel: ChannelId,
  today: IsoDate,
  summary: DraftRunSummary,
) {
  const connection = await deps.store.getConnection(run.host.userId, channel)
  const publisher = deps.publishers.get(channel)
  const plannedBudget = planCampaignBudget(rule, today, opportunity.checkIn)
  const site = run.host.site

  const eligibility = checkEligibility({
    opportunity,
    channel,
    connectionActive: connection?.status === 'active' && publisher.isReady(connection.assets),
    imageUrls: site?.imageUrls ?? [],
    siteUrl: site?.url ?? null,
    existingCampaigns: run.windows,
    plannedBudget,
    monthlyCommitted: await committedBudget(deps, run, channel, today),
    monthlyCap: connection?.monthlyBudgetCap ?? null,
  })
  if (!eligibility.eligible) return countSkip(summary, eligibility.reason)

  const nightlyPrice = lowestPrice(opportunity)
  const content = await deps.content.generate({
    siteTitle: site!.title,
    roomName: room.name,
    city: site!.city,
    trigger: opportunity.trigger,
    checkIn: opportunity.checkIn,
    checkOut: opportunity.checkOut,
    nights: opportunity.nights.length,
    nightlyPrice,
    discountPct: rule.discountPct,
    currency: 'ILS',
  })

  const campaign = await deps.store.insertCampaign({
    userId: run.host.userId,
    ruleId: rule.id,
    channel,
    trigger: opportunity.trigger,
    roomId: room.id,
    roomName: room.name,
    checkIn: opportunity.checkIn,
    checkOut: opportunity.checkOut,
    content,
    imageUrls: site!.imageUrls,
    landingUrl: buildLandingUrl({
      siteUrl: site!.url,
      channel,
      roomId: room.id,
      checkIn: opportunity.checkIn,
      checkOut: opportunity.checkOut,
    }),
    totalBudget: plannedBudget,
    currency: 'ILS',
    audience: rule.audience,
    nightlyPrice,
  })
  run.windows.push({ roomId: room.id, channel, checkIn: opportunity.checkIn, checkOut: opportunity.checkOut })
  if (!campaign) return countSkip(summary, 'duplicate')
  run.created.push(campaign)
  summary.drafts += 1
}

async function processRule(deps: PromotionsDeps, run: HostRun, rule: PromotionRule, today: IsoDate, summary: DraftRunSummary) {
  const detector = getDetector(rule.trigger)
  const horizon = detector.horizonEnd(today, rule)
  for (const room of roomsForRule(rule, run.host)) {
    const days = await loadDays(deps, run, room.id, today, horizon)
    const opportunities = detector.detect({ roomId: room.id, today, rule, days })
    summary.opportunities += opportunities.length
    for (const opportunity of opportunities) {
      for (const channel of rule.channels) {
        try {
          await draftForChannel(deps, run, rule, room, opportunity, channel, today, summary)
        } catch (err) {
          summary.failed += 1
          console.error(`[Promotions] draft failed for ${run.host.userId}/${room.id}/${opportunity.checkIn}:`, err)
        }
      }
    }
  }
}

async function processHost(
  deps: PromotionsDeps,
  userId: string,
  rules: PromotionRule[],
  today: IsoDate,
  summary: DraftRunSummary,
) {
  const host = await deps.hosts.load(userId)
  if (!host) return
  summary.hosts += 1
  const run: HostRun = {
    host,
    windows: await deps.store.listCampaignWindows(userId, today),
    committed: new Map(),
    availability: new Map(),
    created: [],
  }
  for (const rule of rules) await processRule(deps, run, rule, today, summary)
  await deps.notifier.draftsReady(host, run.created)
}

/** Daily: availability → opportunities → eligible → AI copy → pending_approval drafts → notify host. */
export async function createDrafts(deps: PromotionsDeps, today: IsoDate): Promise<DraftRunSummary> {
  const summary = emptySummary()
  for (const [userId, rules] of groupRulesByUser(await deps.store.listEnabledRules())) {
    try {
      await processHost(deps, userId, rules, today, summary)
    } catch (err) {
      summary.failed += 1
      console.error(`[Promotions] draft run failed for host ${userId}:`, err)
    }
  }
  return summary
}
