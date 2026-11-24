import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import type { ActionErrorCode, ActionResult } from '../pipeline/campaignActions'

export interface HostSession {
  userId: string
  isDemo: boolean
}

export async function getHostSession(): Promise<HostSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return { userId: session.user.id, isDemo: Boolean(session.user.isDemo) }
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function demoForbidden(): NextResponse {
  return NextResponse.json({ error: 'לא זמין בחשבון הדגמה' }, { status: 403 })
}

export function serverError(scope: string, err: unknown): NextResponse {
  console.error(`[Promotions] ${scope}:`, err)
  return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
}

const ACTION_STATUS: Record<ActionErrorCode, number> = {
  not_found: 404,
  invalid_state: 409,
  too_late: 409,
  no_connection: 412,
  monthly_cap_exceeded: 422,
  launch_failed: 502,
  stop_failed: 502,
}

export function actionResponse(result: ActionResult): NextResponse {
  if (result.ok) return NextResponse.json({ campaign: result.campaign })
  return NextResponse.json({ error: result.message, code: result.code }, { status: ACTION_STATUS[result.code] })
}
