'use client'

// Fixes HOS-16

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader, StatCard, DataTable, Button } from '@/components/ui'
import type { ColumnDef } from '@/components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssuedReceipt {
  id: string
  bookingId: string
  documentType: string
  paymentMethod: string
  amount: number
  customerName: string
  customerEmail?: string | null
  provider: string
  externalDocNumber?: string | null
  pdfUrl?: string | null
  status: string
  error?: string | null
  createdAt: string
}

// ─── Lookup maps ─────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  receipt:             'קבלה',
  tax_invoice:         'חשבונית מס',
  tax_invoice_receipt: 'חשבונית מס קבלה',
}

const PAY_LABELS: Record<string, string> = {
  cash:          'מזומן',
  credit_card:   'אשראי',
  bank_transfer: 'העברה',
  bit:           'ביט',
  other:         'אחר',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatMoney(amount: number): string {
  return `₪${Number(amount).toLocaleString('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  if (status === 'issued') {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 9999,
          fontSize: 11.5, fontWeight: 600,
          color: '#15803d',
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        <CheckCircle2 size={12} />
        הונפק
      </span>
    )
  }
  return (
    <span
      title={error ?? undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 9999,
        fontSize: 11.5, fontWeight: 600,
        color: '#dc2626',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
      }}
    >
      <XCircle size={12} />
      נכשל
    </span>
  )
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef<IssuedReceipt>[] = [
  {
    header: 'תאריך',
    cell: (r) => (
      <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', color: 'var(--htxt-2)' }}>
        {formatDate(r.createdAt)}
      </span>
    ),
    minWidth: 120,
  },
  {
    header: 'הזמנה',
    cell: (r) => <span style={{ fontWeight: 600 }}>#{r.bookingId}</span>,
    hideOnMobile: true,
  },
  {
    header: 'לקוח',
    cell: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.customerName}</div>
        {r.customerEmail && (
          <div style={{ fontSize: 12, color: 'var(--htxt-3)', marginTop: 1 }}>
            {r.customerEmail}
          </div>
        )}
      </div>
    ),
  },
  {
    header: 'סוג מסמך',
    cell: (r) => DOC_LABELS[r.documentType] ?? r.documentType,
    hideOnMobile: true,
  },
  {
    header: 'תשלום',
    cell: (r) => PAY_LABELS[r.paymentMethod] ?? r.paymentMethod,
    hideOnMobile: true,
  },
  {
    header: 'סכום',
    cell: (r) => (
      <span style={{ fontWeight: 700, color: 'var(--hb)' }}>
        {formatMoney(r.amount)}
      </span>
    ),
    align: 'end',
  },
  {
    header: 'מס׳ מסמך',
    cell: (r) => r.externalDocNumber ? `#${r.externalDocNumber}` : '—',
    hideOnMobile: true,
  },
  {
    header: 'סטטוס',
    cell: (r) => <StatusBadge status={r.status} error={r.error} />,
  },
  {
    header: '',
    cell: (r) =>
      r.pdfUrl ? (
        <a
          href={r.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hostly-btn hostly-btn-sm hostly-btn-on-light hostly-btn-ghost"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={13} />
          PDF
        </a>
      ) : null,
    hideOnMobile: true,
  },
]

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [receipts,     setReceipts]     = useState<IssuedReceipt[]>([])
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'failed'>('all')
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/')
  }, [authStatus, router])

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', '300')
      const res  = await fetch(`/api/dashboard/receipts?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת הקבלות')
      setReceipts(data.receipts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הקבלות')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    fetchReceipts()
  }, [authStatus, fetchReceipts])

  // ─── Derived stats ───────────────────────────────────────────────────────

  const issuedCount  = useMemo(() => receipts.filter(r => r.status === 'issued').length, [receipts])
  const failedCount  = useMemo(() => receipts.filter(r => r.status === 'failed').length, [receipts])
  const totalAmount  = useMemo(
    () => receipts.filter(r => r.status === 'issued').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [receipts],
  )

  // ─── Loading state ───────────────────────────────────────────────────────

  if (authStatus === 'loading' || (loading && receipts.length === 0 && !error)) {
    return (
      <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        {/* ניווט מובייל */}
        <DashboardHeader session={session} currentPage="receipts" />
        <div className="container-fluid py-3 py-md-4">
          <DashboardLoader variant="section" label="טוען קבלות…" minHeight={280} />
        </div>
      </main>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      {/* ניווט מובייל — bottom nav + drawer */}
      <DashboardHeader session={session} currentPage="receipts" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">

        {/* ── כותרת עמוד ── */}
        <div className="mb-4">
          <PageHeader
            title="קבלות וחשבוניות"
            subtitle="כל המסמכים הפיננסיים שהופקו"
            icon={<FileText size={20} />}
            actions={
              <Button
                variant="ghost"
                size="sm"
                loading={loading}
                iconStart={<RefreshCw size={14} />}
                onClick={fetchReceipts}
              >
                רענון
              </Button>
            }
          />
        </div>

        {/* ── כרטיסי סטטיסטיקה — גובה אחיד ── */}
        <div className="row g-2 g-md-3 mb-4">
          <div className="col-4">
            <StatCard
              label="מסמכים"
              value={String(receipts.length)}
            />
          </div>
          <div className="col-4">
            <StatCard
              label="הונפקו"
              value={String(issuedCount)}
              trend={failedCount > 0
                ? { value: `${failedCount} נכשלו`, up: false }
                : undefined}
            />
          </div>
          <div className="col-4">
            <StatCard
              label="סה״כ שהונפק"
              value={formatMoney(totalAmount)}
            />
          </div>
        </div>

        {/* ── שגיאה ── */}
        {error && (
          <div
            className="mb-3 p-3 rounded-2"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#dc2626', fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* ── פילטר ── */}
        <div className="mb-3 d-flex align-items-center gap-2">
          {(['all', 'issued', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '5px 14px', borderRadius: 9999,
                fontSize: 13, fontWeight: statusFilter === f ? 600 : 400,
                cursor: 'pointer', border: '1px solid',
                borderColor: statusFilter === f ? 'rgba(113,51,217,0.4)' : 'var(--hborder)',
                background:  statusFilter === f ? 'rgba(113,51,217,0.1)' : 'transparent',
                color:       statusFilter === f ? 'var(--hb)' : 'var(--htxt-2)',
                transition: 'all 0.15s',
              }}
            >
              {{ all: 'הכל', issued: 'הונפקו', failed: 'נכשלו' }[f]}
            </button>
          ))}
        </div>

        {/* ── טבלה + כרטיסיות מובייל ── */}
        <DataTable
          data={receipts}
          columns={COLUMNS}
          keyField="id"
          loading={loading}
          emptyMessage="עדיין לא הופקו קבלות. מהדשבורד — פתחו הזמנה ולחצו «הוצא קבלה»."
          mobileTitle="customerName"
          mobileSubtitle={(r) =>
            `${DOC_LABELS[r.documentType] ?? r.documentType} · הזמנה #${r.bookingId}`
          }
        />

      </div>
    </main>
  )
}
