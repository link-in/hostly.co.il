import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

/**
 * GET /api/channels/airbnb/authorize
 * 
 * Fetches the Airbnb OAuth authorization URL from Beds24 API V2
 * Uses master account token (white label) so user is not prompted for Beds24 login
 * 
 * Query params:
 *   - propertyId: The Beds24 property ID to connect to Airbnb
 */
export async function GET(request: Request) {
  // Verify user is authenticated
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get propertyId from query params
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')

  if (!propertyId) {
    return NextResponse.json(
      { error: 'Missing propertyId query parameter' },
      { status: 400 }
    )
  }

  console.log(`🔗 Fetching Airbnb authorization URL for Property: ${propertyId}`)
  console.log('🌍 Using master account token (white label)')

  // Try POST request with property ID in body (Beds24 V2 pattern)
  const url = `${getBaseUrl()}/channels/airbnb/authorizationUrl`
  const payload = { propertyId }

  try {
    console.log(`🔍 Full URL being called: ${url}`)
    console.log(`🔍 Payload:`, JSON.stringify(payload))
    
    // Try POST request first
    const response = await fetchWithTokenRefresh(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      let details: string
      try {
        details = await response.text()
      } catch (e) {
        details = `Failed to read response: ${e}`
      }
      console.error(`❌ Beds24 request failed: ${response.status}`, details)
      return NextResponse.json(
        { 
          error: 'Failed to fetch Airbnb authorization URL', 
          status: response.status, 
          details 
        },
        { status: 502 }
      )
    }

    // Get response text first to see what we're getting
    let responseText: string
    try {
      responseText = await response.text()
      console.log('📦 Raw response from Beds24:', responseText)
      console.log('📦 Response length:', responseText.length)
    } catch (e) {
      console.error('❌ Failed to read response text:', e)
      return NextResponse.json(
        { error: 'Failed to read response from Beds24' },
        { status: 502 }
      )
    }
    
    // Try to parse it
    let resData: any
    try {
      resData = responseText ? JSON.parse(responseText) : null
      console.log('📋 Parsed data:', JSON.stringify(resData, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError)
      console.error('❌ Response was:', responseText)
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from Beds24',
          rawResponse: responseText 
        },
        { status: 502 }
      )
    }
    
    // Check for null/empty response
    if (!resData) {
      console.error('❌ Response is null or empty')
      return NextResponse.json(
        { 
          error: 'Empty response from Beds24 - Property ID may not exist or no access to this property',
          propertyId,
          rawResponse: responseText,
          hint: 'Verify the Property ID exists and the Master Account has access to it'
        },
        { status: 502 }
      )
    }

    // Check for Beds24 error response
    if (resData.success === false || resData.error) {
      console.error('❌ Beds24 returned an error:', resData)
      return NextResponse.json(
        { 
          error: 'Beds24 API error',
          beds24Error: resData.error || resData.message || 'Unknown error',
          receivedData: resData
        },
        { status: 502 }
      )
    }

    let authorizationUrl: string | undefined

    // Try different response structures
    if (resData.success && resData.data && Array.isArray(resData.data) && resData.data.length > 0) {
      // Beds24 V2 format: { success: true, data: [{ authorizationUrl: "..." }] }
      authorizationUrl = resData.data[0].authorizationUrl
      console.log('✅ Found authorizationUrl in data[0]:', authorizationUrl)
    } else if (resData.authorizationUrl) {
      // Direct format: { authorizationUrl: "..." }
      authorizationUrl = resData.authorizationUrl
      console.log('✅ Found authorizationUrl directly:', authorizationUrl)
    } else if (resData.data && resData.data.authorizationUrl) {
      // Nested format: { data: { authorizationUrl: "..." } }
      authorizationUrl = resData.data.authorizationUrl
      console.log('✅ Found authorizationUrl in data:', authorizationUrl)
    }

    if (!authorizationUrl) {
      console.error('❌ No authorizationUrl found in response. Full data:', resData)
      return NextResponse.json(
        { 
          error: 'Invalid response from Beds24 - missing authorizationUrl',
          receivedData: resData,
          rawResponse: responseText
        },
        { status: 502 }
      )
    }

    console.log('✅ Successfully fetched Airbnb authorization URL:', authorizationUrl)
    return NextResponse.json({ authorizationUrl })
  } catch (error) {
    console.error('❌ Failed to reach Beds24:', error)
    return NextResponse.json(
      {
        error: 'Failed to reach Beds24',
        details: error instanceof Error ? error.message : String(error),
        endpoint: url.toString(),
      },
      { status: 502 }
    )
  }
}
