import { describe, expect, it, vi } from 'vitest'
import { resolveAssetSelection } from './assetSelection'
import type { GraphClient } from './graphClient'
import {
  buildMetaAuthorizeUrl,
  exchangeCodeForLongLivedToken,
  getMetaAppConfig,
  listMetaAssetOptions,
  META_SCOPES,
  type MetaAssetOptions,
} from './oauth'

const config = { appId: 'app', appSecret: 'secret', version: 'v21.0', redirectUri: 'https://app.test/api/meta/oauth/callback' }

describe('getMetaAppConfig', () => {
  it('needs app id, secret and an app URL', () => {
    expect(getMetaAppConfig({} as unknown as NodeJS.ProcessEnv)).toBeNull()
    expect(
      getMetaAppConfig({ META_APP_ID: 'a', META_APP_SECRET: 's', NEXT_PUBLIC_APP_URL: 'https://app.test/' } as unknown as NodeJS.ProcessEnv),
    ).toEqual({ appId: 'a', appSecret: 's', version: 'v21.0', redirectUri: 'https://app.test/api/meta/oauth/callback' })
  })
})

describe('buildMetaAuthorizeUrl', () => {
  it('requests the ads scopes with our state and redirect', () => {
    const url = new URL(buildMetaAuthorizeUrl(config, 'STATE'))
    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v21.0/dialog/oauth')
    expect(url.searchParams.get('state')).toBe('STATE')
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri)
    expect(url.searchParams.get('scope')).toBe(META_SCOPES.join(','))
  })
})

describe('exchangeCodeForLongLivedToken', () => {
  it('exchanges the code, then upgrades to a long-lived token with an expiry', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'short' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'long', expires_in: 3600 })))

    const token = await exchangeCodeForLongLivedToken(config, 'CODE', fetchImpl, new Date('2026-11-24T00:00:00Z'))

    expect(token).toEqual({ accessToken: 'long', expiresAt: '2026-11-24T01:00:00.000Z' })
    const second = new URL(fetchImpl.mock.calls[1][0])
    expect(second.searchParams.get('grant_type')).toBe('fb_exchange_token')
    expect(second.searchParams.get('fb_exchange_token')).toBe('short')
  })

  it('surfaces Meta errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Code expired' } }), { status: 400 }),
    )
    await expect(exchangeCodeForLongLivedToken(config, 'CODE', fetchImpl)).rejects.toThrow('Code expired')
  })
})

describe('listMetaAssetOptions', () => {
  it('maps ad accounts and pages with their Instagram accounts', async () => {
    const client: GraphClient = {
      get: async (path, _params, schema) =>
        schema.parse(
          path === 'me/adaccounts'
            ? { data: [{ id: 'act_1', name: 'Main', currency: 'ILS', account_status: 1 }, { id: 'act_2', account_status: 2 }] }
            : { data: [{ id: '10', name: 'Villa', instagram_business_account: { id: '20', username: 'villa' } }, { id: '11' }] },
        ),
      post: async () => {
        throw new Error('unused')
      },
      delete: async () => {},
    }

    expect(await listMetaAssetOptions(client)).toEqual({
      adAccounts: [
        { id: 'act_1', name: 'Main', currency: 'ILS', active: true },
        { id: 'act_2', name: 'act_2', currency: null, active: false },
      ],
      pages: [
        { id: '10', name: 'Villa', instagram: { id: '20', username: 'villa' } },
        { id: '11', name: '11', instagram: null },
      ],
    })
  })
})

describe('resolveAssetSelection', () => {
  const options: MetaAssetOptions = {
    adAccounts: [
      { id: 'act_1', name: 'Main', currency: 'ILS', active: true },
      { id: 'act_2', name: 'Old', currency: 'ILS', active: false },
    ],
    pages: [{ id: '10', name: 'Villa', instagram: { id: '20', username: 'villa' } }],
  }
  const base = { adAccountId: 'act_1', pageId: '10', useInstagram: true, monthlyBudgetCap: null }

  it('builds assets including Instagram', () => {
    expect(resolveAssetSelection(base, options)).toEqual({
      ok: true,
      assets: {
        adAccountId: 'act_1',
        adAccountCurrency: 'ILS',
        pageId: '10',
        pageName: 'Villa',
        instagramUserId: '20',
        instagramUsername: 'villa',
      },
    })
  })

  it('can skip Instagram', () => {
    const result = resolveAssetSelection({ ...base, useInstagram: false }, options)
    expect(result.ok && result.assets.instagramUserId).toBeFalsy()
  })

  it('refuses assets outside the connected account or inactive accounts', () => {
    expect(resolveAssetSelection({ ...base, adAccountId: 'act_9' }, options).ok).toBe(false)
    expect(resolveAssetSelection({ ...base, adAccountId: 'act_2' }, options).ok).toBe(false)
    expect(resolveAssetSelection({ ...base, pageId: '99' }, options).ok).toBe(false)
  })
})
