'use client'

import { use } from 'react'
import { OnboardingWizard } from './components/OnboardingWizard'

export default function OnboardingPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)', color: 'var(--htxt-1)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-xl-11">
            <OnboardingWizard userId={userId} />
          </div>
        </div>
        <style>{`.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
