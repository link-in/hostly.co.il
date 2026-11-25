'use client'

import { useEffect } from 'react'
import type { Session } from 'next-auth'
import { useSearchParams } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import DashboardHeader from '@/components/DashboardHeader'
import { PageHeader } from '@/components/ui'
import CampaignsSection from './CampaignsSection'
import ConnectionSection from './ConnectionSection'
import RulesSection from './RulesSection'
import './promotions.css'

const META_RESULT_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'החשבון חובר. עכשיו בחרו חשבון מודעות ועמוד.' },
  cancelled: { ok: false, text: 'החיבור ל-Meta בוטל' },
  invalid: { ok: false, text: 'החיבור נכשל. נסו שוב.' },
  failed: { ok: false, text: 'Meta דחתה את החיבור. נסו שוב.' },
}

interface PromotionsDashboardProps {
  session: Session
  isDemo: boolean
}

function useMetaResultToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const result = META_RESULT_MESSAGES[searchParams.get('meta') ?? '']
    if (!result) return
    if (result.ok) toast.success(result.text)
    else toast.error(result.text)
    const url = new URL(window.location.href)
    url.searchParams.delete('meta')
    window.history.replaceState({}, '', url.toString())
  }, [searchParams])
}

export default function PromotionsDashboard({ session, isDemo }: PromotionsDashboardProps) {
  useMetaResultToast()

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <DashboardHeader session={session} currentPage="promotions" />
      <div className="container py-3 py-md-4 promotions-page">
        <div className="mb-4">
          <PageHeader
            title="קמפיינים אוטומטיים"
            subtitle="המערכת מזהה תאריכים פנויים, כותבת מודעה עם AI ומפרסמת בפייסבוק ובאינסטגרם — רק אחרי האישור שלך"
            icon={<Megaphone size={22} />}
          />
        </div>

        {isDemo && (
          <div className="promotions-notice mb-4" role="note">
            בחשבון הדגמה אפשר לראות את המסך, אבל אי אפשר לחבר חשבון פרסום או לשגר קמפיינים.
          </div>
        )}

        <CampaignsSection disabled={isDemo} />
        <ConnectionSection disabled={isDemo} />
        <RulesSection disabled={isDemo} />
      </div>
    </main>
  )
}
