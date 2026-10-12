'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  MessageSquare,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { StatCard, Button } from '@/components/ui'
import type { WhatsAppMessageLogRow } from '@/lib/db/whatsappMessages'
import {
  groupWhatsAppMessageLogs,
  type WhatsAppMessageLogGroup,
} from '@/lib/whatsapp/groupMessageLogs'

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  new_booking_guest: 'הזמנה חדשה — אורח',
  new_booking_owner: 'הזמנה חדשה — בעלים',
  cancellation_owner: 'ביטול — בעלים',
  booking_request_owner: 'בקשת הזמנה — בעלים',
  inquiry_owner: 'בירור מאורח — בעלים',
  check_in_guest: "צ'ק-אין — אורח",
  check_in_owner: "צ'ק-אין — בעלים",
  review_reminder_guest: 'בקשת ביקורת — אורח',
  review_reminder_test: 'בדיקת ביקורת',
  public_booking_owner: 'הזמנה מהאתר — בעלים',
  manual_booking_guest: 'הזמנה ידנית — אורח',
  arrival_day_guest: 'הודעת הגעה — אורח',
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
  if (status === 'partial') {
    return (
      <span className="badge d-inline-flex align-items-center gap-1 bg-warning text-dark">
        <Clock size={13} /> חלקי
      </span>
    )
  }
  return (
    <span className="badge d-inline-flex align-items-center gap-1 bg-secondary">
      <Clock size={13} /> {status}
    </span>
  )
}

function GroupRow({
  group,
  expanded,
  onToggle,
}: {
  group: WhatsAppMessageLogGroup
  expanded: boolean
  onToggle: () => void
}) {
  const phones = group.recipients.map((r) => r.phone)
  const recipientErrors = group.recipients.filter((r) => r.error)

  return (
    <tr>
      <td className="small text-nowrap">{formatDate(group.created_at)}</td>
      <td className="small">{MESSAGE_TYPE_LABELS[group.message_type] || group.message_type}</td>
      <td className="small">
        <div>{group.recipient_name || '—'}</div>
        <div style={{ color: 'var(--htxt-3)', fontSize: 11 }}>
          {ROLE_LABELS[group.recipient_role] || group.recipient_role}
          {group.recipients.length > 1 ? ` · ${group.recipients.length} נמענים` : ''}
        </div>
      </td>
      <td className="small font-monospace" dir="ltr">
        {phones.length === 1 ? (
          phones[0]
        ) : (
          <div className="d-flex flex-column gap-1">
            {phones.map((phone) => (
              <span key={phone}>{phone}</span>
            ))}
          </div>
        )}
      </td>
      <td>
        <StatusBadge status={group.status} />
        {recipientErrors.length > 0 && (
          <div className="text-danger small mt-1" style={{ maxWidth: 180 }}>
            {recipientErrors[0].error}
          </div>
        )}
      </td>
      <td className="small font-monospace" dir="ltr">
        {group.booking_id || '—'}
      </td>
      <td>
        <button
          type="button"
          className="btn btn-sm btn-link text-muted p-0"
          aria-label={expanded ? 'הסתר תוכן' : 'הצג תוכן'}
          onClick={onToggle}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </td>
    </tr>
  )
}

export default function MessageLogsSection() {
  const [messages, setMessages] = useState<WhatsAppMessageLogRow[]>([])
  const [rawTotal, setRawTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setRawTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההודעות')
      setMessages([])
      setRawTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const groups = useMemo(() => groupWhatsAppMessageLogs(messages), [messages])
  const sentCount = groups.filter((g) => g.status === 'sent').length
  const failedCount = groups.filter((g) => g.status === 'failed' || g.status === 'partial').length

  return (
    <section aria-labelledby="dispatch-log-title" className="mb-5">
      {/* כותרת מקטע */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--hb-100)',
            color: 'var(--hb)',
          }}
        >
          <History size={20} />
        </div>
        <div>
          <h2
            id="dispatch-log-title"
            style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--htxt-1)' }}
          >
            יומן שליחות
          </h2>
          <p style={{ color: 'var(--htxt-3)', fontSize: '13px', margin: 0 }}>
            מעקב ובקרה אחר כל הודעות ה-WhatsApp שנשלחו מהמערכת.
          </p>
        </div>
      </div>

      {/* כרטיסיות סטטיסטיקה */}
      <div className="row g-3 mb-3">
        <div className="col-4">
          <StatCard
            label="הודעות"
            value={groups.length}
            helper={rawTotal > groups.length ? `${rawTotal} שליחות` : undefined}
          />
        </div>
        <div className="col-4">
          <StatCard
            label="נשלחו"
            value={sentCount}
            trend={sentCount > 0 ? { value: 'נמסרו בהצלחה', up: true } : undefined}
          />
        </div>
        <div className="col-4">
          <StatCard
            label="נכשלו / חלקי"
            value={failedCount}
            helper={failedCount > 0 ? `${failedCount} דורשים בדיקה` : undefined}
          />
        </div>
      </div>

      {/* כרטיס יומן שליחות ראשי */}
      <div className="hostly-card p-3 p-md-4">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <MessageSquare size={18} style={{ color: 'var(--hb)' }} />
            <span className="fw-semibold" style={{ color: 'var(--htxt-1)' }}>
              יומן שליחות
            </span>
          </div>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'sent' | 'failed')}
            aria-label="סינון לפי סטטוס"
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
            aria-label="סינון לפי סוג הודעה"
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
            className="hostly-btn hostly-btn-sm hostly-btn-ghost ms-auto"
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

        {!error && groups.length === 0 && !loading && (
          <div className="text-center text-muted py-5">
            <MessageSquare size={36} className="mb-2 opacity-50" />
            <div>עדיין אין הודעות ביומן</div>
            <div className="small mt-1">שליחות חדשות יופיעו כאן אוטומטית</div>
          </div>
        )}

        {groups.length > 0 && (
          <div className="table-responsive dashboard-table-scroll-container">
            <table className="table table-hover align-middle mb-0 hostly-dark-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 130 }}>תאריך</th>
                  <th>סוג</th>
                  <th>נמען</th>
                  <th>טלפונים</th>
                  <th>סטטוס</th>
                  <th>הזמנה</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <GroupRow
                    key={group.id}
                    group={group}
                    expanded={expandedId === group.id}
                    onToggle={() => setExpandedId(expandedId === group.id ? null : group.id)}
                  />
                ))}
              </tbody>
            </table>

            {expandedId && (
              <div className="border-top mt-0 p-3 hostly-dark-panel rounded-bottom">
                {(() => {
                  const group = groups.find((g) => g.id === expandedId)
                  if (!group) return null
                  return (
                    <div>
                      <div className="small text-muted mb-1">תוכן ההודעה</div>
                      <pre
                        className="mb-3 p-3 hostly-dark-panel border rounded small"
                        style={{ whiteSpace: 'pre-wrap', direction: 'rtl' }}
                      >
                        {group.message_body || '(ריק)'}
                      </pre>
                      <div className="small text-muted mb-1">נמענים</div>
                      <ul className="list-unstyled mb-2 small">
                        {group.recipients.map((r) => (
                          <li key={r.id} className="d-flex flex-wrap gap-2 align-items-center mb-1">
                            <span className="font-monospace" dir="ltr">
                              {r.phone}
                            </span>
                            <StatusBadge status={r.status} />
                            {r.error && <span className="text-danger">{r.error}</span>}
                            {r.provider_message_id && (
                              <span className="text-muted" dir="ltr">
                                ID: {r.provider_message_id}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="small text-muted">ספק: {group.provider || '—'}</div>
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
    </section>
  )
}
