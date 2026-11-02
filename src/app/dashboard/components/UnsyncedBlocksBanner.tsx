'use client'

import { TriangleAlert, RefreshCw } from 'lucide-react'
import { formatShortDate } from '@/lib/dashboard/unsyncedBlocks'

interface UnsyncedBlocksBannerProps {
  dates: string[]
  onResync: () => void
  busy?: boolean
  disabled?: boolean
}

const UnsyncedBlocksBanner = ({ dates, onResync, busy = false, disabled = false }: UnsyncedBlocksBannerProps) => {
  if (!dates.length) return null

  return (
    <div
      role="alert"
      data-testid="unsynced-blocks-banner"
      className="d-flex align-items-start gap-2 mb-3"
      style={{
        background: '#FFF7ED',
        border: '1px solid rgba(234,88,12,0.35)',
        borderRadius: 8,
        padding: '10px 12px',
        color: '#9A3412',
      }}
    >
      <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div className="flex-fill" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600 }}>תאריכים שחסמת עדיין פתוחים להזמנה בערוצים</div>
        <div>{dates.map(formatShortDate).join(', ')}</div>
      </div>
      <button
        type="button"
        className="btn btn-sm d-flex align-items-center gap-1"
        style={{ background: '#EA580C', color: 'white', border: 'none', borderRadius: 6, whiteSpace: 'nowrap' }}
        onClick={onResync}
        disabled={busy || disabled}
      >
        <RefreshCw size={14} />
        <span>{busy ? 'סוגר...' : 'סגור שוב'}</span>
      </button>
    </div>
  )
}

export default UnsyncedBlocksBanner
