import { vi } from 'vitest'
import type { CampaignPatch, NewCampaign } from '@/lib/promotions/campaigns/repository'
import type { ConnectionRecord } from '@/lib/promotions/connections/types'
import { templateContentGenerator } from '@/lib/promotions/content/providers/template'
import { addDays } from '@/lib/promotions/domain/dates'
import { DEFAULT_AUDIENCE, type AvailabilityDay, type PromotionCampaign, type PromotionRule } from '@/lib/promotions/domain/types'
import type { HostProfile } from '@/lib/promotions/hosts/hostProfile'
import type { HostNotifier } from '@/lib/promotions/notifications/hostNotifier'
import type { PromotionsDeps } from '@/lib/promotions/pipeline/ports'
import type { ChannelPublisher } from '@/lib/promotions/publishing/types'

export const HOST: HostProfile = {
  userId: 'u1',
  displayName: 'וילה',
  phones: ['972500000000'],
  rooms: [
    { id: 'r1', name: 'סוויטה' },
    { id: 'r2', name: null },
  ],
  site: {
    url: 'https://villa.hostly.co.il',
    title: 'וילה בגליל',
    city: 'ראש פינה',
    imageUrls: ['https://img.example/cover.jpg'],
  },
}

export function makeRule(overrides: Partial<PromotionRule> = {}): PromotionRule {
  return {
    id: 'rule1',
    userId: 'u1',
    name: 'סופ״ש',
    trigger: 'weekend',
    roomId: 'r1',
    daysBefore: 7,
    minFreeNights: 1,
    dailyBudget: 40,
    maxTotalBudget: 200,
    discountPct: null,
    audience: DEFAULT_AUDIENCE,
    channels: ['meta_ads'],
    enabled: true,
    ...overrides,
  }
}

export function makeConnection(overrides: Partial<ConnectionRecord> = {}): ConnectionRecord {
  return {
    id: 'conn1',
    userId: 'u1',
    channel: 'meta_ads',
    status: 'active',
    accessTokenEnc: 'enc',
    tokenExpiresAt: null,
    assets: { adAccountId: 'act_1', pageId: '2' },
    monthlyBudgetCap: null,
    ...overrides,
  }
}

/** Every date from `from` for `days` days is free unless listed in `blocked`. */
export function freeCalendar(from: string, days: number, blocked: string[] = []): AvailabilityDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i)
    return { date, available: !blocked.includes(date), price: 600 }
  })
}

export function createFakePublisher(overrides: Partial<ChannelPublisher> = {}): ChannelPublisher {
  return {
    channel: 'meta_ads',
    label: 'Facebook ו-Instagram',
    isReady: (assets) => Boolean(assets.adAccountId && assets.pageId),
    verifyConnection: vi.fn(async () => true),
    launch: vi.fn(async () => ({ externalIds: { campaignId: 'meta-c1' } })),
    stop: vi.fn(async () => {}),
    fetchStats: vi.fn(async () => ({ spend: 10, clicks: 5, impressions: 100, reach: 90 })),
    ...overrides,
  }
}

export function createFakeNotifier(): HostNotifier & { [K in keyof HostNotifier]: ReturnType<typeof vi.fn> } {
  return {
    draftsReady: vi.fn(async () => {}),
    launchFailed: vi.fn(async () => {}),
    connectionNeedsAttention: vi.fn(async () => {}),
  }
}

export interface FakeWorld {
  rules: PromotionRule[]
  connections: ConnectionRecord[]
  campaigns: PromotionCampaign[]
  calendar: AvailabilityDay[]
  host: HostProfile | null
}

function applyPatch(campaign: PromotionCampaign, patch: CampaignPatch) {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
  Object.assign(campaign, defined)
}

function newCampaign(input: NewCampaign, index: number): PromotionCampaign {
  return {
    ...input,
    id: `c${index}`,
    status: 'pending_approval',
    externalIds: {},
    stats: {},
    error: null,
    stopReason: null,
    approvedAt: null,
    launchedAt: null,
    stoppedAt: null,
    createdAt: '2026-11-24T08:00:00Z',
  }
}

