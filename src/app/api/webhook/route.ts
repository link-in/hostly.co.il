import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/webhook/processor'
import type { Beds24WebhookWrapper } from '@/lib/webhook/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const webhookData: Beds24WebhookWrapper = await request.json()
    const booking = webhookData.booking

    console.log('📥 Beds24 Webhook received — booking', booking.id, '| status:', booking.status, '| guest:', `${booking.firstName} ${booking.lastName}`)

    const result = await processWebhook(webhookData)

    // Always return 200 so Beds24 doesn't retry
    return NextResponse.json({ success: result.success, message: result.message }, { status: 200 })
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { success: false, message: 'Error processing webhook', error: error instanceof Error ? error.message : String(error) },
      { status: 200 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Beds24 Webhook Endpoint', status: 'active', method: 'POST' })
}
