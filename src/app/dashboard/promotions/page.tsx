import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import PromotionsDashboard from './components/PromotionsDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'קמפיינים אוטומטיים | Hostly',
}

export default async function PromotionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')

  return <PromotionsDashboard session={session} isDemo={Boolean(session.user.isDemo)} />
}
