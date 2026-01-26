import { Metadata } from 'next'
import ReservationsClient from './ReservationsClient'
import { SessionProvider } from '../SessionProvider'

export const metadata: Metadata = {
  title: 'כל ההזמנות | Hostly',
  description: 'צפייה בכל ההזמנות עם סטטיסטיקות מתקדמות',
}

// Force dynamic rendering for this page (uses session)
export const dynamic = 'force-dynamic'

export default function ReservationsPage() {
  return (
    <SessionProvider>
      <ReservationsClient />
    </SessionProvider>
  )
}
