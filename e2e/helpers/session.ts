import type { BrowserContext } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { E2E_ADMIN_USER, E2E_DEMO_USER, E2E_NEXTAUTH_SECRET } from '../constants'

type SessionUser = typeof E2E_DEMO_USER | typeof E2E_ADMIN_USER

async function addSessionCookie(context: BrowserContext, baseURL: string, user: SessionUser): Promise<void> {
  const token = await encode({
    token: {
      ...user,
      sub: user.id,
      issuedAt: Date.now(),
    },
    secret: E2E_NEXTAUTH_SECRET,
  })

  const { hostname } = new URL(baseURL)
  const base = { value: token, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax' as const }

  // `src/proxy.ts` reads the `__Secure-` cookie under `next start` (NODE_ENV=production),
  // while NextAuth itself reads the plain name because NEXTAUTH_URL is http.
  await context.addCookies([
    { ...base, name: 'next-auth.session-token', secure: false },
    { ...base, name: '__Secure-next-auth.session-token', secure: true },
  ])
}

/**
 * Injects a signed NextAuth session-token cookie directly, bypassing the
 * login form entirely. This keeps the E2E suite independent of any real
 * Supabase-backed user/credentials store — the only thing that needs to
 * match is `NEXTAUTH_SECRET` (see `playwright.config.ts`'s `webServer.env`).
 */
export async function signInAsDemoUser(context: BrowserContext, baseURL: string): Promise<void> {
  await addSessionCookie(context, baseURL, E2E_DEMO_USER)
}

/** Same as above for an arbitrary session payload (e.g. a non-demo owner). */
export async function signInAsUser(
  context: BrowserContext,
  baseURL: string,
  user: SessionUser | (Omit<typeof E2E_DEMO_USER, 'isDemo'> & { isDemo: boolean }),
): Promise<void> {
  await addSessionCookie(context, baseURL, user as SessionUser)
}

export async function signInAsAdmin(context: BrowserContext, baseURL: string): Promise<void> {
  await addSessionCookie(context, baseURL, E2E_ADMIN_USER)
}
