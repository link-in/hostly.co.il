import { z } from 'zod'
import { DEFAULT_GRAPH_VERSION, MetaApiError, type GraphClient } from './graphClient'

/** Permissions requested at connect time. All need Meta App Review for non-test users. */
export const META_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
  'instagram_basic',
] as const

export interface MetaAppConfig {
  appId: string
  appSecret: string
  version: string
  redirectUri: string
}

export function getMetaAppConfig(env: NodeJS.ProcessEnv = process.env): MetaAppConfig | null {
  const appUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL
  if (!env.META_APP_ID || !env.META_APP_SECRET || !appUrl) return null
  return {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    version: env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/meta/oauth/callback`,
  }
}

export function buildMetaAuthorizeUrl(config: MetaAppConfig, state: string): string {
  const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`)
  url.searchParams.set('client_id', config.appId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', META_SCOPES.join(','))
  return url.toString()
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
})

async function requestToken(url: URL, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url.toString())
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`
    throw new MetaApiError(message, response.status)
  }
  return tokenResponseSchema.parse(body)
}

export interface MetaToken {
  accessToken: string
  expiresAt: string | null
}

/** OAuth code → short-lived token → long-lived (~60 days) token. */
export async function exchangeCodeForLongLivedToken(
  config: MetaAppConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<MetaToken> {
  const base = `https://graph.facebook.com/${config.version}/oauth/access_token`

  const shortUrl = new URL(base)
  shortUrl.searchParams.set('client_id', config.appId)
  shortUrl.searchParams.set('client_secret', config.appSecret)
  shortUrl.searchParams.set('redirect_uri', config.redirectUri)
  shortUrl.searchParams.set('code', code)
  const shortLived = await requestToken(shortUrl, fetchImpl)

  const longUrl = new URL(base)
  longUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longUrl.searchParams.set('client_id', config.appId)
  longUrl.searchParams.set('client_secret', config.appSecret)
  longUrl.searchParams.set('fb_exchange_token', shortLived.access_token)
  const longLived = await requestToken(longUrl, fetchImpl)

  return {
    accessToken: longLived.access_token,
    expiresAt: longLived.expires_in ? new Date(now.getTime() + longLived.expires_in * 1000).toISOString() : null,
  }
}

// ─── Asset options (what the host can choose after connecting) ───────────────

const adAccountsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      currency: z.string().optional(),
      account_status: z.number().optional(),
    }),
  ),
})

const pagesSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      instagram_business_account: z.object({ id: z.string(), username: z.string().optional() }).optional(),
    }),
  ),
})

/** Meta `account_status` 1 = ACTIVE. */
const ACTIVE_AD_ACCOUNT = 1

export interface MetaAssetOptions {
  adAccounts: Array<{ id: string; name: string; currency: string | null; active: boolean }>
  pages: Array<{ id: string; name: string; instagram: { id: string; username: string | null } | null }>
}

export async function listMetaAssetOptions(client: GraphClient): Promise<MetaAssetOptions> {
  const [accounts, pages] = await Promise.all([
    client.get('me/adaccounts', { fields: 'id,name,currency,account_status', limit: 100 }, adAccountsSchema),
    client.get('me/accounts', { fields: 'id,name,instagram_business_account{id,username}', limit: 100 }, pagesSchema),
  ])
  return {
    adAccounts: accounts.data.map((account) => ({
      id: account.id,
      name: account.name ?? account.id,
      currency: account.currency ?? null,
      active: account.account_status === undefined || account.account_status === ACTIVE_AD_ACCOUNT,
    })),
    pages: pages.data.map((page) => ({
      id: page.id,
      name: page.name ?? page.id,
      instagram: page.instagram_business_account
        ? { id: page.instagram_business_account.id, username: page.instagram_business_account.username ?? null }
        : null,
    })),
  }
}
