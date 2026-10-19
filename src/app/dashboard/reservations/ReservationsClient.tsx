'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import type { Reservation } from '@/lib/dashboard/types'
import { getDashboardProvider } from '@/lib/dashboard/getDashboardProvider'
import {
  DEFAULT_COMMISSION_RATES,
  calculateReservationStats,
  filterReservations,
  hasActiveFilters,
  sortReservations,
  type CommissionRates,
  type ReservationFilters as Filters,
  type ReservationSortField,
  type SortDirection,
} from '@/lib/dashboard/reservationsList'
import { markNewReservations, markReservationAsViewed } from '@/lib/dashboard/viewedReservations'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { DataTable, PageHeader } from '@/components/ui'
import RoomTabs from '../components/RoomTabs'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import ReservationsStats from './components/ReservationsStats'
import ReservationsFilters from './components/ReservationsFilters'
import { NewReservationBadge } from './components/ReservationBadges'
import { buildReservationColumns } from './components/reservationColumns'

const INITIAL_FILTERS: Filters = { search: '', status: 'all', source: 'all' }

export default function ReservationsClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { selectedRoomId } = useSelectedRoom()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [sortField, setSortField] = useState<ReservationSortField>('checkIn')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [commissionRates, setCommissionRates] = useState<CommissionRates>(DEFAULT_COMMISSION_RATES)
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())

  const { provider, meta } = useMemo(
    () => getDashboardProvider(session?.user, selectedRoomId || session?.user?.roomId),
    [session?.user, selectedRoomId],
  )

  // ── Auth guard ──
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  // ── Reset loading when the selected room changes ──
  useEffect(() => {
    if (selectedRoomId) setLoading(true)
  }, [selectedRoomId])

  // ── Load data ──
  useEffect(() => {
    let isActive = true

    const load = async () => {
      try {
        const [reservationsData, commissionRatesData] = await Promise.all([
          provider.getReservations(),
          fetch('/api/commission-rates').then((res) => res.json()),
        ])
        if (!isActive) return
        setReservations(markNewReservations(reservationsData))
        if (commissionRatesData.rates) setCommissionRates(commissionRatesData.rates)
        setLoading(false)
      } catch (err) {
        if (!isActive) return
        setError(err instanceof Error ? err.message : 'טעינת נתונים נכשלה')
        setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [provider])

  // ── Derived data ──
  const visibleReservations = useMemo(
    () => sortReservations(filterReservations(reservations, filters), sortField, sortDirection),
    [reservations, filters, sortField, sortDirection],
  )
  const stats = useMemo(
    () => calculateReservationStats(reservations, commissionRates),
    [reservations, commissionRates],
  )

  // ── Handlers ──
  const isUnseenNew = useCallback((r: Reservation) => Boolean(r.isNew) && !viewedIds.has(r.id), [viewedIds])

  const handleRowClick = useCallback(
    (r: Reservation) => {
      if (!isUnseenNew(r)) return
      markReservationAsViewed(r.id)
      setViewedIds((prev) => new Set([...prev, r.id]))
    },
    [isUnseenNew],
  )

  const handleSortChange = (field: ReservationSortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('desc')
  }

  const columns = useMemo(() => buildReservationColumns(isUnseenNew), [isUnseenNew])

  // ── Render ──
  if (status === 'unauthenticated') return null

  if (status === 'loading' || loading) {
    return (
      <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        <DashboardHeader session={session} currentPage="reservations" />
        <div className="container-fluid py-3 py-md-4">
          <DashboardLoader variant="section" label="טוען הזמנות…" minHeight={280} />
        </div>
      </main>
    )
  }

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      {/* ניווט מובייל — bottom nav + drawer */}
      <DashboardHeader session={session} currentPage="reservations" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader title="כל ההזמנות" subtitle="צפייה בהזמנות עם סטטיסטיקות מתקדמות" icon={<ClipboardList size={20} />} />

        <RoomTabs />

        {meta.isMock && session?.user?.isDemo && (
          <div
            className="mb-3 p-3 rounded-2 d-flex align-items-center gap-3"
            style={{ background: 'var(--hb-50)', border: '1px solid var(--hb-200)' }}
          >
            <div style={{ fontSize: '1.5rem' }}>🎭</div>
            <div>
              <div style={{ color: 'var(--hb)', fontWeight: 600 }}>מצב דמו</div>
              <div style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
                אתה רואה נתונים מדומים. 40 הזמנות ריאליסטיות למשך שנת 2026.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="mb-3 p-3 rounded-2"
            role="alert"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#dc2626',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <ReservationsStats stats={stats} />

        <ReservationsFilters
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
          canReset={hasActiveFilters(filters)}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          visibleCount={visibleReservations.length}
          totalCount={reservations.length}
        />

        <DataTable
          data={visibleReservations}
          columns={columns}
          keyField="id"
          emptyMessage="לא נמצאו הזמנות"
          onRowClick={handleRowClick}
          mobileTitle={(r) => (
            <span className="d-inline-flex align-items-center gap-2">
              {r.guestName || '—'}
              {isUnseenNew(r) && <NewReservationBadge />}
            </span>
          )}
          mobileSubtitle="id"
        />
      </div>
    </main>
  )
}
