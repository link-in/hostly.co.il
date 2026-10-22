'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { createInitialDraft } from '@/lib/landingBuilder/draftReducer'
import { draftFingerprint, replaceImageUrls } from '@/lib/landingBuilder/persistence/storedDraft'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from './BuilderProvider'
import { persistDraft } from './persistDraft'
import { releaseImage } from './uploadedImages'

export interface DraftPersistenceValue {
  canSave: boolean
  isDirty: boolean
  isSaving: boolean
  savedAt: string | null
  error: string | null
  save: () => void
}

const DraftPersistenceContext = createContext<DraftPersistenceValue | null>(null)

const SAVE_FAILED = 'השמירה נכשלה. נסו שוב בעוד רגע.'

function useWarnBeforeLeaving(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [enabled])
}

export function DraftPersistenceProvider({
  canSave,
  initialDraft,
  initialSavedAt,
  children,
}: {
  canSave: boolean
  initialDraft?: LandingDraft
  initialSavedAt: string | null
  children: ReactNode
}) {
  const { draft } = useBuilderState()
  const dispatch = useBuilderDispatch()
  const [savedFingerprint, setSavedFingerprint] = useState(() => draftFingerprint(initialDraft ?? createInitialDraft()))
  const [savedAt, setSavedAt] = useState(initialSavedAt)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const isDirty = draftFingerprint(draft) !== savedFingerprint
  useWarnBeforeLeaving(canSave && isDirty)

  const save = useCallback(
    () =>
      startSaving(async () => {
        try {
          const result = await persistDraft(draft)
          dispatch({ type: 'images/persisted', urls: result.urls })
          draft.images.filter((image) => result.urls[image.id]).forEach(releaseImage)
          setSavedFingerprint(draftFingerprint(replaceImageUrls(draft, result.urls)))
          setSavedAt(result.savedAt)
          setError(null)
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : SAVE_FAILED)
        }
      }),
    [draft, dispatch],
  )

  const value = useMemo(
    () => ({ canSave, isDirty, isSaving, savedAt, error, save }),
    [canSave, isDirty, isSaving, savedAt, error, save],
  )
  return <DraftPersistenceContext.Provider value={value}>{children}</DraftPersistenceContext.Provider>
}

export function useDraftPersistence(): DraftPersistenceValue {
  const value = useContext(DraftPersistenceContext)
  if (!value) throw new Error('useDraftPersistence must be used inside <DraftPersistenceProvider>')
  return value
}
