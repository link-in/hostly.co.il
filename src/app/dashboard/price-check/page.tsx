import { Metadata } from 'next'
import PriceCheckClient from './PriceCheckClient'
import { SessionProvider } from '../SessionProvider'

export const metadata: Metadata = {
  title: 'בדיקת מחיר | Hostly',
  description: 'בדיקת מחיר וזמינות לתאריכים ספציפיים',
}

// Force dynamic rendering for this page (uses session)
export const dynamic = 'force-dynamic'

export default function PriceCheckPage() {
  return (
    <SessionProvider>
      <PriceCheckClient />
    </SessionProvider>
  )
}
