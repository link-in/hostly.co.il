'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { saveRule, type RoomOption } from '@/lib/promotions/client/api'
import { TRIGGER_LABELS } from '@/lib/promotions/client/labels'
import { parseRuleForm, type RuleFormValues } from '@/lib/promotions/client/ruleForm'
import { TRIGGER_IDS, type PromotionRule, type TriggerId } from '@/lib/promotions/domain/types'

interface RuleFormProps {
  initial: RuleFormValues
  ruleId?: string
  rooms: RoomOption[]
  onSaved: (rule: PromotionRule) => void
  onCancel: () => void
}

export default function RuleForm({ initial, ruleId, rooms, onSaved, onCancel }: RuleFormProps) {
  const [form, setForm] = useState<RuleFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof RuleFormValues>(key: K, value: RuleFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = parseRuleForm(form)
    if (!parsed.ok) {
      toast.error(parsed.error)
      return
    }
    setSaving(true)
    try {
      onSaved(await saveRule(parsed.value, ruleId))
      toast.success('החוק נשמר')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="promotions-row d-block" data-testid="promotions-rule-form">
      <div className="promotions-grid">
        <label className="promotions-field">
          שם החוק
          <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} />
        </label>
        <label className="promotions-field">
          מתי לפרסם
          <select value={form.trigger} onChange={(e) => set('trigger', e.target.value as TriggerId)}>
            {TRIGGER_IDS.map((trigger) => (
              <option key={trigger} value={trigger}>
                {TRIGGER_LABELS[trigger]}
              </option>
            ))}
          </select>
        </label>
        <label className="promotions-field">
          חדר
          <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
            <option value="">כל החדרים</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="promotions-field">
          כמה ימים לפני
          <input type="number" min={1} max={60} value={form.daysBefore} onChange={(e) => set('daysBefore', e.target.value)} />
        </label>
        <label className="promotions-field">
          מינימום לילות פנויים
          <input
            type="number"
            min={1}
            max={30}
            value={form.minFreeNights}
            onChange={(e) => set('minFreeNights', e.target.value)}
          />
        </label>
        <label className="promotions-field">
          תקציב יומי (₪)
          <input type="number" min={1} value={form.dailyBudget} onChange={(e) => set('dailyBudget', e.target.value)} />
        </label>
        <label className="promotions-field">
          תקציב מקסימלי לקמפיין (₪)
          <input
            type="number"
            min={1}
            value={form.maxTotalBudget}
            onChange={(e) => set('maxTotalBudget', e.target.value)}
          />
        </label>
        <label className="promotions-field">
          הנחה במודעה (%, לא חובה)
          <input type="number" min={1} max={99} value={form.discountPct} onChange={(e) => set('discountPct', e.target.value)} />
        </label>
        <label className="promotions-field">
          גיל מינימלי
          <input type="number" min={18} max={65} value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} />
        </label>
        <label className="promotions-field">
          גיל מקסימלי
          <input type="number" min={18} max={65} value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} />
        </label>
      </div>

      <p className="promotions-muted mt-3 mb-0">
        ההנחה מופיעה רק בטקסט המודעה. את המחיר עצמו צריך לעדכן ביומן.
      </p>

      <label className="d-flex align-items-center gap-2 mt-3" style={{ fontSize: 14 }}>
        <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        חוק פעיל
      </label>

      <div className="promotions-actions">
        <Button type="submit" variant="primary" loading={saving} data-testid="promotions-rule-save">
          שמירה
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  )
}
