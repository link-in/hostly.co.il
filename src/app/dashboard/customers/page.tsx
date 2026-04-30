import { Metadata } from 'next'
import CustomersClient from './CustomersClient'

export const metadata: Metadata = {
  title: 'ניהול לקוחות | Hostly',
  description: 'ניהול לקוחות עם חיפוש וייצוא נתונים',
}

export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  return <CustomersClient />
}
