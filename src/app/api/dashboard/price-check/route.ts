import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

export async function POST(request: Request) {
  try {
    // Get session to identify which property/room to check
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
    const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

    if (!propertyId || !roomId) {
      return NextResponse.json(
        { error: 'Missing BEDS24_PROPERTY_ID or BEDS24_ROOM_ID in session or environment' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { checkIn, checkOut, numAdult, numChild } = body

    // Validate inputs
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: checkIn, checkOut' },
        { status: 400 }
      )
    }

    if (!numAdult || numAdult < 1) {
      return NextResponse.json(
        { error: 'At least 1 adult is required' },
        { status: 400 }
      )
    }

    // Validate dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      )
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      )
    }

    console.log(`💰 Price check request: ${checkIn} to ${checkOut}, ${numAdult} adults, ${numChild} children`)

    // Prepare user-specific tokens if available
    const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
      ? {
          accessToken: session.user.beds24Token,
          refreshToken: session.user.beds24RefreshToken,
        }
      : undefined

    if (userTokens) {
      console.log('🔑 Using user-specific Beds24 tokens')
    } else {
      console.log('🌍 Using global Beds24 tokens')
    }

    // Use the JSON API (V1) for price checking since V2 endpoints are complex
    // Format dates as YYYYMMDD for JSON API
    const arrivalDate = checkIn.replace(/-/g, '')
    const departureDate = checkOut.replace(/-/g, '')
    
    const jsonApiBody = {
      checkIn: arrivalDate,
      lastNight: departureDate,
      roomId: String(roomId),
      numAdult: Number(numAdult),
      ...(numChild > 0 && { numChild: Number(numChild) }),
      offerId: "1"  // Try to get base offer price
    }

    console.log('📤 Calling Beds24 JSON API getAvailabilities:', jsonApiBody)

    const jsonApiUrl = 'https://api.beds24.com/json/getAvailabilities'
    
    // For JSON API, we need to use the API key from environment
    const apiKey = process.env.BEDS24_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'BEDS24_API_KEY not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(jsonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authentication: {
          apiKey: apiKey
        },
        ...jsonApiBody
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('❌ Beds24 API error:', details)
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('📥 Beds24 JSON API response (FULL):', JSON.stringify(data, null, 2))

    // Calculate nights
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    // Parse Beds24 JSON API response
    // Response structure: { "roomId": { price: X, roomsavail: 1, currency: "ILS" }, ... }
    let totalPrice = 0
    let available = false
    let currency = 'ILS'

    // The response has the room data under the roomId key
    const roomData = data[String(roomId)]
    
    if (roomData && roomData.price !== undefined) {
      // Beds24 API returns price with markup factor of 1.5x
      // Divide by 1.5 to get the base price (multiply by 2/3)
      const apiPrice = Number(roomData.price)
      totalPrice = Math.round(apiPrice * (2/3))
      
      // roomsavail >= 1 means available
      available = totalPrice > 0 && Number(roomData.roomsavail || 0) >= 1
      currency = roomData.currency || 'ILS'
      
      console.log('✅ Found room data:', { 
        apiPrice, 
        basePrice: totalPrice, 
        available, 
        currency, 
        roomsavail: roomData.roomsavail 
      })
    } else {
      console.log('❌ No room data found for roomId:', roomId)
    }

    const pricePerNight = nights > 0 ? totalPrice / nights : 0

    const result = {
      available,
      price: Number(totalPrice.toFixed(2)),
      currency,
      nights,
      pricePerNight: Number(pricePerNight.toFixed(2)),
      checkIn,
      checkOut,
      numAdult,
      numChild,
      details: data
    }

    console.log('✅ Price check result:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Price check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
