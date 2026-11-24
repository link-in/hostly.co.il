'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import {
  disconnect,
  fetchConnection,
  META_CONNECT_URL,
  type ConnectionState,
} from '@/lib/promotions/client/api'
import { CONNECTION_STATUS_LABELS, formatMoney } from '@/lib/promotions/client/labels'
import AssetPicker from './AssetPicker'

interface ConnectionSectionProps {
  disabled: boolean
}

function ConnectedSummary({ state }: { state: ConnectionState }) {
  const assets = state.connection?.assets as Record<string, string | undefined>
  return (
    <div className="promotions-list" data-testid="promotions-connection-summary">
      <div className="promotions-muted">עמוד: {assets.pageName ?? assets.pageId}</div>
      <div className="promotions-muted">
        אינסטגרם: {assets.instagramUsername ? `@${assets.instagramUsername}` : assets.instagramUserId ? 'מחובר' : 'לא מחובר'}
      </div>
      <div className="promotions-muted">חשבון מודעות: {assets.adAccountId}</div>
      <div className="promotions-muted">
        תקרה חודשית:{' '}
        {state.connection?.monthlyBudgetCap ? formatMoney(state.connection.monthlyBudgetCap) : 'ללא תקרה'}
      </div>
    </div>
  )
}

export default function ConnectionSection({ disabled }: ConnectionSectionProps) {
  const [state, setState] = useState<ConnectionState | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    try {
      setState(await fetchConnection())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'טעינת החיבור נכשלה')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDisconnect = async () => {
    if (!confirm('לנתק את חשבון הפרסום? קמפיינים חדשים לא יוכנו עד שתתחברו מחדש.')) return
    try {
      await disconnect()
      setEditing(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ניתוק נכשל')
    }
  }

  const status = state?.connection?.status
  const canConnect = !disabled && state?.configured
  const needsOAuth = !status || status === 'revoked' || status === 'expired'
  const showPicker = !needsOAuth && (status === 'pending_setup' || editing)

  return (
    <section className="promotions-section" aria-labelledby="promotions-connection-title">
      <h2 id="promotions-connection-title" className="promotions-section-title">
        <Link2 size={18} /> חיבור לפייסבוק ואינסטגרם
      </h2>
      <p className="promotions-section-subtitle">
        הקמפיינים עולים מחשבון המודעות שלך ב-Meta, והתשלום על המודעות נגבה ישירות ממנו.
      </p>

      {state && !state.configured && !disabled && (
        <div className="promotions-notice">החיבור ל-Meta עדיין לא הוגדר במערכת. פנו לתמיכה.</div>
      )}

      {status && (
        <p className="mb-3" data-testid="promotions-connection-status">
          סטטוס: <strong>{CONNECTION_STATUS_LABELS[status]}</strong>
        </p>
      )}

      {needsOAuth && (
        <a
          href={canConnect ? META_CONNECT_URL : undefined}
          aria-disabled={!canConnect}
          className="hostly-btn hostly-btn-md hostly-btn-primary"
          style={canConnect ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
          data-testid="promotions-connect-meta"
        >
          {status ? 'חיבור מחדש ל-Meta' : 'חיבור חשבון Meta'}
        </a>
      )}

      {status === 'active' && !editing && state && <ConnectedSummary state={state} />}

      {showPicker && (
        <AssetPicker
          initialCap={state?.connection?.monthlyBudgetCap ?? null}
          onSaved={async () => {
            setEditing(false)
            await load()
          }}
        />
      )}

      {!needsOAuth && !disabled && (
        <div className="promotions-actions">
          {status === 'active' && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              שינוי חשבון או תקרה
            </Button>
          )}
          <Button variant="ghost" size="sm" iconStart={<Unlink size={14} />} onClick={handleDisconnect}>
            ניתוק
          </Button>
        </div>
      )}
    </section>
  )
}
