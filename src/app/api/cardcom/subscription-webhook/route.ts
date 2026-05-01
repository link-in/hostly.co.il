import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getLowProfileResult } from '@/lib/cardcom/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cardcom/subscription-webhook
 *
 * Cardcom calls this after every payment attempt.
 * We ALWAYS verify independently via GetLpResult — never trust the webhook body alone.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Cardcom sends lowprofilecode in various casings
    const lowProfileId =
      params.get('lowprofilecode') ??
      params.get('LowProfileCode') ??
      params.get('LowProfileId') ??
      params.get('lowprofileid') ??
      null

    if (!lowProfileId) {
      console.error('Subscription webhook: missing LowProfileId')
      return NextResponse.json({ error: 'Missing LowProfileId' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Find the payment record
    const { data: payment, error: findError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('cardcom_low_profile_id', lowProfileId)
      .maybeSingle()

    if (findError || !payment) {
      console.error('Subscription webhook: payment not found for', lowProfileId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Idempotency — already processed
    if (payment.status === 'paid') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Verify with Cardcom (server-to-server — authoritative)
    let lpResult
    try {
      lpResult = await getLowProfileResult(lowProfileId, 1)
    } catch (err) {
      console.error('Subscription webhook: GetLpResult failed:', err)
      return NextResponse.json({ error: 'Cardcom verification failed' }, { status: 500 })
    }

    const succeeded = lpResult.ResponseCode === 0
    const transactionId = lpResult.TranzactionId?.toString() ?? null
    const authNum = lpResult.TranzactionInfo?.AuthNum ?? null
    const last4 = lpResult.TranzactionInfo?.Last4Digits ?? null
    const docNumber = lpResult.DocumentInfo?.DocumentNumber?.toString() ?? null

    // Update payment record
    await supabase
      .from('subscription_payments')
      .update({
        status: succeeded ? 'paid' : 'failed',
        cardcom_transaction_id: transactionId,
        cardcom_auth_num: authNum,
        cardcom_last4: last4,
        cardcom_document_number: docNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    if (!succeeded) {
      console.warn(`Subscription payment failed for user ${payment.user_id}:`, lpResult.Description)
      return NextResponse.json({ ok: true, paid: false })
    }

    // Activate the subscription
    const planId = payment.plan_id as 'monthly' | 'annual'
    const expiresAt = new Date()
    if (planId === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    // Upsert subscription — update existing or create new
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', payment.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan_id: planId,
          expires_at: expiresAt.toISOString(),
          auto_renew: true,
          cancelled_at: null,
        })
        .eq('id', existing.id)
      if (updateErr) {
        console.error('❌ webhook: subscription update failed:', updateErr)
        return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 })
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
        console.error('❌ webhook: subscription insert failed:', insertErr)
        return NextResponse.json({ error: 'Subscription insert failed' }, { status: 500 })
      }
    }

    console.log(`✅ Subscription activated for user ${payment.user_id} — plan: ${planId}`)
    return NextResponse.json({ ok: true, paid: true })
  } catch (error) {
    console.error('Subscription webhook unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
