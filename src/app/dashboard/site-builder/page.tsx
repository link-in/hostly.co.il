import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import { loadDraft, type SavedDraft } from '@/lib/landingBuilder/persistence/draftRepository'
import SiteBuilderWizard from './SiteBuilderWizard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'בונה אתר הזמנות | Hostly',
}

async function loadDraftSafely(userId: string): Promise<SavedDraft | null> {
  try {
    return await loadDraft(userId)
  } catch (error) {
    console.warn('[landing-builder] Loading the saved draft failed, starting fresh:', error)
    return null
  }
}

export default async function SiteBuilderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  if (!isSiteBuilderEnabled()) redirect('/dashboard')

  const canSave = !session.user.isDemo
  const saved = canSave ? await loadDraftSafely(session.user.id) : null

  return <SiteBuilderWizard canSave={canSave} initialDraft={saved?.draft} savedAt={saved?.updatedAt ?? null} />
}
