'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { editCampaign } from '@/lib/promotions/client/api'
import { campaignEditSchema, type PromotionCampaign } from '@/lib/promotions/domain/types'

interface CampaignEditorProps {
  campaign: PromotionCampaign
  onSaved: (campaign: PromotionCampaign) => void
  onCancel: () => void
}

function parseHashtags(value: string): string[] {
  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
}

export default function CampaignEditor({ campaign, onSaved, onCancel }: CampaignEditorProps) {
  const [headline, setHeadline] = useState(campaign.content.headline)
  const [primaryText, setPrimaryText] = useState(campaign.content.primaryText)
  const [description, setDescription] = useState(campaign.content.description)
  const [hashtags, setHashtags] = useState(campaign.content.hashtags.join(' '))
  const [budget, setBudget] = useState(String(campaign.totalBudget))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const edit = campaignEditSchema.safeParse({
      content: { ...campaign.content, headline, primaryText, description, hashtags: parseHashtags(hashtags) },
      totalBudget: Number(budget),
    })
    if (!edit.success) {
      toast.error('בדקו את השדות: כותרת עד 60 תווים, טקסט עד 600, תקציב חיובי')
      return
    }
    setSaving(true)
    try {
      onSaved(await editCampaign(campaign.id, edit.data))
      toast.success('השינויים נשמרו')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="promotions-list" data-testid="promotions-campaign-editor">
      <label className="promotions-field">
        כותרת
        <input value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} />
      </label>
      <label className="promotions-field">
        טקסט המודעה
        <textarea rows={4} value={primaryText} maxLength={600} onChange={(e) => setPrimaryText(e.target.value)} />
      </label>
      <div className="promotions-grid">
        <label className="promotions-field">
          תיאור קצר
          <input value={description} maxLength={90} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="promotions-field">
          האשטגים
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
        </label>
        <label className="promotions-field">
          תקציב כולל (₪)
          <input type="number" min={1} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
      </div>
      <div className="promotions-actions">
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
          שמירה
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  )
}
