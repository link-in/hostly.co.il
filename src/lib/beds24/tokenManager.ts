/**
 * Beds24 Token Manager
 * Manages automatic token refresh when access token expires
 */

interface TokenData {
  accessToken: string
  expiresAt: number // timestamp in milliseconds
  refreshToken: string
}

class Beds24TokenManager {
  private tokenData: TokenData | null = null
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.loadFromEnv()
  }

  /**
   * Load initial tokens from environment variables
   */
  private loadFromEnv() {
    const accessToken = process.env.BEDS24_TOKEN
    const refreshToken = process.env.BEDS24_REFRESH_TOKEN

    if (accessToken && refreshToken) {
      // Assume token expires in 24 hours if we don't have exact expiry
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000
      this.tokenData = {
        accessToken,
        expiresAt,
        refreshToken,
      }
    }
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.tokenData && this.tokenData.expiresAt > Date.now() + 5 * 60 * 1000) {
      return this.tokenData.accessToken
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Start a new refresh
    this.refreshPromise = this.refreshAccessToken()
    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokenData?.refreshToken) {
      throw new Error('No refresh token available. Please set BEDS24_REFRESH_TOKEN in environment variables.')
    }

    const baseUrl = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'
    
    try {
      const response = await fetch(`${baseUrl}/authentication/token`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          refreshToken: this.tokenData.refreshToken,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as {
        token: string
        expiresIn: number
      }

      // Update token data
      this.tokenData = {
        accessToken: data.token,
        expiresAt: Date.now() + data.expiresIn * 1000,
        refreshToken: this.tokenData.refreshToken,
      }

      console.log('[Beds24] Access token refreshed successfully')
      return data.token
    } catch (error) {
      console.error('[Beds24] Token refresh failed:', error)
      throw error
    }
  }

  /**
   * Force refresh the access token (useful after 401/502 errors)
   */
  async forceRefresh(): Promise<string> {
    this.refreshPromise = this.refreshAccessToken()
    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.refreshPromise = null
    }
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
      // Refresh user-specific token
      console.log('[Beds24] Refreshing user-specific token...')
      const refreshResult = await refreshUserToken(userTokens.refreshToken!, userId)
      newToken = refreshResult.token
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
 * Refresh a user-specific token
 * @param refreshToken - The refresh token to use
 * @param userId - Optional user ID to persist the new token to database
 */
async function refreshUserToken(
  refreshToken: string,
  userId?: string
): Promise<{ token: string; expiresIn: number }> {
  const baseUrl = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'
  
  try {
    const response = await fetch(`${baseUrl}/authentication/token`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        refreshToken: refreshToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh user token: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as {
      token: string
      expiresIn: number
    }

    console.log('[Beds24] User-specific token refreshed successfully')
    
    // Update the user's token in the database if userId is provided
    if (userId) {
      try {
        const { updateUser } = await import('@/lib/auth/getUsersDb')
        await updateUser(userId, {
          beds24Token: data.token,
        })
        console.log('[Beds24] User token saved to database successfully')
      } catch (dbError) {
        // Log but don't throw - token refresh succeeded even if DB update failed
        console.error('[Beds24] Failed to save token to database:', dbError)
      }
    }
    
    return data
  } catch (error) {
    console.error('[Beds24] User token refresh failed:', error)
    throw error
  }
}
