import type { NewCampaign, CampaignPatch } from '../campaigns/repository'
import type { ConnectionPatch } from '../connections/repository'
import type { ConnectionRecord, ConnectionStatus } from '../connections/types'
import type { ContentGenerator } from '../content/types'
import type { CampaignStatus, ChannelId, IsoDate, PromotionCampaign, PromotionRule } from '../domain/types'
import type { ExistingCampaignWindow } from '../eligibility'
import type { HostProfile } from '../hosts/hostProfile'
import type { HostNotifier } from '../notifications/hostNotifier'
import type { AvailabilitySource } from '../opportunities/availabilitySource'
import type { ChannelCredentials, ChannelPublisher } from '../publishing/types'

/**
 * Everything the promotion flows touch outside pure logic.
 * The flows depend only on these ports, so each piece (storage, AI, channels, notifications)
 * can be replaced or faked independently.
 */
export interface PromotionsStore {
  listEnabledRules(): Promise<PromotionRule[]>
  getConnection(userId: string, channel: ChannelId): Promise<ConnectionRecord | null>
  listConnectionsByStatus(statuses: ConnectionStatus[]): Promise<ConnectionRecord[]>
  updateConnection(userId: string, channel: ChannelId, patch: ConnectionPatch): Promise<void>
  listCampaignWindows(userId: string, fromDate: IsoDate): Promise<ExistingCampaignWindow[]>
  sumCommittedBudget(userId: string, channel: ChannelId, monthStartIso: string): Promise<number>
  insertCampaign(campaign: NewCampaign): Promise<PromotionCampaign | null>
  getCampaign(userId: string, campaignId: string): Promise<PromotionCampaign | null>
  listCampaignsByStatus(statuses: CampaignStatus[]): Promise<PromotionCampaign[]>
  updateCampaign(campaignId: string, patch: CampaignPatch): Promise<void>
  transitionCampaign(
    campaignId: string,
    from: CampaignStatus,
    patch: CampaignPatch & { status: CampaignStatus },
  ): Promise<boolean>
}

export interface PromotionsDeps {
  store: PromotionsStore
  hosts: { load(userId: string): Promise<HostProfile | null> }
  availability: AvailabilitySource
  content: ContentGenerator
  publishers: { get(channel: ChannelId): ChannelPublisher }
  credentials: (connection: ConnectionRecord) => ChannelCredentials
  notifier: HostNotifier
}
