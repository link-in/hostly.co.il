import { z } from 'zod'
import { readApiError } from '@/lib/dashboard/apiError'

const syncResponseSchema = z.object({
  success: z.boolean(),
  totalDays: z.number(),
  refreshedAt: z.string(),
  rooms: z.array(z.object({ roomId: z.string(), upserted: z.number(), error: z.string().optional() })),
})

export type SyncCalendarResult = z.infer<typeof syncResponseSchema>

const SYNC_FAILED_MESSAGE = 'הסנכרון מול Beds24 נכשל'

/** מרענן את ה-cache מול Beds24. בלי roomId מרענן את כל החדרים של המשתמש. */
export async function syncCalendarCache(roomId?: string): Promise<SyncCalendarResult> {
  const response = await fetch('/api/dashboard/cache/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(roomId ? { roomId } : {}),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response, SYNC_FAILED_MESSAGE))
  }

  const parsed = syncResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error(SYNC_FAILED_MESSAGE)
  }
  if (!parsed.data.success) {
    const failed = parsed.data.rooms.filter((r) => r.error).map((r) => r.roomId)
    throw new Error(`${SYNC_FAILED_MESSAGE} (חדר ${failed.join(', ')})`)
  }
  return parsed.data
}

export function formatSyncSuccess(result: SyncCalendarResult): string {
  return `היומן סונכרן מול Beds24 (${result.totalDays.toLocaleString('he-IL')} ימים עודכנו)`
}
