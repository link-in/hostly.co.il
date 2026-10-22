/**
 * The ONLY code path that writes assistant changes to Beds24.
 *
 * Runs on an explicit human confirmation (web button / WhatsApp reply button),
 * never on model output. Everything is re-checked at execution time — the user
 * may have lost access to the room, or the dates may have passed, since the
 * proposal was made. Messages are user-facing Hebrew: they are shown as-is,
 * without going back through the model.
 */
import { writeCacheAvailability } from '@/lib/availability/blocking'
import { blockRoomDates, updateRoomPrice } from '../beds24/calendarClient'
import type { Beds24Result, RoomTarget } from '../beds24/types'
import { loadAssistantContext } from '../context'
import { todayInIsrael } from '../dates'
import { resolveSingleRoom } from '../tools/propertyScope'
import { claimPendingAction, closePendingAction, finishPendingAction, getPendingAction } from './pendingActions'
import { proposedActionSchema, type PendingActionRow, type ProposedAction } from './types'

export type ExecutionErrorCode =
  | 'not_found'
  | 'already_resolved'
  | 'expired'
  | 'invalid_payload'
  | 'account_unavailable'
  | 'room_not_owned'
  | 'past_date'
  | 'beds24_failed'

export type ExecutionOutcome =
  | { ok: true; status: 'executed' | 'rejected'; action?: ProposedAction; message: string }
  | { ok: false; code: ExecutionErrorCode; message: string }

export interface ExecuteDeps {
  claimPendingAction: typeof claimPendingAction
  getPendingAction: typeof getPendingAction
  closePendingAction: typeof closePendingAction
  finishPendingAction: typeof finishPendingAction
  loadAssistantContext: typeof loadAssistantContext
  blockRoomDates: typeof blockRoomDates
  updateRoomPrice: typeof updateRoomPrice
  writeCacheAvailability: typeof writeCacheAvailability
  now: () => Date
}

const defaultDeps: ExecuteDeps = {
  claimPendingAction,
  getPendingAction,
  closePendingAction,
  finishPendingAction,
  loadAssistantContext,
  blockRoomDates,
  updateRoomPrice,
  writeCacheAvailability,
  now: () => new Date(),
}

const MESSAGES = {
  not_found: 'הפעולה לא נמצאה.',
  already_resolved: 'הפעולה הזו כבר טופלה.',
  expired: 'פג תוקף האישור. בקש מהעוזר להכין את השינוי מחדש.',
  invalid_payload: 'הפעולה פגומה ולא בוצעה.',
  account_unavailable: 'החשבון אינו זמין כרגע לשינויים. השינוי לא בוצע.',
  room_not_owned: 'החדר כבר אינו משויך לחשבון שלך. השינוי לא בוצע.',
  past_date: 'התאריכים כבר עברו. השינוי לא בוצע.',
  beds24_failed: 'מערכת ניהול הנכסים דחתה את השינוי. לוח השנה לא השתנה.',
  rejected: 'השינוי בוטל.',
  block_dates: 'התאריכים נחסמו. הערוצים המחוברים יתעדכנו אוטומטית.',
  update_price: 'המחיר עודכן. הערוצים המחוברים יתעדכנו אוטומטית.',
} as const

function failure(code: ExecutionErrorCode): ExecutionOutcome {
  return { ok: false, code, message: MESSAGES[code] }
}

/** Why a confirmation could not claim the action. Marks stale pending actions as expired. */
async function explainUnavailable(userId: string, actionId: string, deps: ExecuteDeps): Promise<ExecutionOutcome> {
  const row = await deps.getPendingAction(userId, actionId)
  if (!row) return failure('not_found')
  if (row.status !== 'pending') return failure('already_resolved')
  await deps.closePendingAction(userId, actionId, 'expired', deps.now())
  return failure('expired')
}

async function finishSafely(deps: ExecuteDeps, actionId: string, status: 'executed' | 'failed', result: unknown) {
  try {
    await deps.finishPendingAction(actionId, status, result, deps.now())
  } catch (err) {
    console.error('[ai-assistant] Failed to record action outcome', { actionId, status, err })
  }
}

async function revalidate(row: PendingActionRow, action: ProposedAction, deps: ExecuteDeps): Promise<RoomTarget | ExecutionErrorCode> {
  if (action.payload.from < todayInIsrael(deps.now())) return 'past_date'

  const context = await deps.loadAssistantContext(row.user_id, row.channel)
  if (!context.ok) return 'account_unavailable'

  const scope = resolveSingleRoom(context.context, { propertyId: action.payload.propertyId, roomId: action.payload.roomId })
  return scope.ok ? scope.value.target : 'room_not_owned'
}

async function runAction(target: RoomTarget, action: ProposedAction, deps: ExecuteDeps): Promise<Beds24Result<unknown>> {
  const range = { from: action.payload.from, to: action.payload.to }

  if (action.actionType === 'update_price') {
    return deps.updateRoomPrice(target, range, action.payload.newPrice)
  }

  const result = await deps.blockRoomDates(target, range)
  if (result.ok) {
    await deps.writeCacheAvailability(result.data, target.userId, String(target.roomId), String(target.propertyId))
  }
  return result
}

export async function confirmPendingAction(
  userId: string,
  actionId: string,
  deps: ExecuteDeps = defaultDeps,
): Promise<ExecutionOutcome> {
  const row = await deps.claimPendingAction(userId, actionId, deps.now())
  if (!row) return explainUnavailable(userId, actionId, deps)

  const parsed = proposedActionSchema.safeParse({ actionType: row.action_type, payload: row.payload })
  if (!parsed.success) {
    await finishSafely(deps, actionId, 'failed', { code: 'invalid_payload' })
    return failure('invalid_payload')
  }
  const action = parsed.data

  const target = await revalidate(row, action, deps)
  if (typeof target === 'string') {
    await finishSafely(deps, actionId, 'failed', { code: target })
    return failure(target)
  }

  const result = await runAction(target, action, deps)
  if (!result.ok) {
    await finishSafely(deps, actionId, 'failed', { code: 'beds24_failed', error: result.error })
    return failure('beds24_failed')
  }

  await finishSafely(deps, actionId, 'executed', { beds24: result.data })
  return { ok: true, status: 'executed', action, message: MESSAGES[action.actionType] }
}

export async function rejectPendingAction(
  userId: string,
  actionId: string,
  deps: ExecuteDeps = defaultDeps,
): Promise<ExecutionOutcome> {
  const closed = await deps.closePendingAction(userId, actionId, 'rejected', deps.now())
  if (closed) return { ok: true, status: 'rejected', message: MESSAGES.rejected }

  const row = await deps.getPendingAction(userId, actionId)
  return failure(row ? 'already_resolved' : 'not_found')
}
