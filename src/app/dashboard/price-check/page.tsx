import { Suspense } from 'react'
import { Metadata } from 'next'
import PriceCheckClient from './PriceCheckClient'
import DashboardLoader from '@/components/DashboardLoader'

export const metadata: Metadata = {
  title: 'בדיקת מחירים ברשת | Hostly',
  description: 'בדיקת והשוואת מחירים ברשת מול Airbnb, Booking.com ואתר ההזמנות',
}

export const dynamic = 'force-dynamic'

export default function PriceCheckPage() {
  return (
    <Suspense fallback={<DashboardLoader variant="fullscreen" label="טוען בדיקת מחירים…" />}>
      <PriceCheckClient />
    </Suspense>
  )
}
