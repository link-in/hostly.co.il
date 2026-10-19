'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { StepPanel } from './StepPanel'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

const CHECKLIST = [
  'הלקוח נכנס ל-Extranet של Booking.com, תחת חשבון ואז ספק קישוריות.',
  'הלקוח חיפש את Beds24, וסימן גם הזמנות וגם מחירים וזמינות.',
  'ב-Beds24, תחת מנהל ערוצים ואז Booking.com, הוזן מזהה המלון.',
  'החדרים ותוכניות המחיר מופו בעזרת הכפתור לקבלת הקודים.',
  'החדר הופעל, ההזמנות הקיימות יובאו, והחיבור הופעל.',
] as const

export function BookingComStep({ api, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const done = readData<{ hotelId: string | null; confirmedAt: string }>(record)
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => status === 'done'))
  const [hotelId, setHotelId] = useState(done.hotelId ?? '')
  const allChecked = checked.every(Boolean)

  return (
    <StepPanel title="חיבור Booking.com" status={status} savedError={record?.error} actionError={error}>
      <p className="text-muted small">
        ל-Beds24 אין API לחיבור ולמיפוי של Booking.com, ולכן השלב הזה ידני. סמן כל פעולה אחרי שבוצעה.
      </p>
      <ul className="list-unstyled mb-3">
        {CHECKLIST.map((item, i) => (
          <li key={item} className="form-check mb-1">
            <input
              id={`booking-check-${i}`}
              type="checkbox"
              className="form-check-input"
              checked={checked[i]}
              onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            <label className="form-check-label small" htmlFor={`booking-check-${i}`}>{item}</label>
          </li>
        ))}
      </ul>
      <div className="mb-3" style={{ maxWidth: 240 }}>
        <label className="form-label small fw-semibold" htmlFor="booking-hotel-id">מזהה מלון ב-Booking.com</label>
        <input id="booking-hotel-id" className="form-control form-control-sm" inputMode="numeric" value={hotelId} onChange={(e) => setHotelId(e.target.value)} />
      </div>
      <div className="d-flex gap-2 align-items-center">
        <Button type="button" variant="primary" loading={running} disabled={!allChecked} onClick={() => run(() => api.confirmBookingCom(hotelId || undefined))}>
          {status === 'done' ? 'עדכן' : 'אשר שהחיבור הושלם'}
        </Button>
        {status !== 'done' && status !== 'skipped' && (
          <Button type="button" variant="ghost" size="sm" disabled={running} onClick={() => run(() => api.skip('bookingCom'))}>
            ללקוח אין Booking.com – דלג
          </Button>
        )}
      </div>
    </StepPanel>
  )
}
