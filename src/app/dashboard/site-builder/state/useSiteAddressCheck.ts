'use client'

import { useEffect, useState } from 'react'
import { validateSiteAddress } from '@/lib/landingBuilder/siteAddress'
import type { SiteAddressCheck } from '@/lib/landingBuilder/siteAddressAvailability'
import { checkSiteAddressAction } from '../draftActions'

const CHECK_DELAY_MS = 400

export type SiteAddressCheckState = SiteAddressCheck | { status: 'checking' } | null

/** Debounced availability check; only valid addresses reach the server. */
export function useSiteAddressCheck(address: string, enabled: boolean): SiteAddressCheckState {
  const [result, setResult] = useState<{ address: string; check: SiteAddressCheck | null } | null>(null)
  const shouldCheck = enabled && validateSiteAddress(address) === null

  useEffect(() => {
    if (!shouldCheck) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const check = await checkSiteAddressAction(address)
      if (!cancelled) setResult({ address, check })
    }, CHECK_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [address, shouldCheck])

  if (!shouldCheck) return null
  return result?.address === address ? result.check : { status: 'checking' }
}
