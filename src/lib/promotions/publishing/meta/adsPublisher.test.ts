import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { PublishRequest } from '../types'
import { buildAdMessage } from './adMessage'
import { createMetaAdsPublisher } from './adsPublisher'
import { createGraphClient, MetaApiError, type GraphClient } from './graphClient'

const assets = { adAccountId: 'act_123', pageId: '456', instagramUserId: '789' }

const request: PublishRequest = {
  campaignId: 'c1',
  name: 'Hostly – r1 – 2026-11-26',
  content: {
    headline: 'סופ״ש פנוי',
    primaryText: 'בואו לנוח',
    description: 'הזמנה ישירה',
    callToAction: 'BOOK_TRAVEL',
    hashtags: ['#צימר'],
  },
  imageUrls: ['https://img.example/1.jpg'],
  landingUrl: 'https://villa.hostly.co.il/?checkin=2026-11-26',
  totalBudget: 80.5,
  currency: 'ILS',
  audience: { countries: ['IL'], ageMin: 25, ageMax: 60 },
  startTime: new Date('2026-11-24T10:00:00Z'),
  endTime: new Date('2026-11-26T10:00:00Z'),
}

function imageFetch(ok = true) {
  return vi.fn(async () => ({ ok, status: ok ? 200 : 404, arrayBuffer: async () => new ArrayBuffer(4) })) as unknown as typeof fetch
}

function fakeClient(failOn?: string) {
  const calls: Array<{ method: string; path: string; params?: Record<string, unknown> }> = []
  let counter = 0
  const client: GraphClient = {
    async get(path, params, schema) {
      calls.push({ method: 'GET', path, params })
      return schema.parse({ data: [{ spend: '12.5', impressions: '1000', clicks: '40', reach: '800' }] })
    },
    async post(path, params, schema) {
      calls.push({ method: 'POST', path, params })
      if (failOn && path.endsWith(failOn)) throw new MetaApiError('Invalid parameter', 400, 100)
      if (path.endsWith('/adimages')) return schema.parse({ images: { bytes: { hash: 'HASH' } } })
      if (!path.includes('/')) return schema.parse({ success: true })
      counter += 1
      return schema.parse({ id: `id${counter}` })
    },
    async delete(path) {
      calls.push({ method: 'DELETE', path })
    },
  }
  return { client, calls }
}

