'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import type { WhatsAppMessageLogRow } from '@/lib/db/whatsappMessages'

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  new_booking_guest: 'הזמנה חדשה — אורח',
  new_booking_owner: 'הזמנה חדשה — בעלים',
  cancellation_owner: 'ביטול — בעלים',
  booking_request_owner: 'בקשת הזמנה — בעלים',
  check_in_guest: "צ'ק-אין — אורח",
  check_in_owner: "צ'ק-אין — בעלים",
  review_reminder_guest: 'בקשת ביקורת — אורח',
  review_reminder_test: 'בדיקת ביקורת',
  public_booking_owner: 'הזמנה מהאתר — בעלים',
  manual_booking_guest: 'הזמנה ידנית — אורח',
  other: 'אחר',
}

const ROLE_LABELS: Record<string, string> = {
  guest: 'אורח',
  owner: 'בעלים',
  other: 'אחר',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent') {
    return (
      <span className="badge d-inline-flex align-items-center gap-1 bg-success">
        <CheckCircle2 size={13} /> נשלח
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="badge d-inline-flex align-items-center gap-1 bg-danger">
        <XCircle size={13} /> נכשל
      </span>
    )
  }
  return (
    <span className="badge d-inline-flex align-items-center gap-1 bg-secondary">
      <Clock size={13} /> {status}
    </span>
  )
}

export default function WhatsAppMessagesPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<WhatsAppMessageLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/')
  }, [authStatus, router])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('limit', '200')

      const res = await fetch(`/api/dashboard/whatsapp-messages?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'שגיאה בטעינת ההודעות')
      }
      const data = await res.json()
      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההודעות')
      setMessages([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    if (authStatus === 'authenticated') fetchMessages()
  }, [authStatus, fetchMessages])

  const sentCount = messages.filter((m) => m.status === 'sent').length
  const failedCount = messages.filter((m) => m.status === 'failed').length

  const pageShell = (children: ReactNode) => (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }}
      dir="rtl"
    >
      <div className="container py-3 py-md-5">
        <div className="mb-3 mb-md-4">
          <DashboardHeader
            session={session}
            title="הודעות WhatsApp"
            showLandingPageButton={true}
            currentPage="messages"
          />
        </div>
        {children}
      </div>
    </main>
  )

  if (authStatus === 'loading' || (loading && messages.length === 0 && !error)) {
    return pageShell(
      <div className="text-center text-white py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>,
    )
  }

  return pageShell(
    <>
      <div className="row g-3 mb-3">
        <div className="col-4">
          <div className="bg-white rounded-3 p-3 shadow-sm text-center">
            <div className="text-muted small">סה״כ</div>
            <div className="fw-bold fs-4">{total}</div>
          </div>
        </div>
        <div className="col-4">
          <div className="bg-white rounded-3 p-3 shadow-sm text-center">
            <div className="text-muted small">נשלחו</div>
            <div className="fw-bold fs-4 text-success">{sentCount}</div>
          </div>
        </div>
        <div className="col-4">
          <div className="bg-white rounded-3 p-3 shadow-sm text-center">
            <div className="text-muted small">נכשלו</div>
            <div className="fw-bold fs-4 text-danger">{failedCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3 shadow-sm p-3 p-md-4">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 mb-3">
          <div className="d-flex align-items-center gap-2 text-muted">
            <MessageSquare size={18} />
            <span className="fw-semibold text-dark">יומן שליחות</span>
          </div>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'sent' | 'failed')}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="sent">נשלח</option>
            <option value="failed">נכשל</option>
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', maxWidth: '220px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">כל הסוגים</option>
            {Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 ms-auto"
            onClick={fetchMessages}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            רענון
          </button>
        </div>

        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
            <div className="small mt-1">
              אם זו הפעם הראשונה — ודא שהרצת את המיגרציה{' '}
              <code>023_whatsapp_messages_log.sql</code> ב-Supabase.
            </div>
          </div>
        )}

        {!error && messages.length === 0 && (
          <div className="text-center text-muted py-5">
            <MessageSquare size={36} className="mb-2 opacity-50" />
            <div>עדיין אין הודעות ביומן</div>
            <div className="small mt-1">שליחות חדשות יופיעו כאן אוטומטית</div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: 130 }}>תאריך</th>
                  <th>סוג</th>
                  <th>נמען</th>
                  <th>טלפון</th>
                  <th>סטטוס</th>
                  <th>הזמנה</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {messages.map((row) => {
                  const expanded = expandedId === row.id
                  return (
                    <tr key={row.id}>
                      <td className="small text-nowrap">{formatDate(row.created_at)}</td>
                      <td className="small">
                        {MESSAGE_TYPE_LABELS[row.message_type] || row.message_type}
                      </td>
                      <td className="small">
                        <div>{row.recipient_name || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {ROLE_LABELS[row.recipient_role] || row.recipient_role}
                        </div>
                      </td>
                      <td className="small font-monospace" dir="ltr">
                        {row.recipient_phone}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                        {row.error && (
                          <div className="text-danger small mt-1" style={{ maxWidth: 180 }}>
                            {row.error}
                          </div>
                        )}
                      </td>
                      <td className="small font-monospace" dir="ltr">
                        {row.booking_id || '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-muted p-0"
                          aria-label={expanded ? 'הסתר תוכן' : 'הצג תוכן'}
                          onClick={() => setExpandedId(expanded ? null : row.id)}
                        >
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {expandedId && (
              <div className="border-top mt-0 p-3 bg-light rounded-bottom">
                {(() => {
                  const row = messages.find((m) => m.id === expandedId)
                  if (!row) return null
                  return (
                    <div>
                      <div className="small text-muted mb-1">תוכן ההודעה</div>
                      <pre
                        className="mb-2 p-3 bg-white border rounded small"
                        style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}
                      >
                        {row.message_body || '(ריק)'}
                      </pre>
                      <div className="d-flex flex-wrap gap-3 small text-muted">
                        <span>ספק: {row.provider || '—'}</span>
                        <span dir="ltr">ID: {row.provider_message_id || '—'}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </>,
  )
}
