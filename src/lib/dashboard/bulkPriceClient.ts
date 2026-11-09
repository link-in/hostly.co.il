import { readApiError } from '@/lib/dashboard/apiError'
import type { BulkCalendarEntry } from '@/lib/dashboard/bulkPrice'

const UPDATE_FAILED_MESSAGE = 'עדכון המחירים נכשל'

/** שולח את עדכוני המחיר ל-Beds24. לא נוגע בזמינות, כך שחסימות והזמנות נשארות. */
export async function submitBulkPrices(roomId: string | undefined, calendar: BulkCalendarEntry[]): Promise<void> {
  const payload = [{ ...(roomId ? { roomId: Number(roomId) } : {}), calendar }]

  const response = await fetch('/api/dashboard/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await readApiError(response, UPDATE_FAILED_MESSAGE))
  }

  const result: unknown = await response.json()
  if (result && typeof result === 'object' && (result as { success?: boolean }).success === false) {
    throw new Error((result as { error?: string }).error ?? UPDATE_FAILED_MESSAGE)
  }

  refreshCacheInBackground(roomId)
}

/** מרענן את ה-cache ברקע כדי שגם אתר ההזמנות יראה את המחירים החדשים. */
function refreshCacheInBackground(roomId: string | undefined): void {
  if (!roomId) return
  fetch('/api/dashboard/cache/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomId }),
  }).catch(() => {})
}
