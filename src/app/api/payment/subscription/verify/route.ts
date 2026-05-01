import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payment/subscription/verify?id=<uniqueId>
 *
 * Called by the browser after Cardcom redirects to /payment/success.
 * Returns the current payment status from our DB (set by the webhook).
 * The client polls this until status is 'paid' or 'failed'.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: payment, error } = await supabase
    .from('subscription_payments')
    .select('status, plan_id, amount, created_at')
    .eq('id', id)
    .eq('user_id', session.user.id)  // security: user can only see their own payments
    .maybeSingle()

  if (error || !payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // If still pending — webhook hasn't arrived yet; client should retry
  if (payment.status === 'pending') {
    return NextResponse.json({ status: 'pending' }, { status: 202 })
  }

  return NextResponse.json({
    status: payment.status,
    planId: payment.plan_id,
    amount: payment.amount,
  })
}
