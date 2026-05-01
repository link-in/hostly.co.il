import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/users/[id]/subscription
 * Manually manage a user's subscription (admin only).
 * Body: { status, planId, expiresAt, extendDays }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: userId } = await params
    const body = await request.json()
    const { status, planId, expiresAt, extendDays } = body

    const supabase = createServiceRoleClient()

    // Find existing subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const updates: Record<string, unknown> = {}

    if (status) updates.status = status

    // Only update plan / billing_cycle when NOT cancelling
    if (status !== 'cancelled') {
      if (planId !== undefined) updates.plan_id = planId || null
      if (planId === 'monthly' || planId === 'annual') {
        updates.billing_cycle = planId
      }
    }

    // Calculate new expiry
    if (expiresAt) {
      updates.expires_at = new Date(expiresAt).toISOString()
    } else if (extendDays) {
      const base = existing?.expires_at
        ? new Date(existing.expires_at)
        : new Date()
      // If already expired, extend from today
      if (base < new Date()) base.setTime(Date.now())
      base.setDate(base.getDate() + Number(extendDays))
      updates.expires_at = base.toISOString()
    }

    // If activating, set auto_renew
    if (status === 'active') updates.auto_renew = true
    if (status === 'cancelled') {
      updates.auto_renew = false
      updates.cancelled_at = new Date().toISOString()
      // Immediate cancellation: revoke access now unless admin set a specific future date
      if (!expiresAt && !extendDays) {
        updates.expires_at = new Date().toISOString()
      }
    }

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', existing.id)

      if (error) {
        console.error('Failed to update subscription:', error)
        return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
      }
    } else {
      // Create new subscription
      const defaultExpiry = new Date()
      defaultExpiry.setDate(defaultExpiry.getDate() + (extendDays ?? 14))

      const { error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_id: planId || null,
        status: status || 'trial',
        billing_cycle: planId || null,
        started_at: new Date().toISOString(),
        expires_at: updates.expires_at ?? defaultExpiry.toISOString(),
        auto_renew: status === 'active',
      })

      if (error) {
        console.error('Failed to create subscription:', error)
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
      }
    }

    // Return updated subscription
    const { data: updated } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ success: true, subscription: updated })
  } catch (error) {
    console.error('Error in PATCH subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
