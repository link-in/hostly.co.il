'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, Send, Download, ExternalLink, UserCheck } from 'lucide-react'
import type { CheckIn } from '@/lib/check-in/types'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader, StatCard, DataTable, Button } from '@/components/ui'
import type { ColumnDef } from '@/components/ui'
import CheckInStatusBadge from './components/CheckInStatusBadge'

type CheckInFilter = 'all' | 'pending' | 'completed' | 'expired'

const FILTER_LABELS: Record<CheckInFilter, string> = {
  all: 'הכל',
  pending: 'ממתינים',
  completed: 'הושלמו',
  expired: 'פג תוקף',
}

function formatDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('he-IL') : '—'
}

function CheckInsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CheckInFilter>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCheckIns() {
      try {
        const res = await fetch('/api/dashboard/check-ins')
        if (res.ok) {
          setCheckIns(await res.json())
        }
      } catch (error) {
        console.error('Error fetching check-ins:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchCheckIns()
    }
  }, [status])

  const filteredCheckIns = useMemo(
    () => checkIns.filter((c) => filter === 'all' || c.status === filter),
    [checkIns, filter],
  )

  const stats = useMemo(() => {
    const completed = checkIns.filter((c) => c.status === 'completed').length
    return {
      pending: checkIns.filter((c) => c.status === 'pending').length,
      completed,
      total: checkIns.length,
      completionRate: checkIns.length > 0 ? Math.round((completed / checkIns.length) * 100) : 0,
    }
  }, [checkIns])

  const counts: Record<CheckInFilter, number> = {
    all: stats.total,
    pending: stats.pending,
    completed: stats.completed,
    expired: checkIns.filter((c) => c.status === 'expired').length,
  }

  const resendLink = (checkIn: CheckIn) => {
    if (confirm(`לשלוח שוב קישור צ'ק-אין ל-${checkIn.guest_name}?`)) {
      // TODO: Implement resend functionality
      alert('הקישור נשלח בהצלחה!')
    }
  }

  const columns: ColumnDef<CheckIn>[] = [
    {
      header: 'אורח',
      cell: (c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{c.guest_name}</div>
          <div style={{ fontSize: 12, color: 'var(--htxt-3)', marginTop: 1 }}>{c.guest_phone}</div>
        </div>
      ),
      hideOnMobile: true,
    },
    { header: 'תאריך כניסה', cell: (c) => formatDate(c.check_in_date) },
    { header: 'סטטוס', cell: (c) => <CheckInStatusBadge status={c.status} /> },
    { header: 'תאריך השלמה', cell: (c) => formatDate(c.completed_at), hideOnMobile: true },
    {
      header: 'פעולות',
      cell: (c) => (
        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          {c.status === 'pending' && c.token && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              title="פתח קישור צ'ק-אין"
              aria-label="פתח קישור צ'ק-אין"
              onClick={() => window.open(`${window.location.origin}/check-in/${c.token}`, '_blank')}
            >
              <ExternalLink size={16} />
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            iconOnly
            title="צפה בפרטים"
            aria-label="צפה בפרטים"
            onClick={() => router.push(`/dashboard/check-ins/${c.id}`)}
          >
            <Eye size={16} />
          </Button>
          {c.status === 'pending' && (
            <Button variant="ghost" size="sm" iconOnly title="שלח שוב" aria-label="שלח שוב" onClick={() => resendLink(c)}>
              <Send size={16} />
            </Button>
          )}
          {c.status === 'completed' && (
            <Button
              variant="success"
              size="sm"
              iconOnly
              title="הורד PDF"
              aria-label="הורד PDF"
              onClick={() => {
                /* TODO: Download PDF */
              }}
            >
              <Download size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        <DashboardHeader session={session} currentPage="check-ins" />
        <div className="container-fluid py-3 py-md-4">
          <DashboardLoader variant="section" label="טוען צ'ק-אינים…" minHeight={280} />
        </div>
      </main>
    )
  }

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <DashboardHeader session={session} currentPage="check-ins" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader
          title="צ'ק-אין דיגיטלי"
          subtitle="ניהול צ'ק-אינים של אורחים"
          icon={<UserCheck size={20} />}
        />

        <div className="row g-2 g-md-3 mb-4">
          <div className="col-6 col-md-3">
            <StatCard label="ממתינים" value={String(stats.pending)} />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="הושלמו" value={String(stats.completed)} />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="סה״כ" value={String(stats.total)} />
          </div>
          <div className="col-6 col-md-3">
            <StatCard label="אחוז השלמה" value={`${stats.completionRate}%`} />
          </div>
        </div>

        <div className="mb-3 d-flex align-items-center flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as CheckInFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: filter === f ? 600 : 400,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filter === f ? 'rgba(113,51,217,0.4)' : 'var(--hborder)',
                background: filter === f ? 'rgba(113,51,217,0.1)' : 'transparent',
                color: filter === f ? 'var(--hb)' : 'var(--htxt-2)',
                transition: 'all 0.15s',
              }}
            >
              {FILTER_LABELS[f]} ({counts[f]})
            </button>
          ))}
        </div>

        <DataTable
          data={filteredCheckIns}
          columns={columns}
          keyField="id"
          emptyMessage="אין צ'ק-אינים להצגה"
          onRowClick={(c) => router.push(`/dashboard/check-ins/${c.id}`)}
          mobileTitle="guest_name"
          mobileSubtitle="guest_phone"
        />
      </div>
    </main>
  )
}

export default function CheckInsPage() {
  return <CheckInsPageContent />
}
