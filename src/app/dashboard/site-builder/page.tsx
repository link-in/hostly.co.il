import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import { loadDraft } from '@/lib/landingBuilder/persistence/draftRepository'
import { loadUserSiteAddress } from '@/lib/landingBuilder/persistence/siteAddressRepository'
import SiteBuilderWizard from './SiteBuilderWizard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'בונה אתר הזמנות | Hostly',
}

async function loadSafely<T>(label: string, load: () => Promise<T | null>): Promise<T | null> {
  try {
    return await load()
  } catch (error) {
    console.warn(`[landing-builder] Loading ${label} failed:`, error)
    return null
  }
}

export default async function SiteBuilderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  if (!isSiteBuilderEnabled()) redirect('/dashboard')

  const canSave = !session.user.isDemo
  const userId = session.user.id
  const [saved, existingSiteAddress] = canSave
    ? await Promise.all([
        loadSafely('the saved draft', () => loadDraft(userId)),
        loadSafely('the site address', () => loadUserSiteAddress(userId)),
      ])
    : [null, null]

  return (
    <SiteBuilderWizard
      canSave={canSave}
      initialDraft={saved?.draft}
      savedAt={saved?.updatedAt ?? null}
      existingSiteAddress={existingSiteAddress}
    />
  )
}
