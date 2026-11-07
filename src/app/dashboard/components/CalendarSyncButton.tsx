'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { formatSyncSuccess, syncCalendarCache } from '@/lib/dashboard/syncCalendar'

interface CalendarSyncButtonProps {
  /** החדר שמוצג ביומן. בלי ערך, מסונכרנים כל החדרים של המשתמש. */
  roomId?: string
  /** נטען מחדש ביומן אחרי סנכרון מוצלח. */
  onSynced?: () => Promise<void> | void
  disabled?: boolean
}

export function CalendarSyncButton({ roomId, onSynced, disabled = false }: CalendarSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncCalendarCache(roomId)
      await onSynced?.()
      toast.success(formatSyncSuccess(result))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'הסנכרון מול Beds24 נכשל')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      iconOnly
      iconStart={<RefreshCw size={16} style={{ display: 'block' }} />}
      loading={syncing}
      disabled={disabled}
      onClick={handleSync}
      title="סנכרון היומן מול Beds24: קורא מחדש מחירים וחסימות ומעדכן את היומן"
      aria-label="סנכרון היומן מול Beds24"
      data-testid="calendar-sync-button"
    />
  )
}
