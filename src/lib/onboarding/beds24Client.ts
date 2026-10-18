import type { z } from 'zod'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { extractErrorMessages, isBeds24CreditError } from '@/lib/beds24/creditGuard'
import { hasBeds24Failure } from '@/lib/beds24/responseFailure'
import { BEDS24_BASE_URL } from './constants'
import { assertCreditBudget, readCreditHeaders, recordCreditSnapshot } from './credits'
import { logOnboardingCall } from './auditLog'
import { resolveBeds24Tokens } from './tokens'
import { Beds24RequestError, CreditBudgetError } from './errors'

export interface OnboardingCallContext {
  userId: string
  step: string
}

export interface Beds24Request<T> {
  method: 'GET' | 'POST'
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  schema: z.ZodType<T>
}

function buildUrl(path: string, query?: Beds24Request<unknown>['query']): string {
  const url = new URL(`${BEDS24_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export { hasBeds24Failure }

function describeFailure(status: number, body: unknown): string {
  const messages = extractErrorMessages(body).filter(Boolean)
  return messages.length ? messages.join('; ') : `Beds24 החזירה ${status}`
}

/**
 * Single entry point for every onboarding call to Beds24: credit budget check,
 * token resolution, audit logging and response validation.
 */
export async function beds24Request<T>(ctx: OnboardingCallContext, req: Beds24Request<T>): Promise<T> {
  assertCreditBudget()

  const tokens = await resolveBeds24Tokens(ctx.userId)
  const response = await fetchWithTokenRefresh(
    buildUrl(req.path, req.query),
    {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    },
    tokens,
    tokens ? ctx.userId : undefined,
  )

  const credits = readCreditHeaders(response.headers)
  recordCreditSnapshot(credits)
  const body = parseBody(await response.text())
  const failed = !response.ok || hasBeds24Failure(body)
  const errorMessage = failed ? describeFailure(response.status, body) : undefined

  await logOnboardingCall({
    userId: ctx.userId,
    step: ctx.step,
    method: req.method,
    path: req.path,
    httpStatus: response.status,
    success: !failed,
    error: errorMessage,
    credits,
  })

  if (isBeds24CreditError(response.status, body)) {
    throw new CreditBudgetError(`נגמרו הקרדיטים ב-Beds24: ${errorMessage}`, credits.resetsInSeconds)
  }
  if (failed) {
    throw new Beds24RequestError(errorMessage ?? 'שגיאת Beds24', body)
  }

  const parsed = req.schema.safeParse(body)
  if (!parsed.success) {
    throw new Beds24RequestError(`תגובה לא צפויה מ-Beds24 עבור ${req.path}`, body)
  }
  return parsed.data
}
