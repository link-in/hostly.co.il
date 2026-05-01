import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createSubscriptionLowProfile } from '@/lib/cardcom/client'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const PLAN_PRICES: Record<string, number> = {
  monthly: 150,
  annual: 1000,
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, testToken } = body as { planId: 'monthly' | 'annual'; testToken?: string }

    if (!planId || !PLAN_PRICES[planId]) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    }

    // Test mode — charge ₪1 instead of full price (token must match server-side secret)
    const isTestMode = testToken && testToken === process.env.CARDCOM_TEST_TOKEN
    const amount = isTestMode ? 1 : PLAN_PRICES[planId]

    if (isTestMode) {
      console.log(`🧪 Test mode: charging ₪1 instead of ₪${PLAN_PRICES[planId]} for plan ${planId}`)
    }
    const uniqueId = randomUUID()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hostly.co.il'

    // Save pending payment record
    const supabase = createServiceRoleClient()
    const { error: dbError } = await supabase.from('subscription_payments').insert({
      id: uniqueId,
      user_id: session.user.id,
      plan_id: planId,
      amount,
      status: 'pending',
    })

    if (dbError) {
      console.error('Failed to create payment record:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Mock mode — skip Cardcom, redirect to local mock checkout
    if (process.env.CARDCOM_MOCK_MODE === 'true') {
      const successUrl = encodeURIComponent(`/payment/success?id=${uniqueId}`)
      const cancelUrl = encodeURIComponent(`/payment/cancel?id=${uniqueId}`)
      const mockUrl = `${siteUrl}/payment/mock-checkout?id=${uniqueId}&amount=${amount}&plan=${planId}&successUrl=${successUrl}&cancelUrl=${cancelUrl}`
      return NextResponse.json({ paymentUrl: mockUrl, uniqueId })
    }

    // Create Cardcom LowProfile
    const { lowProfileId, url: paymentUrl } = await createSubscriptionLowProfile({
      amount,
      uniqueId,
      planId,
      userName: session.user.displayName ?? session.user.email ?? 'לקוח Hostly',
      userEmail: session.user.email ?? '',
      successUrl: `${siteUrl}/payment/success?id=${uniqueId}`,
      failedUrl: `${siteUrl}/payment/error?id=${uniqueId}`,
      cancelUrl: `${siteUrl}/payment/cancel?id=${uniqueId}`,
      webhookUrl: `${siteUrl}/api/cardcom/subscription-webhook`,
    })

    // Store lowProfileId on the payment record
    await supabase
      .from('subscription_payments')
      .update({ cardcom_low_profile_id: lowProfileId })
      .eq('id', uniqueId)

    return NextResponse.json({ paymentUrl, uniqueId })
  } catch (error) {
    console.error('Error initiating subscription payment:', error)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
