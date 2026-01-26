import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for webhooks
export const dynamic = 'force-dynamic'

/**
 * Simple webhook logger to capture Beds24 webhook format
 * This endpoint accepts any POST request and logs everything
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.json()
    
    // Get all headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Log everything to console (visible in Vercel logs)
    console.log('='.repeat(80))
    console.log('🔔 BEDS24 WEBHOOK RECEIVED')
    console.log('='.repeat(80))
    console.log('Timestamp:', new Date().toISOString())
    console.log('URL:', request.url)
    console.log('Method:', request.method)
    console.log('')
    console.log('📋 HEADERS:')
    console.log(JSON.stringify(headers, null, 2))
    console.log('')
    console.log('📦 BODY:')
    console.log(JSON.stringify(body, null, 2))
    console.log('='.repeat(80))

    // Return success
    return NextResponse.json(
      { 
        success: true,
        message: 'Webhook logged successfully',
        timestamp: new Date().toISOString(),
        receivedFields: Object.keys(body),
        bodyPreview: body
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    
    // Still return 200 to prevent Beds24 from retrying
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  }
}

// Handle GET for testing
export async function GET() {
  return NextResponse.json(
    { 
      message: 'Webhook logger endpoint. Use POST to send webhooks.',
      usage: 'Configure this URL in Beds24: https://your-domain.com/api/webhook-logger'
    },
    { status: 200 }
  )
}
