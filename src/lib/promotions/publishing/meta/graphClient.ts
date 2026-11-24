import { z } from 'zod'

export const DEFAULT_GRAPH_VERSION = 'v21.0'

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

const graphErrorSchema = z.object({
  error: z.object({ message: z.string(), code: z.number().optional() }),
})

export type GraphParams = Record<string, string | number | boolean | object | undefined>

export interface GraphClientOptions {
  accessToken: string
  version?: string
  fetchImpl?: typeof fetch
}

export interface GraphClient {
  get<T>(path: string, params: GraphParams, schema: z.ZodType<T>): Promise<T>
  post<T>(path: string, params: GraphParams, schema: z.ZodType<T>): Promise<T>
  delete(path: string): Promise<void>
}

function encodeParams(params: GraphParams): URLSearchParams {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  return search
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const parsed = graphErrorSchema.safeParse(body)
    const message = parsed.success ? parsed.data.error.message : `HTTP ${response.status}`
    throw new MetaApiError(message, response.status, parsed.success ? parsed.data.error.code : undefined)
  }
  return schema.parse(body)
}

/** Thin Graph API wrapper: form-encoded params, zod-validated responses, typed errors. */
export function createGraphClient(options: GraphClientOptions): GraphClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const base = `https://graph.facebook.com/${options.version ?? DEFAULT_GRAPH_VERSION}`

  function url(path: string, params: GraphParams = {}): string {
    const search = encodeParams({ ...params, access_token: options.accessToken })
    return `${base}/${path.replace(/^\//, '')}?${search.toString()}`
  }

  return {
    async get(path, params, schema) {
      return parseResponse(await fetchImpl(url(path, params)), schema)
    },
    async post(path, params, schema) {
      const response = await fetchImpl(`${base}/${path.replace(/^\//, '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeParams({ ...params, access_token: options.accessToken }).toString(),
      })
      return parseResponse(response, schema)
    },
    async delete(path) {
      await parseResponse(await fetchImpl(url(path), { method: 'DELETE' }), z.unknown())
    },
  }
}

export const idResponseSchema = z.object({ id: z.string() })
export const successResponseSchema = z.object({ success: z.boolean() })
