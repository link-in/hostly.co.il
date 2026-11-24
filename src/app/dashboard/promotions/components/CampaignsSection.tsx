'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { fetchCampaigns } from '@/lib/promotions/client/api'
import type { PromotionCampaign } from '@/lib/promotions/domain/types'
import CampaignCard from './CampaignCard'

interface CampaignsSectionProps {
  disabled: boolean
}

const OPEN_STATUSES = new Set(['pending_approval', 'launching', 'active'])

export default function CampaignsSection({ disabled }: CampaignsSectionProps) {
  const [campaigns, setCampaigns] = useState<PromotionCampaign[] | null>(null)

  useEffect(() => {
    fetchCampaigns()
      .then(setCampaigns)
      .catch((err) => {
        setCampaigns([])
        toast.error(err instanceof Error ? err.message : 'טעינת הקמפיינים נכשלה')
      })
  }, [])

  const replace = (updated: PromotionCampaign) =>
    setCampaigns((prev) => (prev ?? []).map((c) => (c.id === updated.id ? updated : c)))

  const open = campaigns?.filter((c) => OPEN_STATUSES.has(c.status)) ?? []
  const history = campaigns?.filter((c) => !OPEN_STATUSES.has(c.status)) ?? []

  return (
    <section className="promotions-section" aria-labelledby="promotions-campaigns-title">
      <h2 id="promotions-campaigns-title" className="promotions-section-title">
        <Sparkles size={18} /> קמפיינים
      </h2>
      <p className="promotions-section-subtitle">
        טיוטות שהמערכת הכינה מחכות כאן לאישור. אפשר לערוך את הטקסט ואת התקציב לפני הפרסום.
      </p>

      {campaigns === null && <p className="promotions-muted">טוען…</p>}
      {campaigns !== null && open.length === 0 && (
        <p className="promotions-muted" data-testid="promotions-no-campaigns">
          אין כרגע קמפיינים פתוחים. כשיתפנה תאריך שמתאים לחוקים שלך, תופיע כאן טיוטה.
        </p>
      )}

      <div className="promotions-list">
        {open.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} disabled={disabled} onChange={replace} />
        ))}
      </div>

      {history.length > 0 && (
        <details className="mt-4">
          <summary className="promotions-muted" style={{ cursor: 'pointer' }}>
            היסטוריה ({history.length})
          </summary>
          <div className="promotions-list mt-3">
            {history.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} disabled onChange={replace} />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
