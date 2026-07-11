import type { BrowserContext } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { E2E_DEMO_USER, E2E_NEXTAUTH_SECRET } from '../constants'

/**
 * Injects a signed NextAuth session-token cookie directly, bypassing the
 * login form entirely. This keeps the E2E suite independent of any real
 * Supabase-backed user/credentials store — the only thing that needs to
 * match is `NEXTAUTH_SECRET` (see `playwright.config.ts`'s `webServer.env`).
 */
export async function signInAsDemoUser(context: BrowserContext, baseURL: string): Promise<void> {
  const token = await encode({
    token: {
      ...E2E_DEMO_USER,
      sub: E2E_DEMO_USER.id,
      issuedAt: Date.now(),
    },
    secret: E2E_NEXTAUTH_SECRET,
  })

  const { hostname } = new URL(baseURL)

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      domain: hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}
