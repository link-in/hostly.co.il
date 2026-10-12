/**
 * In-memory stand-in for `fetchWithTokenRefresh`, routed by `"METHOD /path"`.
 * Records every call (URL, parsed body, tokens) so tests can assert on the
 * exact Beds24 requests the onboarding service makes.
 */

export interface FakeBeds24Reply {
  status?: number
  body: unknown
  headers?: Record<string, string>
}

export interface FakeBeds24Call {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
  userTokens?: { accessToken: string; refreshToken: string }
  userId?: string
}

type Handler = FakeBeds24Reply | ((call: FakeBeds24Call) => FakeBeds24Reply)

const BASE_PATH = '/v2'

export function createFakeBeds24(routes: Record<string, Handler>) {
  const calls: FakeBeds24Call[] = []

  async function fetchImpl(
    url: string,
    options: RequestInit = {},
    userTokens?: { accessToken: string; refreshToken: string },
    userId?: string,
  ): Promise<Response> {
    const parsed = new URL(url)
    const method = (options.method ?? 'GET').toUpperCase()
    const path = parsed.pathname.startsWith(BASE_PATH) ? parsed.pathname.slice(BASE_PATH.length) : parsed.pathname
    const call: FakeBeds24Call = {
      method,
      path,
      query: Object.fromEntries(parsed.searchParams.entries()),
      body: typeof options.body === 'string' ? JSON.parse(options.body) : undefined,
      userTokens,
      userId,
    }
    calls.push(call)

    const handler = routes[`${method} ${path}`]
    if (!handler) {
      return new Response(JSON.stringify({ success: false, error: `no fake for ${method} ${path}` }), { status: 404 })
    }
    const reply = typeof handler === 'function' ? handler(call) : handler
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...reply.headers },
    })
  }

  return {
    fetchImpl,
    calls,
    callsTo: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path),
  }
}
