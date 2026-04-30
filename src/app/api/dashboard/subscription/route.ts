import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getActiveSubscription, getDaysRemaining } from '@/lib/auth/subscriptionDb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getActiveSubscription(session.user.id)

    if (!sub) {
      return NextResponse.json({
        status: 'expired',
        planId: null,
        daysRemaining: 0,
        expiresAt: null,
      })
    }

    const daysRemaining = getDaysRemaining(sub.expires_at)

    return NextResponse.json({
      status: sub.status,
      planId: sub.plan_id,
      daysRemaining,
      expiresAt: sub.expires_at,
      billingCycle: sub.billing_cycle,
      autoRenew: sub.auto_renew,
    })
  } catch (error) {
    console.error('Error in GET /api/dashboard/subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
