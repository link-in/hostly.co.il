'use client'

import { useEffect, useState } from 'react'
import { Eye, SlidersHorizontal } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import { LandingQueryProvider } from '@/components/landing-templates/booking/availabilitySource'
import '@/components/landing-templates/landing-reset.css'
import { createInitialDraft, withDefaultContact, withDefaultSiteAddress } from '@/lib/landingBuilder/draftReducer'
import type { ExistingSite } from '@/lib/landingBuilder/persistence/siteAddressRepository'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import LivePreview from './components/preview/LivePreview'
import WizardPanel from './components/wizard/WizardPanel'
import { BuilderProvider, useBuilderDispatch, useBuilderState } from './state/BuilderProvider'
import { DraftPersistenceProvider } from './state/DraftPersistence'
import PreviewAvailability from './state/PreviewAvailability'
import { SitePublishingProvider } from './state/SitePublishing'

interface SiteBuilderWizardProps {
  session?: any
  canSave: boolean
  initialDraft?: LandingDraft
  savedAt: string | null
  existingSite: ExistingSite | null
}

function buildStartingDraft(initialDraft: LandingDraft | undefined, existingSite: ExistingSite | null): LandingDraft {
  const draft = withDefaultSiteAddress(initialDraft ?? createInitialDraft(), existingSite?.address)
  return withDefaultContact(draft, existingSite?.contact)
}

function MobileTabSwitcher() {
  const { mobileTab } = useBuilderState()
  const dispatch = useBuilderDispatch()

  return (
    <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
      <div className="flex w-full rounded-2xl bg-slate-200/80 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => dispatch({ type: 'mobile/tabChanged', tab: 'edit' })}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            mobileTab === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span>עריכת האתר</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'mobile/tabChanged', tab: 'preview' })}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            mobileTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye className="size-4" aria-hidden />
          <span>תצוגה מקדימה</span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>
    </div>
  )
}

function SiteBuilderContent() {
  const { mobileTab } = useBuilderState()
  const dispatch = useBuilderDispatch()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      dispatch({ type: 'preview/deviceChanged', device: 'mobile' })
    }
  }, [dispatch])

  return (
    <div className="site-builder min-h-dvh w-full min-w-0 max-w-full overflow-x-hidden bg-slate-50 p-2 sm:p-4 lg:p-6" dir="rtl">
      <div className="mx-auto w-full max-w-[1600px] min-w-0">
        <MobileTabSwitcher />
        <div className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
          <div className={`w-full min-w-0 max-w-full ${mobileTab === 'edit' ? 'block' : 'hidden lg:block'}`}>
            <WizardPanel />
          </div>
          <div className={`w-full min-w-0 max-w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            <LivePreview />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SiteBuilderWizard({
  session,
  canSave,
  initialDraft,
  savedAt,
  existingSite,
}: SiteBuilderWizardProps) {
  const [startingDraft] = useState(() => buildStartingDraft(initialDraft, existingSite))

  return (
    <>
      <DashboardHeader session={session} currentPage="site-builder" />
      <BuilderProvider initialDraft={startingDraft}>
        <DraftPersistenceProvider canSave={canSave} initialDraft={startingDraft} initialSavedAt={savedAt}>
          <SitePublishingProvider
            initialPublishedDraft={existingSite?.publishedDraft ?? null}
            initialPublishedAt={existingSite?.publishedAt ?? null}
          >
            <LandingQueryProvider>
              <PreviewAvailability canLoad={canSave}>
                <SiteBuilderContent />
              </PreviewAvailability>
            </LandingQueryProvider>
          </SitePublishingProvider>
        </DraftPersistenceProvider>
      </BuilderProvider>
    </>
  )
}
