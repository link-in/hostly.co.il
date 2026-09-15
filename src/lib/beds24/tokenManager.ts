/**
 * Beds24 Token Manager
 *
 * Token priority (global / admin tokens):
 *   1. In-memory cache (fastest, valid for current server instance)
 *   2. Supabase `beds24_global_tokens` table (persisted across deploys/restarts)
 *   3. Environment variables BEDS24_TOKEN / BEDS24_REFRESH_TOKEN (fallback / seed)
 *
 * Whenever a token is refreshed the new values are written back to Supabase,
 * so the refresh token never expires silently — the app heals itself.
 */

interface TokenData {
  accessToken: string
  expiresAt: number // timestamp in milliseconds
  refreshToken: string
}

// ─── DB helpers (lazy-imported to avoid edge-runtime issues) ─────────────────

async function readGlobalTokensFromDb(): Promise<TokenData | null> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('beds24_global_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('id', 'global')
      .single()

    if (error || !data) return null

    const row = data as { access_token: string; refresh_token: string; expires_at: string }
    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at).getTime(),
    }
  } catch {
    return null
  }
}

async function writeGlobalTokensToDb(tokens: TokenData): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()
    await supabase.from('beds24_global_tokens').upsert({
      id: 'global',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    console.log('[Beds24] Global tokens saved to DB')
  } catch (err) {
    console.error('[Beds24] Failed to save global tokens to DB:', err)
  }
}

// ─── Token Manager class ─────────────────────────────────────────────────────

export class Beds24TokenManager {
  private tokenData: TokenData | null = null
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.loadFromEnv()
  }

  /**
   * Seed in-memory cache from environment variables (fast, synchronous).
   * The DB is checked lazily in getAccessToken() when the env token looks stale.
   */
  private loadFromEnv() {
    const accessToken = process.env.BEDS24_TOKEN
    const refreshToken = process.env.BEDS24_REFRESH_TOKEN

    if (accessToken) {
      // Long-lived tokens (no refresh token) are treated as valid for 1 year.
      // Regular tokens with a refresh token are assumed valid for 24 hours.
      const expiresAt = refreshToken
        ? Date.now() + 24 * 60 * 60 * 1000
        : Date.now() + 365 * 24 * 60 * 60 * 1000
      this.tokenData = {
        accessToken,
        expiresAt,
        refreshToken: refreshToken ?? '',
      }
    }
  }

  /**
   * Get a valid access token.
   * Checks memory → DB → refresh in order.
   */
  async getAccessToken(): Promise<string> {
    const BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

    // 1. In-memory cache hit
    if (this.tokenData && this.tokenData.expiresAt > Date.now() + BUFFER_MS) {
      return this.tokenData.accessToken
    }

    // 2. Check DB for a fresher token (written by a previous refresh)
    const dbTokens = await readGlobalTokensFromDb()
    if (dbTokens && dbTokens.expiresAt > Date.now() + BUFFER_MS) {
      console.log('[Beds24] Loaded fresh global token from DB')
      this.tokenData = dbTokens
      return dbTokens.accessToken
    }

    // 3. Need to refresh — deduplicate concurrent calls
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Use the best refresh token available (DB > in-memory > env)
    if (dbTokens?.refreshToken) {
      this.tokenData = dbTokens // ensure refreshAccessToken uses DB refresh token
    }

    this.refreshPromise = this.refreshAccessToken()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Persists the new tokens to Supabase so they survive restarts/deploys.
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokenData?.refreshToken) {
      throw new Error(
        'No refresh token available. Run the Beds24 token setup from the admin panel.'
      )
    }

    const baseUrl = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

    const response = await fetch(`${baseUrl}/authentication/token`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        refreshToken: this.tokenData.refreshToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh global token: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { token: string; expiresIn: number }

    const newTokenData: TokenData = {
      accessToken: data.token,
      expiresAt: Date.now() + data.expiresIn * 1000,
      refreshToken: this.tokenData.refreshToken,
    }

    // Update in-memory cache
    this.tokenData = newTokenData

    // Persist to DB so the next server instance / deploy picks it up
    await writeGlobalTokensToDb(newTokenData)

    console.log('[Beds24] Global access token refreshed and saved to DB')
    return data.token
  }

  /**
   * Force-refresh the access token (called after 401/502 errors).
   */
  async forceRefresh(): Promise<string> {
    this.refreshPromise = this.refreshAccessToken()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Seed the global tokens from outside (e.g. after an admin invite-code exchange).
   * Writes immediately to DB so the change survives redeploys.
   */
  async seedTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const newTokenData: TokenData = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    }
    this.tokenData = newTokenData
    await writeGlobalTokensToDb(newTokenData)
    console.log('[Beds24] Global tokens seeded from admin')
  }

  /**
   * Setup initial tokens from invite code
   * This should be run once to get the refresh token
   */
  static async setupFromInviteCode(inviteCode: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const baseUrl = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

    const response = await fetch(`${baseUrl}/authentication/setup`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        code: inviteCode,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to setup tokens: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      token: string
      expiresIn: number
      refreshToken: string
    }

    console.log('[Beds24] Tokens setup successfully')
    console.log('Add these to your .env.local:')
    console.log(`BEDS24_TOKEN=${data.token}`)
    console.log(`BEDS24_REFRESH_TOKEN=${data.refreshToken}`)

    return {
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    }
  }
}

