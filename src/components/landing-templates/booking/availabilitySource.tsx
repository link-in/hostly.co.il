'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { indexRates, type NightlyRate, type NightlyRates } from '@/lib/landingBuilder/availability/nightlyRates'

export interface AvailabilitySource {
  /** Cache key: changes when the room/site changes. */
  key: string
  load: () => Promise<NightlyRate[] | null>
}

const AvailabilitySourceContext = createContext<AvailabilitySource | null>(null)

const FIVE_MINUTES = 5 * 60 * 1000

export function LandingQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: FIVE_MINUTES, retry: 1, refetchOnWindowFocus: false } } }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export function AvailabilitySourceProvider({ source, children }: { source: AvailabilitySource | null; children: ReactNode }) {
  return <AvailabilitySourceContext.Provider value={source}>{children}</AvailabilitySourceContext.Provider>
}

export interface NightlyRatesState {
  rates: NightlyRates
  isLoading: boolean
}

/** No source, or a failed load, leaves `rates` null: the widget falls back to open inquiry mode. */
export function useNightlyRates(): NightlyRatesState {
  const source = useContext(AvailabilitySourceContext)
  const query = useQuery({
    queryKey: ['nightly-rates', source?.key ?? 'none'],
    queryFn: () => source!.load(),
    enabled: source !== null,
  })
  const rows = query.data
  const rates = useMemo(() => (rows && rows.length > 0 ? indexRates(rows) : null), [rows])
  return { rates, isLoading: source !== null && query.isPending }
}
