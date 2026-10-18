'use client'

import { useCallback, useEffect, useState } from 'react'

export type ReceiptProvider = 'icount' | 'mock'

const toProvider = (value: unknown): ReceiptProvider => (value === 'mock' ? 'mock' : 'icount')

export function useReceiptSettings(enabled: boolean) {
  const [provider, setProvider] = useState<ReceiptProvider>('icount')
  const [apiToken, setApiToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)
  const [defaultVatId, setDefaultVatId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applyServerData = useCallback((data: Record<string, unknown>) => {
    setProvider(toProvider(data.provider))
    setHasToken(Boolean(data.hasApiToken))
    setTokenPreview((data.apiTokenPreview as string | null | undefined) ?? null)
    setDefaultVatId((data.defaultVatId as string | undefined) || '')
    setIsActive(data.isActive !== false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    fetch('/api/dashboard/receipts/settings')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'שגיאה בטעינת הגדרות קבלות')
        applyServerData(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [enabled, applyServerData])

  const submit = useCallback(
    async (test: boolean) => {
      setMessage(null)
      setError(null)
      if (test) setTesting(true)
      else setSaving(true)

      try {
        const res = await fetch('/api/dashboard/receipts/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            apiToken: apiToken.trim() || undefined,
            keepExistingToken: true,
            defaultVatId: defaultVatId.trim() || null,
            isActive,
            test,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'שמירה נכשלה')

        applyServerData(data)
        setApiToken('')

        if (!test) {
          setMessage('הגדרות הקבלות נשמרו')
        } else if (data.testResult?.ok) {
          setMessage('החיבור ל-iCount תקין')
        } else {
          throw new Error(data.testResult?.error || 'בדיקת חיבור נכשלה')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
        setTesting(false)
      }
    },
    [provider, apiToken, defaultVatId, isActive, applyServerData],
  )

  return {
    provider, setProvider,
    apiToken, setApiToken,
    hasToken, tokenPreview,
    defaultVatId, setDefaultVatId,
    isActive, setIsActive,
    loading, saving, testing, message, error,
    save: () => submit(false),
    testConnection: () => submit(true),
  }
}
