'use client'

import { useCallback, useState } from 'react'

export function useAirbnbConnect() {
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)

  const connect = useCallback(async () => {
    setError(null)
    setOpened(false)
    setLinking(true)
    try {
      const res = await fetch('/api/dashboard/beds24/airbnb-auth-url')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בקבלת קישור Airbnb')
      window.open(data.url, '_blank', 'noopener,noreferrer')
      setOpened(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setLinking(false)
    }
  }, [])

  return { linking, error, opened, connect }
}
