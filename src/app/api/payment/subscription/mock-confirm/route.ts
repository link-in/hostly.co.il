import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/subscription/mock-confirm?id=<uniqueId>
 * Development only — simulates a successful Cardcom webhook.
 * BLOCKED in production (CARDCOM_MOCK_MODE must be 'true').
 */
export async function POST(request: NextRequest) {
  if (process.env.CARDCOM_MOCK_MODE !== 'true') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceRoleClient()

  const { data: payment } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  // Mark as paid
  await supabase
    .from('subscription_payments')
    .update({ status: 'paid', cardcom_transaction_id: 'MOCK-' + Date.now() })
    .eq('id', id)

  // Activate subscription
  const planId = payment.plan_id as 'monthly' | 'annual'
  const expiresAt = new Date()
  if (planId === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', payment.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error: updateErr } = await supabase.from('subscriptions').update({
      status: 'active',
      plan_id: planId,
      expires_at: expiresAt.toISOString(),
      auto_renew: true,
      cancelled_at: null,
    }).eq('id', existing.id)
    if (updateErr) {
      console.error('❌ mock-confirm: subscription update failed:', updateErr)
      return NextResponse.json({ error: 'Subscription update failed', detail: updateErr.message }, { status: 500 })
    }
  } else {
    const { error: insertErr } = await supabase.from('subscriptions').insert({
      user_id: payment.user_id,
      plan_id: planId,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      auto_renew: true,
    })
    if (insertErr) {
      console.error('❌ mock-confirm: subscription insert failed:', insertErr)
      return NextResponse.json({ error: 'Subscription insert failed', detail: insertErr.message }, { status: 500 })
    }
  }
  console.log(`✅ mock-confirm: subscription activated — user: ${payment.user_id}, plan: ${planId}`)

  return NextResponse.json({ ok: true })
}
