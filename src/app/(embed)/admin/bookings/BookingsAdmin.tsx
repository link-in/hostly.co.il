'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  room_id: string
  check_in: string
  check_out: string
  guest_first: string
  guest_last: string
  guest_email: string
  guest_phone: string
  num_adult: number
  num_child: number
  notes: string
  total_amount: string | null
  payment_status: string
  payment_provider: string | null
  beds24_booking_id: string | null
  created_at: string
}

interface ApiResponse {
  bookings: Booking[]
  total: number
  page: number
  pages: number
}

interface Filters {
  search: string
  status: string
  from: string
  to: string
  page: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: '',          label: 'כל הסטטוסים' },
  { value: 'paid',      label: 'שולם' },
  { value: 'mock_paid', label: 'Mock שולם' },
  { value: 'free',      label: 'ללא תשלום' },
  { value: 'pending',   label: 'ממתין' },
  { value: 'failed',    label: 'נכשל' },
  { value: 'cancelled', label: 'בוטל' },
]

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  paid:      { bg: '#d4edda', color: '#1a7a3a' },
  mock_paid: { bg: '#d1ecf1', color: '#0c5460' },
  free:      { bg: '#e2e3e5', color: '#383d41' },
  pending:   { bg: '#fff3cd', color: '#856404' },
  failed:    { bg: '#f8d7da', color: '#842029' },
  cancelled: { bg: '#f8d7da', color: '#842029' },
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'שולם', mock_paid: 'Mock', free: 'חינם',
  pending: 'ממתין', failed: 'נכשל', cancelled: 'בוטל',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingsAdmin({ wpUrl, apiKey }: { wpUrl: string; apiKey: string }) {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<keyof Booking>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filters, setFilters] = useState<Filters>({
    search: '', status: '', from: '', to: '', page: 1,
  })

  /**
   * Builds the correct fetch URL whether wpUrl uses pretty permalinks
   * (/wp-json/hostly/v1) or the legacy rest_route query-param format
   * (index.php?rest_route=/hostly/v1).
   */
  const buildUrl = (base: string, path: string, params: URLSearchParams): string => {
    if (base.includes('rest_route=')) {
      const url = new URL(base)
      const route = url.searchParams.get('rest_route') ?? ''
      url.searchParams.set('rest_route', route + path)
      params.forEach((v, k) => url.searchParams.set(k, v))
      return url.toString()
    }
    return `${base}${path}?${params}`
  }

  const fetchBookings = useCallback(async (f: Filters) => {
    if (!wpUrl || !apiKey) { setError('חסר wpUrl או apiKey'); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(f.page) })
      if (f.search) params.set('search', f.search)
      if (f.status) params.set('status', f.status)
      if (f.from)   params.set('from', f.from)
      if (f.to)     params.set('to', f.to)

      const res = await fetch(buildUrl(wpUrl, '/bookings', params), {
        headers: { 'x-api-key': apiKey },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }, [wpUrl, apiKey])

  useEffect(() => { fetchBookings(filters) }, [])

  const applyFilters = (next: Filters) => {
    setFilters(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchBookings(next), 400)
  }

  const setPage = (p: number) => applyFilters({ ...filters, page: p })

  const toggleSort = (col: keyof Booking) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...(data?.bookings ?? [])].sort((a, b) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
    const cmp = String(av).localeCompare(String(bv), 'he', { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const nights = (ci: string, co: string) => {
    const diff = new Date(co).getTime() - new Date(ci).getTime()
    return Math.round(diff / 86400000)
  }

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  const fmtDateTime = (d: string) =>
    d ? new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', direction: 'rtl', background: '#f6f7f7', minHeight: '100vh', padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1d2327' }}>הזמנות</h1>
          {data && (
            <span style={{ background: '#2271b1', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '2px 10px' }}>
              {data.total}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchBookings(filters)}
          style={{ background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#1d2327' }}
        >
          ↻ רענן
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #c3c4c7', borderRadius: 6, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#50575e', textTransform: 'uppercase', letterSpacing: '.04em' }}>חיפוש אורח</span>
          <input
            type="search"
            placeholder="שם / אימייל..."
            value={filters.search}
            onChange={e => applyFilters({ ...filters, search: e.target.value, page: 1 })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 160px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#50575e', textTransform: 'uppercase', letterSpacing: '.04em' }}>סטטוס</span>
          <select
            value={filters.status}
            onChange={e => applyFilters({ ...filters, status: e.target.value, page: 1 })}
            style={inputStyle}
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 140px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#50575e', textTransform: 'uppercase', letterSpacing: '.04em' }}>מתאריך כניסה</span>
          <input
            type="date"
            value={filters.from}
            onChange={e => applyFilters({ ...filters, from: e.target.value, page: 1 })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 140px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#50575e', textTransform: 'uppercase', letterSpacing: '.04em' }}>עד תאריך כניסה</span>
          <input
            type="date"
            value={filters.to}
            onChange={e => applyFilters({ ...filters, to: e.target.value, page: 1 })}
            style={inputStyle}
          />
        </label>

        {(filters.search || filters.status || filters.from || filters.to) && (
          <button
            onClick={() => applyFilters({ search: '', status: '', from: '', to: '', page: 1 })}
            style={{ alignSelf: 'flex-end', background: 'none', border: '1px solid #c3c4c7', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#d63638' }}
          >
            ✕ נקה פילטרים
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#f8d7da', color: '#842029', border: '1px solid #f5c6cb', borderRadius: 4, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          שגיאה: {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #c3c4c7', borderRadius: 6, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8c8f94', fontSize: 14 }}>
            <div style={{ width: 24, height: 24, border: '2px solid #c3c4c7', borderTopColor: '#2271b1', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8c8f94', fontSize: 14 }}>
            לא נמצאו הזמנות התואמות את הפילטרים
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f6f7f7', borderBottom: '1px solid #c3c4c7' }}>
                {([
                  ['guest_first', 'אורח'],
                  ['check_in',    'כניסה'],
                  ['check_out',   'יציאה'],
                  ['num_adult',   'לילות / אורחים'],
                  ['total_amount','סכום'],
                  ['payment_status','סטטוס'],
                  ['beds24_booking_id','Beds24'],
                  ['created_at',  'נוצר'],
                ] as [keyof Booking, string][]).map(([col, label]) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                  >
                    {label}
                    {sortCol === col && (
                      <span style={{ marginRight: 4, opacity: .6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, i) => {
                const st = STATUS_STYLES[b.payment_status] ?? { bg: '#e2e3e5', color: '#383d41' }
                const n  = nights(b.check_in, b.check_out)
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f1' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{b.guest_first} {b.guest_last}</div>
                      <div style={subStyle}>{b.guest_email}</div>
                      <div style={subStyle}>{b.guest_phone}</div>
                      {b.notes && <div style={{ ...subStyle, marginTop: 2, fontStyle: 'italic' }}>"{b.notes}"</div>}
                    </td>
                    <td style={tdStyle}>{fmtDate(b.check_in)}</td>
                    <td style={tdStyle}>{fmtDate(b.check_out)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{n} לילות</span>
                      <div style={subStyle}>{b.num_adult} מב׳{b.num_child > 0 ? ` + ${b.num_child} ילד׳` : ''}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {b.total_amount ? `₪${Number(b.total_amount).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...st, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[b.payment_status] ?? b.payment_status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {b.beds24_booking_id
                        ? <code style={{ background: '#f0f0f1', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{b.beds24_booking_id}</code>
                        : <span style={subStyle}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, ...subStyle }}>{fmtDateTime(b.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 32, height: 32, borderRadius: 4, border: '1px solid',
                borderColor: p === data.page ? '#2271b1' : '#c3c4c7',
                background: p === data.page ? '#2271b1' : '#fff',
                color: p === data.page ? '#fff' : '#1d2327',
                fontWeight: p === data.page ? 700 : 400,
                cursor: 'pointer', fontSize: 13,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: '1px solid #c3c4c7', borderRadius: 4, padding: '6px 10px',
  fontSize: 13, color: '#1d2327', background: '#fff', width: '100%', boxSizing: 'border-box',
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'right', fontWeight: 600,
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#50575e',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'top',
}

const subStyle: React.CSSProperties = {
  fontSize: 11, color: '#8c8f94',
}
