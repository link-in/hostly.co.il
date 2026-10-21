'use client'

import { BuilderProvider } from './state/BuilderProvider'
import WizardPanel from './components/wizard/WizardPanel'
import LivePreview from './components/preview/LivePreview'
import './site-builder.css'

export default function SiteBuilderWizard() {
  return (
    <BuilderProvider>
      <div className="site-builder min-h-dvh bg-slate-50 p-2 lg:p-6" dir="rtl">
        <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
          <WizardPanel />
          <LivePreview />
        </div>
      </div>
    </BuilderProvider>
  )
}
