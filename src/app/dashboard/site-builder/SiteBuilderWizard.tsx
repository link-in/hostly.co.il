'use client'

import { useState } from 'react'
import { createInitialDraft, withDefaultSiteAddress } from '@/lib/landingBuilder/draftReducer'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import { BuilderProvider } from './state/BuilderProvider'
import { DraftPersistenceProvider } from './state/DraftPersistence'
import WizardPanel from './components/wizard/WizardPanel'
import LivePreview from './components/preview/LivePreview'
import './site-builder.css'

interface SiteBuilderWizardProps {
  canSave: boolean
  initialDraft?: LandingDraft
  savedAt: string | null
  existingSiteAddress: string | null
}

export default function SiteBuilderWizard({ canSave, initialDraft, savedAt, existingSiteAddress }: SiteBuilderWizardProps) {
  const [startingDraft] = useState(() => withDefaultSiteAddress(initialDraft ?? createInitialDraft(), existingSiteAddress))

  return (
    <BuilderProvider initialDraft={startingDraft}>
      <DraftPersistenceProvider canSave={canSave} initialDraft={startingDraft} initialSavedAt={savedAt}>
        <div className="site-builder min-h-dvh bg-slate-50 p-2 lg:p-6" dir="rtl">
          <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
            <WizardPanel />
            <LivePreview />
          </div>
        </div>
      </DraftPersistenceProvider>
    </BuilderProvider>
  )
}
