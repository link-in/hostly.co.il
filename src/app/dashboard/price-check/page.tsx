import { Metadata } from 'next'
import PriceCheckClient from './PriceCheckClient'

export const metadata: Metadata = {
  title: 'בדיקת מחיר | Hostly',
  description: 'בדיקת מחיר וזמינות לתאריכים ספציפיים',
}

export const dynamic = 'force-dynamic'

export default function PriceCheckPage() {
  return <PriceCheckClient />
}