describe('metaAdsPublisher.launch', () => {
  it('creates campaign → ad set → creative → ad, then activates the campaign', async () => {
    const { client, calls } = fakeClient()
    const publisher = createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch() })

    const result = await publisher.launch({ accessToken: 't', assets }, request)

    expect(result.externalIds).toEqual({ campaignId: 'id1', adSetId: 'id2', creativeId: 'id3', adId: 'id4' })
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST act_123/adimages',
      'POST act_123/campaigns',
      'POST act_123/adsets',
      'POST act_123/adcreatives',
      'POST act_123/ads',
      'POST id1',
    ])
    expect(calls[1].params).toMatchObject({ status: 'PAUSED', objective: 'OUTCOME_TRAFFIC' })
    expect(calls[5].params).toEqual({ status: 'ACTIVE' })
  })

  it('sends a capped lifetime budget in minor units that ends before check-in', async () => {
    const { client, calls } = fakeClient()
    await createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch() }).launch(
      { accessToken: 't', assets },
      request,
    )

    const adSet = calls[2].params!
    expect(adSet.lifetime_budget).toBe(8050)
    expect(adSet.end_time).toBe('2026-11-26T10:00:00.000Z')
    expect(adSet.targeting).toEqual({
      geo_locations: { countries: ['IL'] },
      age_min: 25,
      age_max: 60,
      publisher_platforms: ['facebook', 'instagram'],
    })
  })

  it('builds the creative with page, Instagram account, image and landing link', async () => {
    const { client, calls } = fakeClient()
    await createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch() }).launch(
      { accessToken: 't', assets },
      request,
    )

    expect(calls[3].params?.object_story_spec).toMatchObject({
      page_id: '456',
      instagram_user_id: '789',
      link_data: {
        link: request.landingUrl,
        name: 'סופ״ש פנוי',
        message: 'בואו לנוח\n\n#צימר',
        image_hash: 'HASH',
        call_to_action: { type: 'BOOK_TRAVEL', value: { link: request.landingUrl } },
      },
    })
  })

  it('publishes to Facebook only when no Instagram account is linked', async () => {
    const { client, calls } = fakeClient()
    await createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch() }).launch(
      { accessToken: 't', assets: { adAccountId: 'act_123', pageId: '456' } },
      request,
    )
    expect((calls[2].params?.targeting as { publisher_platforms: string[] }).publisher_platforms).toEqual(['facebook'])
    expect(calls[3].params?.object_story_spec).not.toHaveProperty('instagram_user_id')
  })

  it('deletes the half-built campaign when a later step fails', async () => {
    const { client, calls } = fakeClient('/ads')
    const publisher = createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch() })

    await expect(publisher.launch({ accessToken: 't', assets }, request)).rejects.toThrow('Invalid parameter')
    expect(calls.at(-1)).toEqual({ method: 'DELETE', path: 'id1' })
  })

  it('creates nothing when the image cannot be downloaded or assets are missing', async () => {
    const { client, calls } = fakeClient()
    const publisher = createMetaAdsPublisher({ createClient: () => client, fetchImpl: imageFetch(false) })

    await expect(publisher.launch({ accessToken: 't', assets }, request)).rejects.toThrow(/download/)
    await expect(publisher.launch({ accessToken: 't', assets: {} }, request)).rejects.toThrow(/ad account/)
    expect(calls).toEqual([])
  })
})

describe('metaAdsPublisher stop/stats/isReady', () => {
  it('pauses the campaign', async () => {
    const { client, calls } = fakeClient()
    await createMetaAdsPublisher({ createClient: () => client }).stop({ accessToken: 't', assets }, { campaignId: 'id9' })
    expect(calls).toEqual([{ method: 'POST', path: 'id9', params: { status: 'PAUSED' } }])
  })

  it('maps insights to numbers', async () => {
    const { client } = fakeClient()
    const stats = await createMetaAdsPublisher({ createClient: () => client }).fetchStats(
      { accessToken: 't', assets },
      { campaignId: 'id9' },
    )
    expect(stats).toMatchObject({ spend: 12.5, impressions: 1000, clicks: 40, reach: 800 })
  })

  it('is ready only with a valid ad account and page', () => {
    const publisher = createMetaAdsPublisher()
    expect(publisher.isReady(assets)).toBe(true)
    expect(publisher.isReady({ adAccountId: '123', pageId: '456' })).toBe(false)
    expect(publisher.isReady({})).toBe(false)
  })

  it('omits the hashtag block when there are none', () => {
    expect(buildAdMessage({ ...request.content, hashtags: [] })).toBe('בואו לנוח')
  })
})

describe('graphClient', () => {
  it('sends the token in the POST body and JSON-encodes objects', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: '1' }), { status: 200 }))
    const client = createGraphClient({ accessToken: 'secret', fetchImpl: fetchImpl as unknown as typeof fetch })

    await client.post('act_1/campaigns', { name: 'x', special_ad_categories: [] }, z.object({ id: z.string() }))

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://graph.facebook.com/v21.0/act_1/campaigns')
    const body = new URLSearchParams(String(init.body))
    expect(body.get('access_token')).toBe('secret')
    expect(body.get('special_ad_categories')).toBe('[]')
  })

  it('turns Graph errors into MetaApiError', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: 'Token expired', code: 190 } }), { status: 401 }),
    )
    const client = createGraphClient({ accessToken: 't', fetchImpl: fetchImpl as unknown as typeof fetch })

    await expect(client.delete('id1')).rejects.toMatchObject({ name: 'MetaApiError', status: 401, code: 190 })
  })
})