'use client'

import { useState } from 'react'
import { createInitialDraft, withDefaultContact, withDefaultSiteAddress } from '@/lib/landingBuilder/draftReducer'
import type { ExistingSite } from '@/lib/landingBuilder/persistence/siteAddressRepository'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import '@/components/landing-templates/landing-reset.css'
import { BuilderProvider } from './state/BuilderProvider'
import { DraftPersistenceProvider } from './state/DraftPersistence'
import { SitePublishingProvider } from './state/SitePublishing'
import WizardPanel from './components/wizard/WizardPanel'
import LivePreview from './components/preview/LivePreview'

interface SiteBuilderWizardProps {
  canSave: boolean
  initialDraft?: LandingDraft
  savedAt: string | null
  existingSite: ExistingSite | null
}

function buildStartingDraft(initialDraft: LandingDraft | undefined, existingSite: ExistingSite | null): LandingDraft {
  const draft = withDefaultSiteAddress(initialDraft ?? createInitialDraft(), existingSite?.address)
  return withDefaultContact(draft, existingSite?.contact)
}

export default function SiteBuilderWizard({ canSave, initialDraft, savedAt, existingSite }: SiteBuilderWizardProps) {
  const [startingDraft] = useState(() => buildStartingDraft(initialDraft, existingSite))

  return (
    <BuilderProvider initialDraft={startingDraft}>
      <DraftPersistenceProvider canSave={canSave} initialDraft={startingDraft} initialSavedAt={savedAt}>
        <SitePublishingProvider
          initialPublishedDraft={existingSite?.publishedDraft ?? null}
          initialPublishedAt={existingSite?.publishedAt ?? null}
        >
          <div className="site-builder min-h-dvh bg-slate-50 p-2 lg:p-6" dir="rtl">
            <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
              <WizardPanel />
              <LivePreview />
            </div>
          </div>
        </SitePublishingProvider>
      </DraftPersistenceProvider>
    </BuilderProvider>
  )
}
