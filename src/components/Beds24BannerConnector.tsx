'use client'

/**
 * Thin client wrapper that connects Beds24SuspendedBanner to Beds24StatusContext.
 * Needed because layout.tsx is a Server Component and cannot call useContext directly.
 */

import Beds24SuspendedBanner from './Beds24SuspendedBanner'
import { useBeds24Status } from '@/lib/beds24/Beds24StatusContext'

export default function Beds24BannerConnector() {
  const { setIsBeds24Suspended } = useBeds24Status()
  return <Beds24SuspendedBanner onSuspendedChange={setIsBeds24Suspended} />
}
