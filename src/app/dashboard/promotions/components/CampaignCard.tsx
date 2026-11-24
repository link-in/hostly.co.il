'use client'

import { useState } from 'react'
import { Check, Pencil, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { runCampaignAction } from '@/lib/promotions/client/api'
import {
  CAMPAIGN_STATUS_LABELS,
  campaignStatusTone,
  formatMoney,
  STOP_REASON_LABELS,
  TRIGGER_LABELS,
} from '@/lib/promotions/client/labels'
import { formatStayRange } from '@/lib/promotions/content/offer'
import type { CampaignAction, PromotionCampaign } from '@/lib/promotions/domain/types'
import AdPreview from './AdPreview'
import CampaignEditor from './CampaignEditor'

interface CampaignCardProps {
  campaign: PromotionCampaign
  disabled: boolean
  onChange: (campaign: PromotionCampaign) => void
}

const ACTION_SUCCESS: Record<CampaignAction, string> = {
  approve: 'הקמפיין עלה לפייסבוק ולאינסטגרם',
  reject: 'הטיוטה נדחתה',
  stop: 'הקמפיין נעצר',
}

function linkHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function CampaignStatsLine({ campaign }: { campaign: PromotionCampaign }) {
  const { stats } = campaign
  if (stats.spend === undefined) return null
  return (
    <div className="campaign-stats" data-testid="promotions-campaign-stats">
      <span>הוצאה: {formatMoney(stats.spend ?? 0, campaign.currency)}</span>
      <span>חשיפות: {stats.impressions ?? 0}</span>
      <span>קליקים: {stats.clicks ?? 0}</span>
    </div>
  )
}

export default function CampaignCard({ campaign, disabled, onChange }: CampaignCardProps) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState<CampaignAction | null>(null)
  const pending = campaign.status === 'pending_approval'

  const run = async (action: CampaignAction) => {
    setBusy(action)
    try {
      onChange(await runCampaignAction(campaign.id, action))
      toast.success(ACTION_SUCCESS[action])
      setConfirming(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'הפעולה נכשלה')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="campaign-card" data-testid="promotions-campaign" data-status={campaign.status}>
      <AdPreview
        content={campaign.content}
        imageUrl={campaign.imageUrls[0] ?? null}
        pageName={campaign.roomName ?? 'העמוד העסקי שלך'}
        linkHost={linkHost(campaign.landingUrl)}
      />

      <div className="promotions-list">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className={`promotions-badge promotions-badge-${campaignStatusTone(campaign.status)}`}>
            {CAMPAIGN_STATUS_LABELS[campaign.status]}
          </span>
          <strong>
            {campaign.roomName ? `${campaign.roomName}: ` : ''}
            {formatStayRange(campaign.checkIn, campaign.checkOut)}
          </strong>
        </div>
        <div className="promotions-muted">
          {TRIGGER_LABELS[campaign.trigger]} · תקציב כולל {formatMoney(campaign.totalBudget, campaign.currency)}
          {campaign.nightlyPrice ? ` · מחיר ללילה ${formatMoney(campaign.nightlyPrice, campaign.currency)}` : ''}
        </div>
        {campaign.stopReason && <div className="promotions-muted">{STOP_REASON_LABELS[campaign.stopReason]}</div>}
        {campaign.error && <div className="promotions-notice">{campaign.error}</div>}
        <CampaignStatsLine campaign={campaign} />

        {editing && (
          <CampaignEditor
            campaign={campaign}
            onSaved={(updated) => {
              onChange(updated)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        )}

        {pending && !editing && !disabled && confirming && (
          <div className="promotions-notice" data-testid="promotions-approve-confirm">
            הקמפיין יעלה עכשיו לפייסבוק ולאינסטגרם, ויגבה מחשבון המודעות שלך עד{' '}
            {formatMoney(campaign.totalBudget, campaign.currency)}. הוא ייעצר לבד כשהתאריכים ייתפסו.
            <div className="promotions-actions">
              <Button
                variant="success"
                size="sm"
                loading={busy === 'approve'}
                onClick={() => run('approve')}
                data-testid="promotions-approve-confirm-button"
              >
                אישור ופרסום
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                ביטול
              </Button>
            </div>
          </div>
        )}

        {pending && !editing && !disabled && !confirming && (
          <div className="promotions-actions">
            <Button
              variant="primary"
              size="sm"
              iconStart={<Check size={14} />}
              onClick={() => setConfirming(true)}
              data-testid="promotions-approve"
            >
              אישור
            </Button>
            <Button variant="outline" size="sm" iconStart={<Pencil size={14} />} onClick={() => setEditing(true)}>
              עריכה
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconStart={<X size={14} />}
              loading={busy === 'reject'}
              onClick={() => run('reject')}
              data-testid="promotions-reject"
            >
              דחייה
            </Button>
          </div>
        )}

        {campaign.status === 'active' && !disabled && (
          <div className="promotions-actions">
            <Button
              variant="danger"
              size="sm"
              iconStart={<Square size={14} />}
              loading={busy === 'stop'}
              onClick={() => confirm('לעצור את הקמפיין?') && run('stop')}
            >
              עצירה
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
