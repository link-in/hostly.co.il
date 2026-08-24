'use client'

import React, { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Reservation } from '@/lib/dashboard/types'
import { mapReservationToDraft } from '@/lib/receipts/mapReservationToDraft'
import type {
  PaymentMethod,
  ReceiptDocumentType,
} from '@/lib/receipts/types'

interface IssuedReceiptRow {
  id: string
  documentType: string
  paymentMethod: string
  amount: number
  externalDocNumber?: string | null
  pdfUrl?: string | null
  status: string
  error?: string | null
  createdAt: string
}

interface IssueReceiptModalProps {
  reservation: Reservation
  onClose: () => void
  onIssued?: (bookingId: string) => void
}

const DOCUMENT_TYPE_OPTIONS: { value: ReceiptDocumentType; label: string }[] = [
  { value: 'receipt', label: 'קבלה' },
  { value: 'tax_invoice_receipt', label: 'חשבונית מס קבלה' },
  { value: 'tax_invoice', label: 'חשבונית מס' },
]

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'מזומן' },
  { value: 'credit_card', label: 'אשראי' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'bit', label: 'ביט' },
  { value: 'other', label: 'אחר' },
]

const DOC_LABELS: Record<string, string> = {
  receipt: 'קבלה',
  tax_invoice: 'חשבונית מס',
  tax_invoice_receipt: 'חשבונית מס קבלה',
}

