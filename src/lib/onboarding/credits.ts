import { MIN_CREDITS_BEFORE_CALL } from './constants'
import { CreditBudgetError } from './errors'

export interface CreditSnapshot {
  limit: number | null
  remaining: number | null
  resetsInSeconds: number | null
  requestCost: number | null
  observedAt: number
}

// The OpenAPI spec and the wiki FAQ document different header names.
const HEADER_NAMES = {
  limit: ['x-fivemincreditlimit', 'x-five-min-limit'],
  remaining: ['x-fivemincreditlimit-remaining', 'x-five-min-limit-remaining'],
  resetsIn: ['x-fivemincreditlimit-resetsin', 'x-five-min-limit-resets-in'],
  requestCost: ['x-requestcost', 'x-request-cost'],
} as const

let lastSnapshot: CreditSnapshot | null = null

function readNumericHeader(headers: Headers, names: readonly string[]): number | null {
  for (const name of names) {
    const raw = headers.get(name)
    if (raw === null) continue
    const value = Number(raw)
    if (Number.isFinite(value)) return value
  }
  return null
}

export function readCreditHeaders(headers: Headers, now = Date.now()): CreditSnapshot {
  return {
    limit: readNumericHeader(headers, HEADER_NAMES.limit),
    remaining: readNumericHeader(headers, HEADER_NAMES.remaining),
    resetsInSeconds: readNumericHeader(headers, HEADER_NAMES.resetsIn),
    requestCost: readNumericHeader(headers, HEADER_NAMES.requestCost),
    observedAt: now,
  }
}

export function recordCreditSnapshot(snapshot: CreditSnapshot): void {
  if (snapshot.remaining === null) return
  lastSnapshot = snapshot
}

export function getLastCreditSnapshot(): CreditSnapshot | null {
  return lastSnapshot
}

export function resetCreditSnapshot(): void {
  lastSnapshot = null
}

function windowHasReset(snapshot: CreditSnapshot, now: number): boolean {
  if (snapshot.resetsInSeconds === null) return false
  return now >= snapshot.observedAt + snapshot.resetsInSeconds * 1000
}

/** Throws before a call that would likely exceed the shared 5-minute credit window. */
export function assertCreditBudget(minRemaining = MIN_CREDITS_BEFORE_CALL, now = Date.now()): void {
  const snapshot = lastSnapshot
  if (!snapshot || snapshot.remaining === null) return
  if (windowHasReset(snapshot, now)) return
  if (snapshot.remaining >= minRemaining) return

  const resetsIn = snapshot.resetsInSeconds === null
    ? null
    : Math.max(0, Math.ceil(snapshot.resetsInSeconds - (now - snapshot.observedAt) / 1000))

  throw new CreditBudgetError(
    `מכסת הקרדיטים של Beds24 כמעט נוצלה (${snapshot.remaining} נותרו). נסה שוב בעוד ${resetsIn ?? 'כמה'} שניות.`,
    resetsIn,
  )
}
