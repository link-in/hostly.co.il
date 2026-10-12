import type { OnboardingOverview } from '@/lib/onboarding/service'
import type { AirbnbListingSummary, AirbnbUserSummary } from '@/lib/onboarding/steps/airbnb'
import type { SkippableStepId } from '@/lib/onboarding/state'
import type { BasePriceStepInput, PropertyStepInput } from '@/lib/onboarding/schemas'

export type { OnboardingOverview, AirbnbListingSummary, AirbnbUserSummary }

export interface FinalizeResponse {
  data: { cachedDays: number; cacheWarning: string | null }
  alreadyDone: boolean
  apiKey: string | null
}

function readError(body: unknown, status: number): string {
  const error = (body as { error?: unknown })?.error
  if (typeof error === 'string') return error
  if (error) return JSON.stringify(error)
  return `שגיאה ${status}`
}

export function createOnboardingApi(userId: string) {
  const base = `/api/admin/onboarding/${encodeURIComponent(userId)}`

  async function call<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(readError(body, res.status))
    return body as T
  }

  return {
    getOverview: () => call<OnboardingOverview>(''),
    createProperty: (input: PropertyStepInput) => call('/property', { method: 'POST', body: input }),
    setBasePrice: (input: Pick<BasePriceStepInput, 'price'> & Partial<BasePriceStepInput>) =>
      call('/base-price', { method: 'POST', body: input }),
    listAirbnbUsers: () => call<{ users: AirbnbUserSummary[] }>('/airbnb/users'),
    listAirbnbListings: (airbnbUserId: string) =>
      call<{ listings: AirbnbListingSummary[] }>(`/airbnb/listings?airbnbUserId=${encodeURIComponent(airbnbUserId)}`),
    connectAirbnb: (input: { airbnbUserId: string; airbnbListingId: string; listingName?: string }) =>
      call('/airbnb/connect', { method: 'POST', body: input }),
    applyAirbnbMultiplier: () => call('/airbnb/multiplier', { method: 'POST' }),
    confirmBookingCom: (hotelId?: string) => call('/booking-com', { method: 'POST', body: { hotelId } }),
    verify: () => call('/verify', { method: 'POST' }),
    finalize: () => call<FinalizeResponse>('/finalize', { method: 'POST' }),
    skip: (step: SkippableStepId) => call('/skip', { method: 'POST', body: { step } }),
  }
}

export type OnboardingApi = ReturnType<typeof createOnboardingApi>