export default function IssueReceiptModal({
  reservation,
  onClose,
  onIssued,
}: IssueReceiptModalProps) {
  const draft = mapReservationToDraft(reservation)

  const [documentType, setDocumentType] = useState<ReceiptDocumentType>(
    draft.documentType
  )
  const [docTypeOptions, setDocTypeOptions] = useState(DOCUMENT_TYPE_OPTIONS)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    draft.paymentMethod
  )
  const [amount, setAmount] = useState(String(draft.amount))
  const [customerName, setCustomerName] = useState(draft.customerName)
  const [customerEmail, setCustomerEmail] = useState(draft.customerEmail)
  const [customerPhone, setCustomerPhone] = useState(draft.customerPhone)
  const [customerVatId, setCustomerVatId] = useState('')
  const [description, setDescription] = useState(draft.description)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<IssuedReceiptRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null)
  const [lastDocNumber, setLastDocNumber] = useState<string | null>(null)
  const [accountHint, setAccountHint] = useState<string | null>(null)

  const needsVatId =
    documentType === 'tax_invoice' || documentType === 'tax_invoice_receipt'

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/receipts/doctypes')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) return
        if (cancelled) return
        const available = (data.hostlyOptions || []).filter(
          (o: { available?: boolean }) => o.available
        )
        if (available.length > 0) {
          setDocTypeOptions(
            available.map((o: { value: ReceiptDocumentType; label: string }) => ({
              value: o.value,
              label: o.label,
            }))
          )
          const stillValid = available.some(
            (o: { value: string }) => o.value === documentType
          )
          if (!stillValid) {
            setDocumentType(available[0].value)
          }
          const onlyReceipt =
            available.length === 1 && available[0].value === 'receipt'
          if (onlyReceipt) {
            setAccountHint(
              'בחשבון iCount שלך זמינה כרגע רק קבלה (ללא חשבונית מס) — נפוץ בעוסק פטור.'
            )
          }
        }
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      cancelled = true
    }
    // Intentionally once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    fetch(`/api/dashboard/receipts?bookingId=${encodeURIComponent(reservation.id)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת היסטוריה')
        if (!cancelled) setHistory(data.receipts || [])
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reservation.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = Number(amount)
    if (!customerName.trim()) {
      toast.error('שם לקוח חובה')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('סכום לא תקין')
      return
    }
    if (!description.trim()) {
      toast.error('תיאור חובה')
      return
    }

    setSubmitting(true)
    setLastPdfUrl(null)
    setLastDocNumber(null)

    try {
      const res = await fetch('/api/dashboard/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reservation.id,
          documentType,
          paymentMethod,
          amount: parsedAmount,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerVatId: customerVatId.trim(),
          description: description.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'הנפקת המסמך נכשלה')
      }

      toast.success(
        data.externalDocNumber
          ? `מסמך הונפק: ${data.externalDocNumber}`
          : 'המסמך הונפק בהצלחה'
      )
      setLastPdfUrl(data.pdfUrl || null)
      setLastDocNumber(data.externalDocNumber || null)
      onIssued?.(reservation.id)

      // Refresh history
      const histRes = await fetch(
        `/api/dashboard/receipts?bookingId=${encodeURIComponent(reservation.id)}`
      )
      if (histRes.ok) {
        const histData = await histRes.json()
        setHistory(histData.receipts || [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.72)',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  }

  const panelStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid rgba(249, 147, 251, 0.2)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
    color: '#fff',
    direction: 'rtl',
    overflow: 'hidden',
  }

  const bodyScrollStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '1.25rem',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    color: 'rgba(249,147,251,0.85)',
    marginBottom: 4,
    fontWeight: 600,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.25)',
    color: '#fff',
    padding: '0.55rem 0.75rem',
  }

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-receipt-title"
      onClick={onClose}
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div
          className="d-flex align-items-center justify-content-between flex-shrink-0"
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <FileText size={20} color="#f093fb" />
            <h2 id="issue-receipt-title" className="h5 mb-0">
              הוצאת מסמך מס
            </h2>
          </div>
          <button
            type="button"
            className="hostly-btn hostly-btn-sm hostly-btn-ghost"
            onClick={onClose}
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="hostly-modal-scroll"
          style={bodyScrollStyle}
        >
          <p className="small mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
            הזמנה #{reservation.id}
            {reservation.guestName ? ` · ${reservation.guestName}` : ''}
          </p>
          {accountHint && (
            <div
              className="small mb-3 p-2 rounded"
              style={{
                background: 'rgba(249,147,251,0.1)',
                border: '1px solid rgba(249,147,251,0.25)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {accountHint}
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <label style={labelStyle}>סוג מסמך</label>
              <select
                style={inputStyle}
                value={documentType}
                onChange={(e) =>
                  setDocumentType(e.target.value as ReceiptDocumentType)
                }
              >
                {docTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label style={labelStyle}>צורת תשלום</label>
              <select
                style={inputStyle}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label style={labelStyle}>סכום (₪)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                style={inputStyle}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label style={labelStyle}>שם לקוח</label>
              <input
                type="text"
                style={inputStyle}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label style={labelStyle}>אימייל</label>
              <input
                type="email"
                style={inputStyle}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label style={labelStyle}>טלפון</label>
              <input
                type="tel"
                style={inputStyle}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            {needsVatId && (
              <div className="col-12">
                <label style={labelStyle}>ח.פ / ע.מ לקוח</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={customerVatId}
                  onChange={(e) => setCustomerVatId(e.target.value)}
                  placeholder="אופציונלי"
                />
              </div>
            )}
            <div className="col-12">
              <label style={labelStyle}>תיאור</label>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {(lastPdfUrl || lastDocNumber) && (
            <div
              className="mt-3 p-3 rounded"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(74,222,128,0.35)',
              }}
            >
              {lastDocNumber && (
                <div className="mb-1">מספר מסמך: {lastDocNumber}</div>
              )}
              {lastPdfUrl && (
                <a
                  href={lastPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hostly-btn hostly-btn-sm hostly-btn-success"
                >
                  <ExternalLink size={14} />
                  פתח PDF
                </a>
              )}
            </div>
          )}

          <div className="d-flex gap-2 mt-4 flex-wrap">
            <button
              type="submit"
              className="hostly-btn hostly-btn-primary flex-grow-1"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  מנפיק…
                </>
              ) : (
                <>
                  <FileText size={16} />
                  הנפק מסמך
                </>
              )}
            </button>
            <button
              type="button"
              className="hostly-btn hostly-btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              סגור
            </button>
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="small fw-semibold mb-2" style={{ color: 'rgba(249,147,251,0.85)' }}>
              מסמכים קודמים להזמנה
            </div>
            {historyLoading ? (
              <div className="small text-white-50">טוען…</div>
            ) : history.length === 0 ? (
              <div className="small" style={{ color: 'rgba(255,255,255,0.5)' }}>
                עדיין לא הונפקו מסמכים להזמנה זו
              </div>
            ) : (
              <ul className="list-unstyled mb-0 small">
                {history.map((row) => (
                  <li
                    key={row.id}
                    className="d-flex justify-content-between align-items-center gap-2 py-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span>
                      {DOC_LABELS[row.documentType] || row.documentType}
                      {row.externalDocNumber ? ` #${row.externalDocNumber}` : ''}
                      {' · '}
                      ₪{row.amount}
                      {row.status === 'failed' ? ' (נכשל)' : ''}
                    </span>
                    {row.pdfUrl && (
                      <a
                        href={row.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#f093fb' }}
                      >
                        PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
