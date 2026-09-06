'use client'

/**
 * Beds24SuspendedBanner
 *
 * Displayed prominently when the user's Beds24 API credit is exhausted.
 * Blocks all mutation actions (the parent passes `onSuspendedChange` to
 * propagate the suspended flag up to DashboardClient).
 *
 * Behaviour:
 * - Polls `/api/dashboard/beds24/status` on mount.
 * - If suspended → shows a full-width blocking banner with a link to Beds24.
 * - "נסה שוב" button DELETEs the status flag and reloads.
 * - Calls `onSuspendedChange(true/false)` so parent can disable mutation buttons.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'

interface Props {
  /** Called whenever the suspension status changes so the parent can gate actions. */
  onSuspendedChange?: (suspended: boolean) => void
}

interface StatusResponse {
  suspended: boolean
  errorMsg?: string
  suspendedAt?: string
}

export default function Beds24SuspendedBanner({ onSuspendedChange }: Props) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [clearing, setClearing] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!session?.user) return
    // Skip for demo users — they don't have real Beds24 credentials
    if (session.user.isDemo) return

    try {
      const res = await fetch('/api/dashboard/beds24/status')
      if (!res.ok) return
      const data: StatusResponse = await res.json()
      setStatus(data)
      onSuspendedChange?.(data.suspended)
    } catch {
      // Network error — don't block the UI
    }
  }, [session, onSuspendedChange])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Not yet loaded or not suspended → render nothing
  if (!status?.suspended) return null

  const handleRetry = async () => {
    setClearing(true)
    try {
      await fetch('/api/dashboard/beds24/status', { method: 'DELETE' })
      setStatus({ suspended: false })
      onSuspendedChange?.(false)
      // Hard reload so all components re-fetch fresh data
      window.location.reload()
    } catch {
      setClearing(false)
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)',
        borderBottom: '2px solid #FCA5A5',
        padding: '0',
        zIndex: 200,
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #EF4444, #F97316)' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '16px 20px',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={22} strokeWidth={2} color="#DC2626" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 15,
              color: '#7F1D1D',
              lineHeight: 1.3,
            }}
          >
            ⚠️ הקרדיט ב-Beds24 אזל — פעולות מושבתות
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#B91C1C',
              lineHeight: 1.5,
            }}
          >
            הזמנות, עדכוני מחיר וחסימות לא יסונכרנו עם Beds24 עד לטעינת קרדיט.
            {status.errorMsg && (
              <span style={{ display: 'block', opacity: 0.75, fontSize: 12, marginTop: 2 }}>
                שגיאה: {status.errorMsg}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Link to Beds24 credits page */}
          <a
            href="https://beds24.com/control3.php?pagetype=account"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#EF4444',
              color: '#fff',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            טען קרדיט ב-Beds24
            <ExternalLink size={13} strokeWidth={2} />
          </a>

          {/* Retry / clear suspension */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={clearing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              color: '#7F1D1D',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid #FCA5A5',
              cursor: clearing ? 'not-allowed' : 'pointer',
              opacity: clearing ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={13} strokeWidth={2} style={{ animation: clearing ? 'spin 1s linear infinite' : 'none' }} />
            {clearing ? 'מתרענן...' : 'נסה שוב'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
