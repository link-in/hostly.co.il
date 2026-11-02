/**
 * Reconcile Hostly manual blocks with Beds24.
 *
 * Every future date the owner blocked from the dashboard (is_manual_block in
 * availability_cache) must be closed in Beds24, otherwise Airbnb / Booking.com
 * keep selling it. This job finds blocks Beds24 still reports as bookable,
 * re-pushes the blackout, verifies it, and tells the owner what happened.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildOwnerPhoneList, sendWhatsAppToAll } from '@/lib/notifications/ownerPhones'
import {
  fetchBeds24OpenState,
  findStillOpenDates,
  formatShortDate,
  pushBlackout,
  verifyDatesBlocked,
  type Beds24RoomRef,
} from '@/lib/availability/sync'

export interface ManualBlockGroup {
  userId: string
  roomId: string
  propertyId?: string
  dates: string[]
}

export interface ReconcileResult {
  userId: string
  roomId: string
  checked: number
  drifted: string[]
  repaired: string[]
  stillOpen: string[]
  error?: string
}

interface ManualBlockRow {
  user_id: string
  room_id: string
  property_id?: string | null
  date: string
}

/** Group cache rows into one entry per (user, room), with sorted unique dates. */
export function groupManualBlocks(rows: ManualBlockRow[]): ManualBlockGroup[] {
  const groups = new Map<string, ManualBlockGroup>()
  for (const row of rows) {
    const key = `${row.user_id}:${row.room_id}`
    const group = groups.get(key) ?? {
      userId: row.user_id,
      roomId: String(row.room_id),
      propertyId: row.property_id ? String(row.property_id) : undefined,
      dates: [],
    }
    group.dates.push(row.date)
    groups.set(key, group)
  }
  return Array.from(groups.values()).map((group) => ({ ...group, dates: Array.from(new Set(group.dates)).sort() }))
}

/** All manual blocks from `fromDate` (inclusive) to `toDate` (inclusive). */
export async function listManualBlocks(fromDate: string, toDate: string): Promise<ManualBlockGroup[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('availability_cache')
    .select('user_id, room_id, property_id, date')
    .eq('is_manual_block', true)
    .gte('date', fromDate)
    .lte('date', toDate)

  if (error) {
    console.error('[BlockReconcile] failed to list manual blocks:', error)
    return []
  }
  return groupManualBlocks((data ?? []) as ManualBlockRow[])
}

export function buildBlockDriftMessage(repaired: string[], stillOpen: string[]): string {
  const lines = ['⚠️ Hostly — בדיקת סנכרון חסימות', '']
  if (repaired.length) {
    lines.push('תאריכים שחסמת היו פתוחים בערוצים ונסגרו מחדש:')
    lines.push(repaired.map(formatShortDate).join(', '))
    lines.push('')
  }
  if (stillOpen.length) {
    lines.push('תאריכים שחסמת עדיין פתוחים להזמנה ולא הצלחנו לסגור:')
    lines.push(stillOpen.map(formatShortDate).join(', '))
    lines.push('מומלץ לסגור אותם ידנית ב-Airbnb וב-Booking.com.')
    lines.push('')
  }
  lines.push('אם פתחת אותם בכוונה, שחרר את החסימה מלוח השנה ב-Hostly.')
  return lines.join('\n')
}

async function getOwnerPhones(userId: string): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('users')
      .select('phone_number, secondary_phone_number')
      .eq('id', userId)
      .maybeSingle()
    const row = data as { phone_number?: string | null; secondary_phone_number?: string | null } | null
    return buildOwnerPhoneList(row?.phone_number, row?.secondary_phone_number)
  } catch (err) {
    console.error('[BlockReconcile] owner phone lookup failed:', err)
    return []
  }
}

async function notifyOwner(userId: string, repaired: string[], stillOpen: string[]): Promise<void> {
  const phones = await getOwnerPhones(userId)
  if (!phones.length) {
    console.warn(`[BlockReconcile] no owner phone for user ${userId} — drift not notified`)
    return
  }
  await sendWhatsAppToAll(phones, buildBlockDriftMessage(repaired, stillOpen), {
    userId,
    messageType: 'system_alert',
    recipientRole: 'owner',
  })
}

/** Check one room's manual blocks against Beds24 and repair any that are open. */
export async function reconcileRoomBlocks(group: ManualBlockGroup): Promise<ReconcileResult> {
  const ref: Beds24RoomRef = { userId: group.userId, roomId: group.roomId, propertyId: group.propertyId }
  const result: ReconcileResult = {
    userId: group.userId,
    roomId: group.roomId,
    checked: group.dates.length,
    drifted: [],
    repaired: [],
    stillOpen: [],
  }

  const state = await fetchBeds24OpenState(ref, group.dates)
  if (!state) return { ...result, error: 'beds24_unreachable' }

  const drifted = findStillOpenDates(group.dates, state)
  if (!drifted.length) return result

  const pushed = await pushBlackout(ref, drifted)
  const stillOpen = pushed ? (await verifyDatesBlocked(ref, drifted)) ?? drifted : drifted
  const repaired = drifted.filter((date) => !stillOpen.includes(date))

  await notifyOwner(group.userId, repaired, stillOpen)
  return { ...result, drifted, repaired, stillOpen, ...(pushed ? {} : { error: 'beds24_push_failed' }) }
}
