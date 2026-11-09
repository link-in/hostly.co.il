'use client'

import { useState } from 'react'
import { ChevronDown, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import {
  buildBulkCalendar,
  listMonthNights,
  parseBulkPriceForm,
  summarizeNights,
  type BulkPriceInput,
  type PriceNight,
} from '@/lib/dashboard/bulkPrice'
import { submitBulkPrices } from '@/lib/dashboard/bulkPriceClient'

interface BulkMonthPriceFormProps {
  /** החודש המוצג כרגע ביומן. */
  month: Date
  roomId?: string
  /** נקרא אחרי עדכון מוצלח, עם הלילות שעודכנו. */
  onApplied?: (nights: PriceNight[]) => Promise<void> | void
  disabled?: boolean
}

interface PendingUpdate {
  input: BulkPriceInput
  nights: PriceNight[]
}

const inputStyle = { background: '#fff', border: '1px solid #CED7E0', color: '#2F3133' }
const labelStyle = { color: '#5B6670' }

const formatPrice = (price: number) => `₪${price.toLocaleString('he-IL')}`

function describeUpdate({ input, nights }: PendingUpdate): string {
  const { weekendNights, midweekNights } = summarizeNights(nights)
  const parts: string[] = []
  if (input.weekendPrice !== undefined) parts.push(`${weekendNights} לילות סוף שבוע ב-${formatPrice(input.weekendPrice)}`)
  if (input.midweekPrice !== undefined) parts.push(`${midweekNights} לילות אמצע שבוע ב-${formatPrice(input.midweekPrice)}`)
  return parts.join(' ו-')
}

export function BulkMonthPriceForm({ month, roomId, onApplied, disabled = false }: BulkMonthPriceFormProps) {
  const [open, setOpen] = useState(false)
  const [weekendPrice, setWeekendPrice] = useState('')
  const [midweekPrice, setMidweekPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingUpdate | null>(null)
  const [saving, setSaving] = useState(false)

  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(month)

  function prepareUpdate() {
    const parsed = parseBulkPriceForm({ weekendPrice, midweekPrice })
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    const nights = listMonthNights(month, parsed.value, new Date())
    if (!nights.length) {
      setError('אין בחודש הזה לילות עתידיים לעדכון.')
      return
    }
    setError(null)
    setPending({ input: parsed.value, nights })
  }

  async function confirmUpdate() {
    if (!pending) return
    setSaving(true)
    try {
      await submitBulkPrices(roomId, buildBulkCalendar(pending.nights))
      await onApplied?.(pending.nights)
      toast.success(`מחירי ${monthLabel} עודכנו (${pending.nights.length} לילות)`)
      setPending(null)
      setWeekendPrice('')
      setMidweekPrice('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'עדכון המחירים נכשל'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3" style={{ border: '1px solid #E4EAF0', borderRadius: 10, background: '#fff' }}>
      <button
        type="button"
        className="d-flex align-items-center justify-content-between w-100"
        style={{ background: 'none', border: 'none', padding: '10px 14px', color: '#2F3133', fontWeight: 600, fontSize: 14 }}
        aria-expanded={open}
        aria-controls="bulk-month-price-panel"
        onClick={() => setOpen((value) => !value)}
        data-testid="bulk-price-toggle"
      >
        <span className="d-inline-flex align-items-center gap-2">
          <CalendarRange size={16} style={{ color: '#7133D9' }} />
          עדכון מחירים לחודש שלם
        </span>
        <ChevronDown
          size={16}
          style={{ color: '#6C7884', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open ? (
        <div id="bulk-month-price-panel" style={{ padding: '0 14px 14px' }} data-testid="bulk-price-panel">
          <div className="small mb-3" style={{ color: '#6C7884' }}>
            מחיר אחד לכל לילות סוף השבוע ומחיר אחד לשאר הלילות, ב{monthLabel}. לילות שעברו לא יתעדכנו, וחסימות והזמנות לא ישתנו.
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small fw-semibold" style={labelStyle} htmlFor="bulk-weekend-price">
                סוף שבוע (₪)
              </label>
              <input
                id="bulk-weekend-price"
                type="number"
                min={1}
                inputMode="numeric"
                className="form-control"
                style={inputStyle}
                value={weekendPrice}
                onChange={(event) => { setWeekendPrice(event.target.value); setPending(null) }}
                disabled={saving}
              />
              <div className="form-text" style={{ fontSize: 11 }}>חמישי ושישי</div>
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold" style={labelStyle} htmlFor="bulk-midweek-price">
                אמצע שבוע (₪)
              </label>
              <input
                id="bulk-midweek-price"
                type="number"
                min={1}
                inputMode="numeric"
                className="form-control"
                style={inputStyle}
                value={midweekPrice}
                onChange={(event) => { setMidweekPrice(event.target.value); setPending(null) }}
                disabled={saving}
              />
              <div className="form-text" style={{ fontSize: 11 }}>ראשון עד רביעי ושבת</div>
            </div>
          </div>

          {error ? <div className="alert alert-danger py-2 small" role="alert">{error}</div> : null}

          {pending ? (
            <div className="rounded-3 p-3 mb-2" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }} data-testid="bulk-price-confirm">
              <div className="small mb-2" style={{ color: '#9A3412' }}>
                יעודכנו {describeUpdate(pending)}, מהיום ועד סוף החודש. מחירים שהוגדרו ידנית בלילות האלה יוחלפו.
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm flex-fill"
                  style={{ background: '#7133D9', color: '#fff', border: 'none' }}
                  onClick={confirmUpdate}
                  disabled={saving || disabled}
                  data-testid="bulk-price-confirm-button"
                >
                  {saving ? 'מעדכן...' : 'אישור ועדכון'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm flex-fill"
                  style={{ border: '1px solid #CED7E0', color: '#5B6670', background: '#F2F6FA' }}
                  onClick={() => setPending(null)}
                  disabled={saving}
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn w-100"
              style={{
                background: !weekendPrice.trim() && !midweekPrice.trim() ? '#F2F6FA' : '#7133D9',
                color: !weekendPrice.trim() && !midweekPrice.trim() ? '#6C7884' : '#fff',
                border: 'none',
                fontSize: 13,
              }}
              onClick={prepareUpdate}
              disabled={disabled || (!weekendPrice.trim() && !midweekPrice.trim())}
              title={disabled ? 'לא ניתן לבצע פעולות — הקרדיט ב-Beds24 אזל' : undefined}
              data-testid="bulk-price-apply"
            >
              עדכן את {monthLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
