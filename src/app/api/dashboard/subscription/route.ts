import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getActiveSubscription, getDaysRemaining, cancelSubscription } from '@/lib/auth/subscriptionDb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admins and demo users are always considered active — no subscription restrictions
    if (session.user.role === 'admin' || session.user.isDemo) {
      return NextResponse.json({
        status: 'active',
        planId: 'admin',
        daysRemaining: 9999,
        expiresAt: null,
      })
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

    // Treat any subscription whose expiry has passed as expired — regardless of DB status
    const effectiveStatus =
      sub.expires_at && daysRemaining <= 0 && sub.status !== 'active'
        ? 'expired'
        : sub.status

    return NextResponse.json({
      status: effectiveStatus,
      planId: sub.plan_id,
      daysRemaining,
      expiresAt: sub.expires_at,
      billingCycle: sub.billing_cycle,
      autoRenew: sub.auto_renew,
      wasActive: sub.status === 'active' || sub.billing_cycle != null,
    })
  } catch (error) {
    console.error('Error in GET /api/dashboard/subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot modify their own subscription' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'cancel') {
      const sub = await getActiveSubscription(session.user.id)

      if (!sub || sub.status !== 'active') {
        return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 })
      }

      const ok = await cancelSubscription(session.user.id)

      if (!ok) {
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'המנוי בוטל בהצלחה' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error in PATCH /api/dashboard/subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
