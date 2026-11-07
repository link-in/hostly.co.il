'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { draftFingerprint } from '@/lib/landingBuilder/persistence/storedDraft'
import { getPublishBlockers, type PublishBlocker } from '@/lib/landingBuilder/publishing/publishBlockers'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import { publishSiteAction } from '../draftActions'
import { useBuilderState } from './BuilderProvider'
import { useDraftPersistence } from './DraftPersistence'

export interface PublishedSite {
  address: string
  publishedAt: string
}

export interface SitePublishingValue {
  published: PublishedSite | null
  hasUnpublishedChanges: boolean
  blockers: PublishBlocker[]
  isPublishing: boolean
  error: string | null
  publish: () => void
}

const SitePublishingContext = createContext<SitePublishingValue | null>(null)

const PUBLISH_FAILED = 'הפרסום נכשל. נסו שוב בעוד רגע.'

export function SitePublishingProvider({
  initialPublishedDraft,
  initialPublishedAt,
  children,
}: {
  initialPublishedDraft: LandingDraft | null
  initialPublishedAt: string | null
  children: ReactNode
}) {
  const { draft } = useBuilderState()
  const { saveNow } = useDraftPersistence()
  const [published, setPublished] = useState<PublishedSite | null>(() =>
    initialPublishedDraft && initialPublishedAt
      ? { address: initialPublishedDraft.siteAddress, publishedAt: initialPublishedAt }
      : null,
  )
  const [publishedFingerprint, setPublishedFingerprint] = useState(() =>
    initialPublishedDraft ? draftFingerprint(initialPublishedDraft) : null,
  )
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blockers = useMemo(() => getPublishBlockers(draft, { allowLocalImages: true }), [draft])
  const hasUnpublishedChanges = publishedFingerprint !== draftFingerprint(draft)

  const publish = useCallback(async () => {
    setIsPublishing(true)
    setError(null)
    try {
      const hostedDraft = await saveNow()
      if (!hostedDraft) return
      const result = await publishSiteAction(hostedDraft)
      if (!result.ok) return setError(result.error)
      setPublished({ address: result.address, publishedAt: result.publishedAt })
      setPublishedFingerprint(draftFingerprint(hostedDraft))
    } catch {
      setError(PUBLISH_FAILED)
    } finally {
      setIsPublishing(false)
    }
  }, [saveNow])

  const value = useMemo(
    () => ({ published, hasUnpublishedChanges, blockers, isPublishing, error, publish: () => void publish() }),
    [published, hasUnpublishedChanges, blockers, isPublishing, error, publish],
  )
  return <SitePublishingContext.Provider value={value}>{children}</SitePublishingContext.Provider>
}

export function useSitePublishing(): SitePublishingValue {
  const value = useContext(SitePublishingContext)
  if (!value) throw new Error('useSitePublishing must be used inside <SitePublishingProvider>')
  return value
}
