'use client'

import { useMemo, type ReactNode } from 'react'
import { siteAvailabilityResponseSchema } from '@/lib/landingBuilder/availability/nightlyRates'
import { AvailabilitySourceProvider, LandingQueryProvider } from './availabilitySource'

async function fetchSiteNights(address: string) {
  const response = await fetch(`/api/sites/${encodeURIComponent(address)}/availability`)
  if (!response.ok) return null
  const parsed = siteAvailabilityResponseSchema.safeParse(await response.json())
  return parsed.success ? parsed.data.nights : null
}

export default function PublicSiteAvailability({ address, children }: { address: string; children: ReactNode }) {
  const source = useMemo(() => ({ key: `site:${address}`, load: () => fetchSiteNights(address) }), [address])
  return (
    <LandingQueryProvider>
      <AvailabilitySourceProvider source={source}>{children}</AvailabilitySourceProvider>
    </LandingQueryProvider>
  )
}
