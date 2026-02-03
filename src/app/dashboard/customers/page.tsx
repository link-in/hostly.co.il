import { Metadata } from 'next'
import CustomersClient from './CustomersClient'
import { SessionProvider } from '../SessionProvider'

export const metadata: Metadata = {
  title: 'ניהול לקוחות | Hostly',
  description: 'ניהול לקוחות עם חיפוש וייצוא נתונים',
}

// Force dynamic rendering for this page (uses session)
export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  return (
    <SessionProvider>
      <CustomersClient />
    </SessionProvider>
  )
}
