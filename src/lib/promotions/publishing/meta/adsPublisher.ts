import { z } from 'zod'
import type { CampaignStats } from '../../domain/types'
import type { ChannelCredentials, ChannelPublisher, PublishRequest } from '../types'
import { buildAdMessage } from './adMessage'
import { parseMetaAssets, type MetaAssets } from './assets'
import {
  createGraphClient,
  idResponseSchema,
  MetaApiError,
  successResponseSchema,
  type GraphClient,
  type GraphClientOptions,
} from './graphClient'

/** Currencies Meta bills in minor units (×100). Covers ILS/USD/EUR. */
const MINOR_UNITS = 100
/** Graph "OAuthException": token expired, revoked or password changed. */
const INVALID_TOKEN_CODE = 190

const adImagesResponseSchema = z.object({
  images: z.record(z.string(), z.object({ hash: z.string() })),
})

const insightsResponseSchema = z.object({
  data: z.array(
    z.object({
      spend: z.string().optional(),
      impressions: z.string().optional(),
      clicks: z.string().optional(),
      reach: z.string().optional(),
    }),
  ),
})

export type GraphClientFactory = (options: GraphClientOptions) => GraphClient

export interface MetaAdsPublisherOptions {
  createClient?: GraphClientFactory
  fetchImpl?: typeof fetch
  version?: string
}

function requireAssets(credentials: ChannelCredentials): MetaAssets {
  const assets = parseMetaAssets(credentials.assets)
  if (!assets) throw new Error('Meta connection is missing an ad account or page')
  return assets
}

async function uploadImage(client: GraphClient, assets: MetaAssets, imageUrl: string, fetchImpl: typeof fetch) {
  const image = await fetchImpl(imageUrl)
  if (!image.ok) throw new Error(`Could not download ad image (${image.status})`)
  const bytes = Buffer.from(await image.arrayBuffer()).toString('base64')
  const result = await client.post(`${assets.adAccountId}/adimages`, { bytes }, adImagesResponseSchema)
  const hash = Object.values(result.images)[0]?.hash
  if (!hash) throw new Error('Meta did not return an image hash')
  return hash
}

function buildTargeting(request: PublishRequest, assets: MetaAssets) {
  return {
    geo_locations: { countries: request.audience.countries },
    age_min: request.audience.ageMin,
    age_max: request.audience.ageMax,
    publisher_platforms: assets.instagramUserId ? ['facebook', 'instagram'] : ['facebook'],
  }
}

function buildCreativeSpec(request: PublishRequest, assets: MetaAssets, imageHash: string) {
  return {
    page_id: assets.pageId,
    ...(assets.instagramUserId ? { instagram_user_id: assets.instagramUserId } : {}),
    link_data: {
      link: request.landingUrl,
      message: buildAdMessage(request.content),
      name: request.content.headline,
      description: request.content.description || undefined,
      image_hash: imageHash,
      call_to_action: { type: request.content.callToAction, value: { link: request.landingUrl } },
    },
  }
}

async function createEntities(client: GraphClient, assets: MetaAssets, request: PublishRequest, imageHash: string) {
  const account = assets.adAccountId
  const ids: Record<string, string> = {}

  const campaign = await client.post(
    `${account}/campaigns`,
    { name: request.name, objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: [] },
    idResponseSchema,
  )
  ids.campaignId = campaign.id

  try {
    const adSet = await client.post(
      `${account}/adsets`,
      {
        name: request.name,
        campaign_id: campaign.id,
        lifetime_budget: Math.round(request.totalBudget * MINOR_UNITS),
        start_time: request.startTime.toISOString(),
        end_time: request.endTime.toISOString(),
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: buildTargeting(request, assets),
        status: 'ACTIVE',
      },
      idResponseSchema,
    )
    ids.adSetId = adSet.id

    const creative = await client.post(
      `${account}/adcreatives`,
      { name: request.name, object_story_spec: buildCreativeSpec(request, assets, imageHash) },
      idResponseSchema,
    )
    ids.creativeId = creative.id

    const ad = await client.post(
      `${account}/ads`,
      { name: request.name, adset_id: adSet.id, creative: { creative_id: creative.id }, status: 'ACTIVE' },
      idResponseSchema,
    )
    ids.adId = ad.id

    await client.post(campaign.id, { status: 'ACTIVE' }, successResponseSchema)
    return ids
  } catch (err) {
    // Deleting the campaign removes its ad sets and ads, so nothing half-built keeps spending.
    await client.delete(campaign.id).catch((cleanupErr) => {
      console.error(`[Promotions] Meta rollback failed for campaign ${campaign.id}:`, cleanupErr)
    })
    throw err
  }
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function createMetaAdsPublisher(options: MetaAdsPublisherOptions = {}): ChannelPublisher {
  const fetchImpl = options.fetchImpl ?? fetch
  const createClient =
    options.createClient ?? ((clientOptions) => createGraphClient({ ...clientOptions, fetchImpl, version: options.version }))

  return {
    channel: 'meta_ads',
    label: 'Facebook ו-Instagram',

    isReady(assets) {
      return parseMetaAssets(assets) !== null
    },

    async verifyConnection(credentials) {
      const client = createClient({ accessToken: credentials.accessToken })
      try {
        await client.get('me', { fields: 'id' }, idResponseSchema)
        return true
      } catch (err) {
        if (err instanceof MetaApiError && (err.code === INVALID_TOKEN_CODE || err.status === 401)) return false
        throw err
      }
    },

    async launch(credentials, request) {
      const assets = requireAssets(credentials)
      if (request.imageUrls.length === 0) throw new Error('A campaign needs at least one image')
      const client = createClient({ accessToken: credentials.accessToken })
      const imageHash = await uploadImage(client, assets, request.imageUrls[0], fetchImpl)
      return { externalIds: await createEntities(client, assets, request, imageHash) }
    },

    async stop(credentials, externalIds) {
      if (!externalIds.campaignId) return
      const client = createClient({ accessToken: credentials.accessToken })
      await client.post(externalIds.campaignId, { status: 'PAUSED' }, successResponseSchema)
    },

    async fetchStats(credentials, externalIds): Promise<CampaignStats> {
      if (!externalIds.campaignId) return {}
      const client = createClient({ accessToken: credentials.accessToken })
      const insights = await client.get(
        `${externalIds.campaignId}/insights`,
        { fields: 'spend,impressions,clicks,reach', date_preset: 'maximum' },
        insightsResponseSchema,
      )
      const row = insights.data[0] ?? {}
      return {
        spend: toNumber(row.spend) ?? 0,
        impressions: toNumber(row.impressions) ?? 0,
        clicks: toNumber(row.clicks) ?? 0,
        reach: toNumber(row.reach) ?? 0,
        updatedAt: new Date().toISOString(),
      }
    },
  }
}
