'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { Reservation } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'

interface CleaningCostModalProps {
  reservation: Reservation
  onClose: () => void
  onSaved: (updated: Reservation) => void
}

/**
 * עריכה מהירה של עלות ניקיון לכל הזמנה (כולל Airbnb / Booking.com).
 * שולח ל-API רק את שדות הניקיון, בלי לגעת בשדות שמסונכרנים מהערוץ.
 */
export default function CleaningCostModal({ reservation, onClose, onSaved }: CleaningCostModalProps) {
  const [cost, setCost] = useState(reservation.cleaningCost ? String(reservation.cleaningCost) : '')
  const [cleanerName, setCleanerName] = useState(reservation.cleanerName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (clear: boolean) => {
    const parsed = clear ? 0 : Number(cost)
    if (!clear && (!cost.trim() || !Number.isFinite(parsed) || parsed <= 0)) {
      setError('יש להזין עלות מנקה תקינה (גדולה מ-0).')
      return
    }

    setSaving(true)
    setError(null)
    const name = clear ? '' : cleanerName.trim()
    try {
      const response = await fetch('/api/dashboard/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reservation.id,
          propertyId: reservation.propertyId,
          roomId: reservation.roomId,
          cleaningCost: parsed,
          hasCleaning: !clear,
          cleanerName: name,
          notes: reservation.notes ?? '',
        }),
      })
      if (!response.ok) throw new Error('עדכון עלות הניקיון נכשל')

      const result = await response.json().catch(() => ({}))
      const updated: Reservation = {
        ...reservation,
        hasCleaning: !clear,
        cleaningCost: clear ? undefined : parsed,
        cleanerName: name || undefined,
      }
      toast.success(
        result.demo ? '🎭 מצב דמו: עלות הניקיון עודכנה' : clear ? 'הניקיון הוסר מההזמנה' : 'עלות הניקיון עודכנה',
      )
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון עלות הניקיון נכשל')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cleaning-cost-title"
      onClick={onClose}
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="cleaning-cost-modal"
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between"
          style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--hborder-light)' }}
        >
          <h2 id="cleaning-cost-title" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            עלות מנקה
          </h2>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="סגור">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          <div className="small mb-3" style={{ color: 'var(--htxt-3)' }}>
            {reservation.guestName || 'אורח'} · {reservation.source ?? '—'} · {formatCurrency(reservation.total)}
          </div>

          <label className="form-label small fw-semibold" htmlFor="cleaning-cost-input">
            כמה עולה המנקה (₪)
          </label>
          <input
            id="cleaning-cost-input"
            type="number"
            min={0}
            autoFocus
            className="form-control mb-3"
            placeholder="לדוגמה: 250"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />

          <label className="form-label small fw-semibold" htmlFor="cleaner-name-input">
            שם המנקה (אופציונלי)
          </label>
          <input
            id="cleaner-name-input"
            type="text"
            className="form-control mb-2"
            placeholder="לדוגמה: מרים"
            value={cleanerName}
            onChange={(e) => setCleanerName(e.target.value)}
          />
          <div className="small" style={{ color: 'var(--htxt-3)' }}>
            עלות הניקיון תקוזז מהרווח הנקי של ההזמנה.
          </div>

          {error && (
            <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
              {error}
            </div>
          )}
        </div>

        <div
          className="d-flex flex-wrap gap-2"
          style={{ padding: '0.75rem 1.25rem 1.25rem' }}
        >
          <button
            type="button"
            className="hostly-btn hostly-btn-on-light hostly-btn-primary"
            disabled={saving}
            onClick={() => handleSave(false)}
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button type="button" className="hostly-btn hostly-btn-on-light hostly-btn-ghost" disabled={saving} onClick={onClose}>
            ביטול
          </button>
          {reservation.cleaningCost ? (
            <button
              type="button"
              className="hostly-btn hostly-btn-on-light hostly-btn-danger me-auto"
              disabled={saving}
              onClick={() => handleSave(true)}
            >
              הסר ניקיון
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