// Singleton instance
export const tokenManager = new Beds24TokenManager()

/**
 * Fetch with automatic token refresh on 401/502 errors
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param userTokens - Optional user-specific tokens (if not provided, uses global tokens)
 * @param userId - Optional user ID for persisting refreshed tokens to database
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: RequestInit = {},
  userTokens?: {
    accessToken?: string
    refreshToken?: string
  },
  userId?: string
): Promise<Response> {
  // Determine which tokens to use
  const useUserTokens = userTokens?.accessToken && userTokens?.refreshToken
  
  // Get access token (user-specific or global)
  let token: string
  if (useUserTokens) {
    // Use user-specific token
    token = userTokens.accessToken!
    console.log('[Beds24] Using user-specific token')
  } else {
    // Use global token from environment
    token = await tokenManager.getAccessToken()
    console.log('[Beds24] Using global token')
  }

  // Add token to headers
  const headers = new Headers(options.headers)
  headers.set('token', token)
  headers.set('accept', 'application/json')

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers,
  })

  // If we get 401 or 502, try refreshing the token once
  if (response.status === 401 || response.status === 502) {
    console.log(`[Beds24] Got ${response.status}, refreshing token...`)
    
    let newToken: string
    if (useUserTokens) {
      // Refresh user-specific token (with DB fallback for stale JWTs on mobile)
      console.log('[Beds24] Refreshing user-specific token...')
      try {
        const refreshResult = await refreshUserToken(userTokens.refreshToken!, userId)
        newToken = refreshResult.token
      } catch (userRefreshError) {
        // User-specific refresh exhausted — fall back to global token so the
        // request can still complete (e.g. stale mobile JWT with expired tokens).
        console.warn('[Beds24] User token refresh failed, falling back to global token:', userRefreshError)
        newToken = await tokenManager.forceRefresh()
      }
    } else {
      // Force refresh the global token
      newToken = await tokenManager.forceRefresh()
    }

    // Retry with new token
    headers.set('token', newToken)
    response = await fetch(url, {
      ...options,
      headers,
    })
  }

  return response
}

/**
 * Attempt to call the Beds24 refresh-token endpoint with a given refreshToken.
 * Saves the new accessToken to the DB if userId is provided.
 * Returns null (instead of throwing) when the refresh token is rejected by Beds24.
 */
async function tryRefreshWithToken(
  refreshToken: string,
  userId?: string,
  label = 'user'
): Promise<{ token: string; expiresIn: number } | null> {
  const baseUrl = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

  const response = await fetch(`${baseUrl}/authentication/token`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      refreshToken,
    },
  })

  if (!response.ok) {
    console.warn(`[Beds24] ${label} refresh token rejected: ${response.status} ${response.statusText}`)
    return null
  }

  const data = await response.json() as { token: string; expiresIn: number }

  console.log(`[Beds24] ${label} token refreshed successfully`)

  // Persist the new access token to the database
  if (userId) {
    try {
      const { updateUser } = await import('@/lib/auth/getUsersDb')
      await updateUser(userId, { beds24Token: data.token })
      console.log('[Beds24] User token saved to database successfully')
    } catch (dbError) {
      console.error('[Beds24] Failed to save token to database:', dbError)
    }
  }

  return data
}

/**
 * Refresh a user-specific token.
 *
 * Strategy (in order):
 *   1. Try the refreshToken from the active session (JWT).
 *   2. If that fails AND we have a userId, fetch the latest refreshToken
 *      from the database (an admin or previous request may have updated it)
 *      and try again.
 *   3. Throw only when all attempts are exhausted.
 *
 * @param refreshToken - The refresh token from the current JWT session
 * @param userId       - Optional user ID for DB fallback + token persistence
 */
async function refreshUserToken(
  refreshToken: string,
  userId?: string
): Promise<{ token: string; expiresIn: number }> {
  // Attempt 1: use the session's refresh token
  const result = await tryRefreshWithToken(refreshToken, userId, 'session')
  if (result) return result

  // Attempt 2: fetch the latest refresh token from the DB (mobile / stale JWT)
  if (userId) {
    try {
      console.log('[Beds24] Session refresh token failed — trying latest DB token for user', userId)
      const { getUserById } = await import('@/lib/auth/getUsersDb')
      const dbUser = await getUserById(userId)

      if (dbUser?.beds24RefreshToken && dbUser.beds24RefreshToken !== refreshToken) {
        const dbResult = await tryRefreshWithToken(dbUser.beds24RefreshToken, userId, 'DB')
        if (dbResult) return dbResult
      } else {
        console.warn('[Beds24] DB refresh token is same as session token or missing — skipping DB attempt')
      }
    } catch (dbError) {
      console.error('[Beds24] Failed to fetch user from DB for fallback refresh:', dbError)
    }
  }

  throw new Error('Beds24 token refresh failed: both session and DB refresh tokens were rejected or expired')
}
