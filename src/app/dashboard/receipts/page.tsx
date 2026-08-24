'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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

const DOC_LABELS: Record<string, string> = {
  receipt: 'קבלה',
  tax_invoice: 'חשבונית מס',
  tax_invoice_receipt: 'חשבונית מס קבלה',
}

const PAY_LABELS: Record<string, string> = {
  cash: 'מזומן',
  credit_card: 'אשראי',
  bank_transfer: 'העברה',
  bit: 'ביט',
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

function formatMoney(amount: number): string {
  return `₪${Number(amount).toLocaleString('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export default function ReceiptsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [receipts, setReceipts] = useState<IssuedReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'failed'>('all')
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`/api/dashboard/receipts?${params}`)
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

  const issuedCount = useMemo(
    () => receipts.filter((r) => r.status === 'issued').length,
    [receipts]
  )
  const failedCount = useMemo(
    () => receipts.filter((r) => r.status === 'failed').length,
    [receipts]
  )
  const totalAmount = useMemo(
    () =>
      receipts
        .filter((r) => r.status === 'issued')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [receipts]
  )

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
            title="קבלות וחשבוניות"
            showLandingPageButton={true}
            currentPage="receipts"
          />
        </div>
        {children}
      </div>
    </main>
  )

  if (authStatus === 'loading' || (loading && receipts.length === 0 && !error)) {
    return pageShell(
      <DashboardLoader
        variant="section"
        tone="onGradient"
        label="טוען קבלות…"
        minHeight={280}
      />
    )
  }

  return pageShell(
    <>
      <div className="row g-3 mb-3">
        <div className="col-4">
          <div className="hostly-dark-stat rounded-3 p-3 shadow-sm text-center">
            <div className="stat-label small">מסמכים</div>
            <div className="stat-value fw-bold fs-4">{receipts.length}</div>
          </div>
        </div>
        <div className="col-4">
          <div className="hostly-dark-stat rounded-3 p-3 shadow-sm text-center">
            <div className="stat-label small">הונפקו</div>
            <div className="stat-value fw-bold fs-4 text-success">{issuedCount}</div>
          </div>
        </div>
        <div className="col-4">
          <div className="hostly-dark-stat rounded-3 p-3 shadow-sm text-center">
            <div className="stat-label small">סה״כ שהונפק</div>
            <div className="stat-value fw-bold fs-5">{formatMoney(totalAmount)}</div>
            {failedCount > 0 && (
              <div className="small text-danger mt-1">{failedCount} נכשלו</div>
            )}
          </div>
        </div>
      </div>

      <div className="hostly-dark-card rounded-3 shadow-sm p-3 p-md-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <FileText size={20} color="#f093fb" />
            <h2 className="h5 mb-0 text-white">כל המסמכים שהופקו</h2>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <select
              className="form-select form-select-sm"
              style={{
                width: 'auto',
                background: 'rgba(0,0,0,0.25)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'issued' | 'failed')
              }
            >
              <option value="all">הכל</option>
              <option value="issued">הונפקו</option>
              <option value="failed">נכשלו</option>
            </select>
            <button
              type="button"
              className="hostly-btn hostly-btn-sm hostly-btn-ghost"
              onClick={fetchReceipts}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : undefined} />
              רענון
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small mb-3">{error}</div>
        )}

        {receipts.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            עדיין לא הופקו קבלות. מהדשבורד — פתחו הזמנה ולחצו «הוצא קבלה».
          </div>
        ) : (
          <div className="table-responsive dashboard-table-scroll-container hostly-modal-scroll">
            <table className="table hostly-dark-table align-middle mb-0">
              <thead>
                <tr className="small">
                  <th>תאריך</th>
                  <th>הזמנה</th>
                  <th>לקוח</th>
                  <th>סוג</th>
                  <th>תשלום</th>
                  <th>סכום</th>
                  <th>מס׳ מסמך</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((row) => (
                  <tr key={row.id}>
                    <td className="small text-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="small fw-semibold">#{row.bookingId}</td>
                    <td>
                      <div className="fw-semibold">{row.customerName}</div>
                      {row.customerEmail && (
                        <div className="small" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {row.customerEmail}
                        </div>
                      )}
                    </td>
                    <td className="small">
                      {DOC_LABELS[row.documentType] || row.documentType}
                    </td>
                    <td className="small">
                      {PAY_LABELS[row.paymentMethod] || row.paymentMethod}
                    </td>
                    <td className="fw-bold" style={{ color: '#f093fb' }}>
                      {formatMoney(row.amount)}
                    </td>
                    <td className="small">
                      {row.externalDocNumber ? `#${row.externalDocNumber}` : '—'}
                    </td>
                    <td>
                      {row.status === 'issued' ? (
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> הונפק
                        </span>
                      ) : (
                        <span
                          className="badge bg-danger d-inline-flex align-items-center gap-1"
                          title={row.error || undefined}
                        >
                          <XCircle size={12} /> נכשל
                        </span>
                      )}
                    </td>
                    <td>
                      {row.pdfUrl && (
                        <a
                          href={row.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hostly-btn hostly-btn-sm hostly-btn-ghost"
                        >
                          <ExternalLink size={14} />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
