import type { Audience, CampaignContent, CampaignStats, ChannelId } from '../domain/types'

/** Decrypted credentials + channel-specific asset ids (ad account, page…). */
export interface ChannelCredentials {
  accessToken: string
  assets: Record<string, unknown>
}

export interface PublishRequest {
  campaignId: string
  name: string
  content: CampaignContent
  imageUrls: string[]
  landingUrl: string
  totalBudget: number
  currency: string
  audience: Audience
  startTime: Date
  endTime: Date
}

export interface PublishResult {
  externalIds: Record<string, string>
}

/**
 * One external ad / social channel. Knows nothing about availability or how copy is written:
 * it receives a ready campaign and returns the ids it created.
 */
export interface ChannelPublisher {
  channel: ChannelId
  label: string
  /** Whether the connection has everything needed to publish (e.g. ad account + page chosen). */
  isReady(assets: Record<string, unknown>): boolean
  /** False when the token was revoked or expired. Throws on transient errors. */
  verifyConnection(credentials: ChannelCredentials): Promise<boolean>
  launch(credentials: ChannelCredentials, request: PublishRequest): Promise<PublishResult>
  stop(credentials: ChannelCredentials, externalIds: Record<string, string>): Promise<void>
  fetchStats(credentials: ChannelCredentials, externalIds: Record<string, string>): Promise<CampaignStats>
}
