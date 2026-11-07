import { refreshRoomCache } from '@/lib/availability/cache'

export interface RoomRefreshResult {
  roomId: string
  upserted: number
  error?: string
}

export interface RefreshRoomsInput {
  userId: string
  propertyId: string
  roomIds: string[]
  accessToken: string
  refreshToken: string
}

/**
 * מרענן את ה-cache של כל חדר ברשימה, אחד אחרי השני (כדי לא להציף את ה-API של Beds24).
 * כשל בחדר אחד לא עוצר את שאר החדרים.
 */
export async function refreshRooms(input: RefreshRoomsInput): Promise<RoomRefreshResult[]> {
  const results: RoomRefreshResult[] = []
  for (const roomId of input.roomIds) {
    const { upserted, error } = await refreshRoomCache(
      input.userId,
      input.propertyId,
      roomId,
      input.accessToken,
      input.refreshToken,
    )
    results.push({ roomId, upserted, ...(error ? { error } : {}) })
  }
  return results
}

export interface RefreshSummary {
  success: boolean
  /** כל החדרים נכשלו. */
  allFailed: boolean
  totalDays: number
  failedRoomIds: string[]
}

export function summarizeRefresh(results: RoomRefreshResult[]): RefreshSummary {
  const failed = results.filter((r) => r.error)
  return {
    success: failed.length === 0,
    allFailed: results.length > 0 && failed.length === results.length,
    totalDays: results.reduce((sum, r) => sum + r.upserted, 0),
    failedRoomIds: failed.map((r) => r.roomId),
  }
}
