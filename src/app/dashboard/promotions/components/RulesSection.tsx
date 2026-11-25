'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { deleteRule, fetchRooms, fetchRules, type RoomOption } from '@/lib/promotions/client/api'
import { formatMoney, TRIGGER_LABELS } from '@/lib/promotions/client/labels'
import { EMPTY_RULE_FORM, ruleToForm } from '@/lib/promotions/client/ruleForm'
import type { PromotionRule } from '@/lib/promotions/domain/types'
import RuleForm from './RuleForm'

interface RulesSectionProps {
  disabled: boolean
}

type Editing = { mode: 'new' } | { mode: 'edit'; rule: PromotionRule } | null

function describeRule(rule: PromotionRule, rooms: RoomOption[]): string {
  const room = rule.roomId ? rooms.find((r) => r.id === rule.roomId)?.name ?? rule.roomId : 'כל החדרים'
  return [
    TRIGGER_LABELS[rule.trigger],
    `${rule.daysBefore} ימים לפני`,
    room,
    `${formatMoney(rule.dailyBudget)} ליום, עד ${formatMoney(rule.maxTotalBudget)}`,
    rule.discountPct ? `${rule.discountPct}% הנחה` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export default function RulesSection({ disabled }: RulesSectionProps) {
  const [rules, setRules] = useState<PromotionRule[] | null>(null)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [editing, setEditing] = useState<Editing>(null)

  useEffect(() => {
    fetchRules()
      .then(setRules)
      .catch((err) => {
        setRules([])
        toast.error(err instanceof Error ? err.message : 'טעינת החוקים נכשלה')
      })
    fetchRooms().then(setRooms).catch(() => setRooms([]))
  }, [])

  const handleSaved = (saved: PromotionRule) => {
    setRules((prev) => {
      const list = prev ?? []
      return list.some((r) => r.id === saved.id) ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved]
    })
    setEditing(null)
  }

  const handleDelete = async (rule: PromotionRule) => {
    if (!confirm(`למחוק את החוק "${rule.name}"?`)) return
    try {
      await deleteRule(rule.id)
      setRules((prev) => (prev ?? []).filter((r) => r.id !== rule.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'המחיקה נכשלה')
    }
  }

  return (
    <section className="promotions-section" aria-labelledby="promotions-rules-title">
      <h2 id="promotions-rules-title" className="promotions-section-title">
        <Settings2 size={18} /> מתי לפרסם
      </h2>
      <p className="promotions-section-subtitle">
        כל בוקר המערכת בודקת את היומן לפי החוקים. כשנמצא תאריך פנוי מוכנה טיוטת קמפיין, ונשלחת אליך הודעה לאישור.
      </p>

      {rules === null && <p className="promotions-muted">טוען…</p>}
      {rules?.length === 0 && !editing && <p className="promotions-muted">עדיין אין חוקים.</p>}

      <div className="promotions-list">
        {rules?.map((rule) =>
          editing?.mode === 'edit' && editing.rule.id === rule.id ? (
            <RuleForm
              key={rule.id}
              initial={ruleToForm(rule)}
              ruleId={rule.id}
              rooms={rooms}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={rule.id} className="promotions-row" data-testid="promotions-rule">
              <div>
                <strong>{rule.name}</strong> {!rule.enabled && <span className="promotions-badge promotions-badge-muted">כבוי</span>}
                <div className="promotions-muted">{describeRule(rule, rooms)}</div>
              </div>
              {!disabled && (
                <div className="d-flex gap-1">
                  <Button variant="ghost" size="sm" iconOnly aria-label="עריכה" onClick={() => setEditing({ mode: 'edit', rule })}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" iconOnly aria-label="מחיקה" onClick={() => handleDelete(rule)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
        {editing?.mode === 'new' && (
          <RuleForm initial={EMPTY_RULE_FORM} rooms={rooms} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </div>

      {!disabled && !editing && (
        <div className="promotions-actions">
          <Button
            variant="outline"
            size="sm"
            iconStart={<Plus size={14} />}
            onClick={() => setEditing({ mode: 'new' })}
            data-testid="promotions-add-rule"
          >
            חוק חדש
          </Button>
        </div>
      )}
    </section>
  )
}
