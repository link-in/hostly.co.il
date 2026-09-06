/**
 * GET  /api/dashboard/beds24/status
 *   → { suspended: boolean, errorMsg?: string, suspendedAt?: string }
 *
 * DELETE /api/dashboard/beds24/status
 *   → clears the suspension flag (user has recharged credits)
 *   → { success: true }
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  getBeds24SuspensionStatus,
  clearBeds24Suspension,
} from '@/lib/beds24/creditGuard'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getBeds24SuspensionStatus(session.user.id)
  return NextResponse.json(status)
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await clearBeds24Suspension(session.user.id)
  return NextResponse.json({ success: true })
}
