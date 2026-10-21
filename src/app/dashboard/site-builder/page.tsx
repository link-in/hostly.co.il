import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import SiteBuilderWizard from './SiteBuilderWizard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'בונה אתר הזמנות | Hostly',
}

export default async function SiteBuilderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  if (!isSiteBuilderEnabled()) redirect('/dashboard')

  return <SiteBuilderWizard />
}