export function createFakeDeps(world: Partial<FakeWorld> = {}) {
  const state: FakeWorld = {
    rules: world.rules ?? [makeRule()],
    connections: world.connections ?? [makeConnection()],
    campaigns: world.campaigns ?? [],
    calendar: world.calendar ?? freeCalendar('2026-11-20', 40),
    host: world.host === undefined ? HOST : world.host,
  }
  const publisher = createFakePublisher()
  const notifier = createFakeNotifier()

  const deps: PromotionsDeps = {
    store: {
      listEnabledRules: async () => state.rules.filter((rule) => rule.enabled),
      getConnection: async (userId, channel) =>
        state.connections.find((c) => c.userId === userId && c.channel === channel) ?? null,
      listConnectionsByStatus: async (statuses) => state.connections.filter((c) => statuses.includes(c.status)),
      updateConnection: async (userId, channel, patch) => {
        const connection = state.connections.find((c) => c.userId === userId && c.channel === channel)
        if (connection) Object.assign(connection, patch)
      },
      listCampaignWindows: async (userId) =>
        state.campaigns
          .filter((c) => c.userId === userId)
          .map(({ roomId, channel, checkIn, checkOut }) => ({ roomId, channel, checkIn, checkOut })),
      sumCommittedBudget: async (userId, channel) =>
        state.campaigns
          .filter((c) => c.userId === userId && c.channel === channel && ['launching', 'active', 'stopped', 'expired'].includes(c.status))
          .reduce((sum, c) => sum + c.totalBudget, 0),
      insertCampaign: async (input) => {
        const duplicate = state.campaigns.some(
          (c) =>
            c.userId === input.userId &&
            c.roomId === input.roomId &&
            c.channel === input.channel &&
            c.checkIn === input.checkIn &&
            c.checkOut === input.checkOut,
        )
        if (duplicate) return null
        const campaign = newCampaign(input, state.campaigns.length + 1)
        state.campaigns.push(campaign)
        return { ...campaign }
      },
      getCampaign: async (userId, id) => {
        const campaign = state.campaigns.find((c) => c.userId === userId && c.id === id)
        return campaign ? { ...campaign } : null
      },
      listCampaignsByStatus: async (statuses) => state.campaigns.filter((c) => statuses.includes(c.status)).map((c) => ({ ...c })),
      updateCampaign: async (id, patch) => {
        const campaign = state.campaigns.find((c) => c.id === id)
        if (campaign) applyPatch(campaign, patch)
      },
      transitionCampaign: async (id, from, patch) => {
        const campaign = state.campaigns.find((c) => c.id === id)
        if (!campaign || campaign.status !== from) return false
        applyPatch(campaign, patch)
        return true
      },
    },
    hosts: { load: async () => state.host },
    availability: {
      getDays: async (_userId, _roomId, from, to) => state.calendar.filter((day) => day.date >= from && day.date <= to),
    },
    content: templateContentGenerator,
    publishers: { get: () => publisher },
    credentials: (connection) => ({ accessToken: 'token', assets: connection.assets }),
    notifier,
  }

  return { deps, state, publisher, notifier }
}

export function seedCampaign(overrides: Partial<PromotionCampaign> = {}): PromotionCampaign {
  return {
    id: 'c1',
    userId: 'u1',
    ruleId: 'rule1',
    channel: 'meta_ads',
    trigger: 'weekend',
    roomId: 'r1',
    roomName: 'סוויטה',
    checkIn: '2026-11-26',
    checkOut: '2026-11-28',
    status: 'pending_approval',
    content: {
      headline: 'סופ״ש פנוי',
      primaryText: 'בואו',
      description: '',
      callToAction: 'BOOK_TRAVEL',
      hashtags: [],
    },
    imageUrls: ['https://img.example/cover.jpg'],
    landingUrl: 'https://villa.hostly.co.il/?checkin=2026-11-26',
    totalBudget: 80,
    currency: 'ILS',
    audience: DEFAULT_AUDIENCE,
    nightlyPrice: 600,
    externalIds: {},
    stats: {},
    error: null,
    stopReason: null,
    approvedAt: null,
    launchedAt: null,
    stoppedAt: null,
    createdAt: '2026-11-24T08:00:00Z',
    ...overrides,
  }
}
