'use client'

import { use } from 'react'
import { OnboardingWizard } from './components/OnboardingWizard'

export default function OnboardingPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)

  return (
    <div
      dir="rtl"
      className="min-vh-100"
      style={{ background: 'var(--hn-50)', fontFamily: 'var(--font-heebo), Heebo, system-ui, sans-serif' }}
    >
      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <OnboardingWizard userId={userId} />
      </div>
      <style>{`.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
