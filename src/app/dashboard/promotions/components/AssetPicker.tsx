'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { fetchAssetOptions, saveAssetSelection } from '@/lib/promotions/client/api'
import type { MetaAssetOptions } from '@/lib/promotions/publishing/meta/oauth'

interface AssetPickerProps {
  initialCap: number | null
  onSaved: () => void | Promise<void>
}

export default function AssetPicker({ initialCap, onSaved }: AssetPickerProps) {
  const [options, setOptions] = useState<MetaAssetOptions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adAccountId, setAdAccountId] = useState('')
  const [pageId, setPageId] = useState('')
  const [useInstagram, setUseInstagram] = useState(true)
  const [cap, setCap] = useState(initialCap ? String(initialCap) : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchAssetOptions()
      .then((loaded) => {
        if (!active) return
        setOptions(loaded)
        setAdAccountId(loaded.adAccounts.find((account) => account.active)?.id ?? '')
        setPageId(loaded.pages[0]?.id ?? '')
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : 'טעינה נכשלה'))
    return () => {
      active = false
    }
  }, [])

  const selectedPage = options?.pages.find((page) => page.id === pageId)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAssetSelection({
        adAccountId,
        pageId,
        useInstagram,
        monthlyBudgetCap: cap ? Number(cap) : null,
      })
      toast.success('חשבון הפרסום מוכן')
      await onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="promotions-notice">{error}</div>
  if (!options) return <p className="promotions-muted">טוען חשבונות מ-Meta…</p>
  if (options.adAccounts.length === 0 || options.pages.length === 0) {
    return (
      <div className="promotions-notice">
        לא נמצאו חשבון מודעות ועמוד עסקי בחשבון ה-Meta שחובר. צרו אותם ב-Meta Business ואז חברו מחדש.
      </div>
    )
  }

  return (
    <div data-testid="promotions-asset-picker">
      <div className="promotions-grid">
        <label className="promotions-field">
          חשבון מודעות
          <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}>
            {options.adAccounts.map((account) => (
              <option key={account.id} value={account.id} disabled={!account.active}>
                {account.name} {account.currency ? `(${account.currency})` : ''} {account.active ? '' : '– לא פעיל'}
              </option>
            ))}
          </select>
        </label>
        <label className="promotions-field">
          עמוד פייסבוק
          <select value={pageId} onChange={(e) => setPageId(e.target.value)}>
            {options.pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </label>
        <label className="promotions-field">
          תקרת תקציב חודשית (₪, לא חובה)
          <input type="number" min={1} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
        </label>
      </div>

      <label className="d-flex align-items-center gap-2 mt-3" style={{ fontSize: 14 }}>
        <input
          type="checkbox"
          checked={useInstagram && Boolean(selectedPage?.instagram)}
          disabled={!selectedPage?.instagram}
          onChange={(e) => setUseInstagram(e.target.checked)}
        />
        {selectedPage?.instagram
          ? `לפרסם גם באינסטגרם${selectedPage.instagram.username ? ` (@${selectedPage.instagram.username})` : ''}`
          : 'לעמוד הזה אין חשבון אינסטגרם עסקי מחובר'}
      </label>

      <div className="promotions-actions">
        <Button variant="primary" loading={saving} disabled={!adAccountId || !pageId} onClick={handleSave}>
          שמירה
        </Button>
      </div>
    </div>
  )
}
