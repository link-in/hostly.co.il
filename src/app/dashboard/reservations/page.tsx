import { Metadata } from 'next'
import ReservationsClient from './ReservationsClient'

export const metadata: Metadata = {
  title: 'כל ההזמנות | Hostly',
  description: 'צפייה בכל ההזמנות עם סטטיסטיקות מתקדמות',
}

export const dynamic = 'force-dynamic'

export default function ReservationsPage() {
  return <ReservationsClient />
}
