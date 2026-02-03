import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { createServerClient } from '@/lib/supabase/server'
import { getUserByEmail } from '@/lib/auth/getUsersDb'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'

export const dynamic = 'force-dynamic'  // Allow POST requests for creating bookings
export const revalidate = 0

const DEFAULT_BASE_URL = 'https://api.beds24.com/v2'

const getBaseUrl = () => process.env.BEDS24_API_BASE_URL ?? DEFAULT_BASE_URL

export async function GET() {
  // Get session to identify which property/room to fetch
  const session = await getServerSession(authOptions)
  
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

  if (!propertyId || !roomId) {
    return NextResponse.json(
      { error: 'Missing BEDS24_PROPERTY_ID or BEDS24_ROOM_ID in session or environment' },
      { status: 500 }
    )
  }

  const url = new URL(`${getBaseUrl()}/bookings`)
  
  const query = process.env.BEDS24_BOOKINGS_QUERY
  if (query) {
    const params = new URLSearchParams(query)
    params.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  } else {
    url.searchParams.set('arrivalFrom', '2024-01-01')
    url.searchParams.set('includeInvoice', 'true')
  }
  
  // Add property and room filters to ensure we only get bookings for this specific unit
  url.searchParams.set('propertyId', propertyId)
  url.searchParams.set('roomId', roomId)

  console.log(`🔍 Fetching bookings for Property: ${propertyId}, Room: ${roomId}`)

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

  try {
    const response = await fetchWithTokenRefresh(url.toString(), {}, userTokens, session?.user?.id)

    if (!response.ok) {
      const details = await response.text()
      return NextResponse.json(
        { error: 'Beds24 request failed', status: response.status, details },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log(`✅ Fetched ${Array.isArray(data) ? data.length : 'unknown'} bookings`)
    return NextResponse.json(data)
  } catch (error) {
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

export async function POST(request: Request) {
  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Extract payload and sendWhatsApp flag
  let payload: unknown
  let sendWhatsApp = true // Default: send WhatsApp
  
  if (requestBody && typeof requestBody === 'object' && 'bookings' in requestBody) {
    // New format: { bookings: [...], sendWhatsApp: true/false }
    payload = (requestBody as { bookings: unknown }).bookings
    sendWhatsApp = (requestBody as { sendWhatsApp?: boolean }).sendWhatsApp ?? true
    console.log('📧 sendWhatsApp flag:', sendWhatsApp)
  } else {
    // Old format: direct array or object (for backwards compatibility)
    payload = requestBody
  }

  const session = await getServerSession(authOptions)
  
  // 🎭 Demo Mode Protection: Block real actions for demo users
  if (session?.user?.isDemo) {
    console.log('🎭 Demo user attempted to create booking - returning fake success')
    return NextResponse.json({
      success: true,
      message: 'Demo Mode: הזמנה נוצרה בהצלחה (סימולציה בלבד)',
      demo: true,
      booking: {
        id: `demo_${Date.now()}`,
        status: 'confirmed',
        message: 'במצב דמו, הזמנות לא נשמרות בפועל ולא נשלחות הודעות WhatsApp'
      }
    })
  }
  
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

  if (!propertyId || !roomId) {
    return NextResponse.json({ error: 'Missing BEDS24_PROPERTY_ID or BEDS24_ROOM_ID' }, { status: 500 })
  }

  const extractInvoiceTotal = (items: unknown[]) => {
    return items.reduce<number>((sum, entry) => {
      if (!entry || typeof entry !== 'object') {
        return sum
      }
      const amount =
        (typeof (entry as { amount?: unknown }).amount === 'number' && (entry as { amount: number }).amount) ||
        (typeof (entry as { amount?: unknown }).amount === 'string' && Number.parseFloat((entry as { amount: string }).amount)) ||
        (typeof (entry as { total?: unknown }).total === 'number' && (entry as { total: number }).total) ||
        (typeof (entry as { total?: unknown }).total === 'string' && Number.parseFloat((entry as { total: string }).total)) ||
        0
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
  }

  const normalizeItem = (item: Record<string, unknown>) => {
    const invoiceItems = Array.isArray(item.invoice) ? item.invoice : []
    const explicitPrice =
      (typeof item.price === 'number' && item.price) ||
      (typeof item.price === 'string' && Number.parseFloat(item.price)) ||
      0
    const invoiceTotal = extractInvoiceTotal(invoiceItems)
    const price = explicitPrice || invoiceTotal
    
    // Build booking object with all required fields
    const booking: Record<string, unknown> = {
      propertyId: Number(propertyId),
      roomId: Number(roomId),
      arrival: item.arrival,
      departure: item.departure,
      firstName: item.firstName,
      lastName: item.lastName,
      status: item.status ?? 'confirmed',
      invoice: invoiceItems,
      ...(price ? { price } : {}),
    }
    
    // Add optional fields if provided
    if (item.mobile) booking.mobile = item.mobile
    if (item.phone) booking.phone = item.phone
    if (item.email) booking.email = item.email
    if (item.numAdult) booking.numAdult = item.numAdult
    if (item.numChild) booking.numChild = item.numChild
    if (item.notes !== undefined) {
      booking.notes = item.notes || '' // Send notes even if empty
      console.log('📝 Creating booking with notes:', item.notes || '(empty)')
    }
    if (item.address) booking.address = item.address
    if (item.city) booking.city = item.city
    if (item.postcode) booking.postcode = item.postcode
    if (item.country) booking.country = item.country
    
    return booking
  }

  const normalizedPayload = Array.isArray(payload)
    ? payload.map((item) => normalizeItem(item as Record<string, unknown>))
    : [normalizeItem(payload as Record<string, unknown>)]

  console.log('Beds24 booking payload', normalizedPayload)

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? {
        accessToken: session.user.beds24Token,
        refreshToken: session.user.beds24RefreshToken,
      }
    : undefined

  const response = await fetchWithTokenRefresh(`${getBaseUrl()}/bookings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(normalizedPayload),
  }, userTokens, session?.user?.id)

  if (!response.ok) {
    const details = await response.text()
    return NextResponse.json(
      { error: 'Beds24 request failed', status: response.status, details },
      { status: 502 }
    )
  }

  const data = await response.json()
  
  console.log('✅ Beds24 response:', JSON.stringify(data, null, 2))
  
  // Send WhatsApp notifications for direct bookings
  // (Beds24 doesn't send webhooks for API-created bookings)
  if (!sendWhatsApp) {
    console.log('⏭️  Skipping WhatsApp - disabled by user')
    return NextResponse.json(data)
  }
  
  try {
    console.log('📝 Starting WhatsApp/Supabase process...')
    
    const firstBooking = normalizedPayload[0]
    const guestName = `${String(firstBooking.firstName || '')} ${String(firstBooking.lastName || '')}`.trim()
    const guestPhoneRaw = String(firstBooking.mobile || firstBooking.phone || '')
    const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''
    const guestEmail = String(firstBooking.email || '')
    const checkInDate = String(firstBooking.arrival || '')
    const checkOutDate = String(firstBooking.departure || '')
    const numAdult = Number(firstBooking.numAdult) || 1
    
    console.log(`👤 Guest: ${guestName}, Phone: ${guestPhoneRaw} → ${guestPhone}`)
    if (guestEmail) {
      console.log(`📧 Email: ${guestEmail}`)
    }
    
    // Get booking ID from Beds24 response
    const bookingId = Array.isArray(data) && data[0]?.new?.id 
      ? String(data[0].new.id)
      : (Array.isArray(data) && data[0]?.bookingId ? String(data[0].bookingId) : 'N/A')
    
    console.log(`🔖 Booking ID: ${bookingId}`)
    
    // ⭐ NEW: Create check-in record
    console.log('🔐 Creating check-in record...')
    let checkInLink = ''
    
    if (session?.user?.id) {
      try {
        const checkInRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/check-in/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            guestName,
            guestPhone,
            guestEmail: guestEmail || null,
            checkInDate,
            checkOutDate,
            numAdult,
            numChild: Number(firstBooking.numChild) || 0,
            userId: session.user.id,
          }),
        })

        if (checkInRes.ok) {
          const checkInData = await checkInRes.json()
          checkInLink = checkInData.link
          console.log('✅ Check-in created:', checkInLink)
        } else {
          console.error('❌ Failed to create check-in record')
        }
      } catch (checkInError) {
        console.error('❌ Error creating check-in:', checkInError)
      }
    } else {
      console.warn('⚠️ No session user ID - skipping check-in creation')
    }
    
    // Save to Supabase notifications_log
    console.log('💾 Attempting to save to Supabase...')
    const supabase = createServerClient()
    const { data: logData, error: logError } = await supabase
      .from('notifications_log')
      .insert({
        guest_name: guestName,
        phone: guestPhone,
        guest_email: guestEmail || null,
        check_in_date: checkInDate,
        raw_payload: {
          source: 'dashboard',
          booking: firstBooking,
          beds24Response: data,
        },
        status: 'received',
        created_at: new Date().toISOString(),
      })
      .select()
    
    if (logError) {
      console.log('❌ SUPABASE ERROR:', JSON.stringify(logError, null, 2))
      console.error('❌ Failed to save to notifications_log:', logError)
    } else {
      console.log('✅ Saved to Supabase! Record ID:', logData?.[0]?.id)
    }
    
    const recordId = logData?.[0]?.id
    
    // Save/update customer in customers table
    if (session?.user?.id && guestName) {
      console.log('👥 Saving customer to database...')
      const customerResult = await addOrUpdateCustomer({
        userId: session.user.id,
        fullName: guestName,
        phone: guestPhone || null,
        email: guestEmail || null,
        bookingDate: checkInDate || new Date().toISOString(),
        bookingSource: 'direct', // Direct bookings are always 'direct'
      })
      
      if (customerResult.success) {
        console.log('✅ Customer saved/updated:', customerResult.customerId)
      } else {
        console.error('❌ Failed to save customer:', customerResult.error)
      }
    }
    
    // Get owner info for room name and phone
    const ownerEmail = session?.user?.email
    console.log(`👤 Owner email: ${ownerEmail}`)
    let ownerInfo = { phoneNumber: null as string | null, roomName: null as string | null }
    
    if (ownerEmail) {
      try {
        const user = await getUserByEmail(ownerEmail)
        if (user) {
          ownerInfo = {
            phoneNumber: user.phoneNumber || null,
            roomName: user.displayName || null,
          }
          console.log(`📞 Owner info: phone=${ownerInfo.phoneNumber}, name=${ownerInfo.roomName}`)
        } else {
          console.log('⚠️  Owner user not found')
        }
      } catch (error) {
        console.log('❌ ERROR getting owner info:', error)
        console.error('❌ Error getting owner info:', error)
      }
    } else {
      console.log('⚠️  No owner email in session')
    }
    
    // Send WhatsApp to guest
    let whatsappResult: { success: boolean; provider: string; error?: string } = {
      success: false,
      provider: 'none',
      error: 'No phone number',
    }
    
    if (guestPhone) {
      const propertyName = ownerInfo.roomName || 'Mountain View'
      
      // ⭐ NEW: Include check-in link in message
      let message = `שלום ${guestName}! 🏔️\n\nקיבלנו את הזמנתך ב-${propertyName}.\n📅 תאריך כניסה: ${checkInDate}\n📅 תאריך יציאה: ${checkOutDate}\n\n`
      
      if (checkInLink) {
        message += `🔗 אנא השלם/י צ'ק-אין דיגיטלי (לוקח 3 דקות):\n${checkInLink}\n\n`
      }
      
      message += `נשמח לארח אותך! 🎉`
      
      whatsappResult = await sendWhatsAppMessage({
        to: guestPhone,
        message,
      })
      
      console.log(`📱 Guest WhatsApp (${guestPhone}):`, whatsappResult.success ? '✅ Sent' : `❌ Failed - ${whatsappResult.error}`)
    } else {
      console.warn('⚠️  Skipping guest WhatsApp - no phone number')
    }
    
    // Skip owner notification for manual bookings (owner already knows - they created it!)
    console.log('⏭️  Skipping owner WhatsApp for manual booking - owner created this booking themselves')
    let ownerNotificationResult = null
    
    // Update database with WhatsApp status
    if (recordId) {
      const status = whatsappResult.success ? 'sent' : 'failed'
      await supabase
        .from('notifications_log')
        .update({
          status,
          whatsapp_sent_at: whatsappResult.success ? new Date().toISOString() : null,
          whatsapp_error: whatsappResult.error || null,
        })
        .eq('id', recordId)
    }
    
  } catch (whatsappError) {
    // Don't fail the booking creation if WhatsApp fails
    console.log('❌ CAUGHT ERROR in WhatsApp/Supabase block:', whatsappError)
    console.error('❌ Error sending WhatsApp:', whatsappError)
  }
  
  console.log('🏁 Finished booking creation process')
  
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ data, debugPayload: normalizedPayload })
  }
  return NextResponse.json(data)
}

// PATCH endpoint for updating existing bookings (Direct bookings only)
export async function PATCH(request: Request) {
  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!requestBody || typeof requestBody !== 'object' || !('bookingId' in requestBody)) {
    return NextResponse.json({ error: 'Missing bookingId in request' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  
  // 🎭 Demo Mode Protection
  if (session?.user?.isDemo) {
    console.log('🎭 Demo user attempted to update booking - returning fake success')
    return NextResponse.json({
      success: true,
      message: 'Demo Mode: הזמנה עודכנה בהצלחה (סימולציה בלבד)',
      demo: true,
    })
  }
  
  const propertyId = session?.user?.propertyId ?? process.env.BEDS24_PROPERTY_ID
  const roomId = session?.user?.roomId ?? process.env.BEDS24_ROOM_ID

  if (!propertyId || !roomId) {
    return NextResponse.json({ error: 'Missing BEDS24_PROPERTY_ID or BEDS24_ROOM_ID' }, { status: 500 })
  }

  const { bookingId, ...updates } = requestBody as Record<string, unknown>

  // Validate required fields
  if (!bookingId || typeof bookingId !== 'string' && typeof bookingId !== 'number') {
    console.error('❌ Invalid bookingId:', bookingId)
    return NextResponse.json({ error: 'Invalid bookingId format' }, { status: 400 })
  }

  // Build update payload for Beds24 V2 API
  // IMPORTANT: Per official Beds24 documentation:
  // - Use POST (not PATCH) to /bookings
  // - Include 'id' field (not 'bookId') in the payload
  // - Send as array: [{id: xxx, ...fields to update}]
  // - Only include fields that need updating
  const booking: Record<string, unknown> = {
    id: bookingId, // CRITICAL: use 'id' field for updates
    propertyId: (updates.propertyId as string) || propertyId, // Include required fields
    roomId: (updates.roomId as string) || roomId,
  }

  // Add only fields that are actually being updated
  if (updates.arrival) booking.arrival = updates.arrival
  if (updates.departure) booking.departure = updates.departure
  if (updates.firstName) booking.firstName = updates.firstName
  if (updates.lastName) booking.lastName = updates.lastName
  
  // Normalize phone numbers before sending to Beds24
  if (updates.mobile) {
    const normalizedMobile = normalizePhoneNumber(String(updates.mobile))
    booking.mobile = normalizedMobile
    console.log('📱 Normalized mobile:', updates.mobile, '->', normalizedMobile)
  }
  if (updates.phone) {
    const normalizedPhone = normalizePhoneNumber(String(updates.phone))
    booking.phone = normalizedPhone
    console.log('📱 Normalized phone:', updates.phone, '->', normalizedPhone)
  }
  
  if (updates.email) booking.email = updates.email
  if (updates.numAdult !== undefined) booking.numAdult = updates.numAdult
  if (updates.numChild !== undefined) booking.numChild = updates.numChild
  if (updates.notes !== undefined) {
    booking.notes = updates.notes || '' // Send notes even if empty
    console.log('📝 Notes update:', updates.notes || '(empty)')
  }
  if (updates.status) booking.status = updates.status
  
  // Handle price update - send as direct field (not invoice)
  // Note: For updates, Beds24 accepts direct 'price' field
  if (updates.price !== undefined) {
    const priceValue = Number(updates.price)
    if (isNaN(priceValue) || priceValue < 0) {
      console.error('❌ Invalid price value:', updates.price)
      return NextResponse.json({ error: 'Invalid price value' }, { status: 400 })
    }
    booking.price = priceValue
    console.log('💰 Price update:', priceValue)
  }

  console.log('📝 Updating booking in Beds24:', bookingId)
  console.log('📦 Update payload:', JSON.stringify(booking, null, 2))

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? {
        accessToken: session.user.beds24Token,
        refreshToken: session.user.beds24RefreshToken,
      }
    : undefined

  try {
    // CORRECT METHOD per Beds24 V2 documentation:
    // POST to /bookings with array containing object with 'id' field
    // Example: [{ "id": 7777777, "departure": "2021-01-10" }]
    const updateUrl = `${getBaseUrl()}/bookings`
    console.log('🔗 POST URL:', updateUrl)
    console.log('🔑 Booking ID (in payload):', bookingId)
    
    // Send as array with booking object containing 'id' field
    const response = await fetchWithTokenRefresh(updateUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify([booking]), // Array format per documentation
    }, userTokens, session?.user?.id) // Pass userId for token persistence

    if (!response.ok) {
      const details = await response.text()
      console.error('❌ Beds24 API HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        details,
        url: updateUrl,
        bookingId,
        userId: session?.user?.id,
        usingUserTokens: !!userTokens,
        payload: booking,
      })
      
      // Provide more helpful error messages
      let errorMessage = 'Beds24 update failed'
      if (response.status === 401) {
        errorMessage = 'Authentication failed - token may be expired or invalid'
      } else if (response.status === 403) {
        errorMessage = 'Access denied - check token permissions'
      } else if (response.status === 404) {
        errorMessage = 'Booking not found - verify booking ID'
      } else if (response.status === 502) {
        errorMessage = 'Beds24 service error - please try again'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          status: response.status, 
          details,
          bookingId,
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    
    console.log('✅ Beds24 update response:', JSON.stringify(data, null, 2))
    
    // Check for errors in Beds24 JSON API response
    // Response format: { "bookings": [...], "errors": [...] } or array of results
    let hasError = false
    let errorMessage = ''
    let errorDetails: any[] = []
    
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Global errors
      hasError = true
      errorDetails = data.errors
      errorMessage = data.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
    } else if (data.bookings && Array.isArray(data.bookings)) {
      // Check each booking result
      const failedBooking = data.bookings.find((b: any) => b.success === false || b.errors)
      if (failedBooking) {
        hasError = true
        const errors = failedBooking.errors || []
        errorDetails = errors
        errorMessage = errors.map((e: any) => `${e.field || 'unknown'}: ${e.message || 'error'}`).join(', ') || 'Update failed'
      }
    } else if (Array.isArray(data) && data.length > 0) {
      // Legacy format check
      const firstResult = data[0]
      if (firstResult.success === false) {
        hasError = true
        const errors = firstResult.errors || []
        errorDetails = errors
        errorMessage = errors.map((e: any) => `${e.field || 'unknown'}: ${e.message || 'error'}`).join(', ') || 'Unknown error'
      }
    }
    
    if (hasError) {
      console.error('❌ Beds24 returned validation error:', {
        errorMessage,
        errorDetails,
        bookingId,
        payload: booking,
      })
      return NextResponse.json(
        { 
          error: 'Booking update validation failed', 
          message: errorMessage,
          details: errorDetails,
          beds24Response: data,
          bookingId,
        },
        { status: 400 }
      )
    }
    
    console.log('✅ Booking updated successfully:', bookingId)
    return NextResponse.json({ success: true, data, bookingId })
  } catch (error) {
    console.error('❌ Unexpected error updating booking:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      bookingId,
      userId: session?.user?.id,
      usingUserTokens: !!userTokens,
    })
    return NextResponse.json(
      { 
        error: 'Failed to update booking', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.message : String(error),
        bookingId,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint - Cancel a booking in Beds24 (sets status to 0/cancelled)
 * Only allows cancelling Direct bookings (created in our system)
 * 
 * Note: We use POST with status=0 instead of DELETE because:
 * - The global token may not have delete:bookings scope
 * - Cancelling preserves booking history in Beds24
 * - Works reliably with write:bookings scope
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  // 🎭 Demo Mode Protection
  if (session?.user?.isDemo) {
    console.log('🎭 Demo user attempted to cancel booking - returning fake success')
    return NextResponse.json({
      success: true,
      message: 'Demo Mode: הזמנה בוטלה בהצלחה (סימולציה בלבד)',
      demo: true,
    })
  }

  let requestBody: unknown
  try {
    requestBody = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!requestBody || typeof requestBody !== 'object' || !('bookingId' in requestBody)) {
    return NextResponse.json({ error: 'Missing bookingId in request' }, { status: 400 })
  }

  const { bookingId, source, propertyId, roomId, arrival, departure } = requestBody as Record<string, unknown>

  // Validate that it's a Direct booking
  if (!source || typeof source !== 'string' || !source.toLowerCase().includes('direct')) {
    console.error('❌ Attempted to cancel non-Direct booking:', bookingId, source)
    return NextResponse.json(
      { error: 'ניתן לבטל רק הזמנות שנוצרו ישירות במערכת' },
      { status: 403 }
    )
  }
  
  // Validate required fields
  if (!propertyId || !roomId) {
    console.error('❌ Missing propertyId or roomId:', { bookingId, propertyId, roomId })
    return NextResponse.json(
      { error: 'Missing required fields: propertyId and roomId' },
      { status: 400 }
    )
  }

  // Prepare user-specific tokens if available
  const userTokens = session?.user?.beds24Token && session?.user?.beds24RefreshToken
    ? {
        accessToken: session.user.beds24Token,
        refreshToken: session.user.beds24RefreshToken,
      }
    : undefined

  try {
    // Cancel the booking using POST method (same as update)
    // POST /bookings with array containing booking with status=0
    const bookingIdInt = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId
    const propertyIdInt = typeof propertyId === 'string' ? parseInt(propertyId, 10) : propertyId
    const roomIdInt = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId
    
    const cancelUrl = `${getBaseUrl()}/bookings`
    
    // Payload for cancellation - array format like update
    // Important: status must be a STRING not a number per API docs!
    const payload = [{
      id: bookingIdInt,
      propertyId: propertyIdInt,
      roomId: roomIdInt,
      status: 'cancelled',  // String value as per API docs
    }]
    
    console.log('🗑️ Cancelling Direct booking:', bookingId)
    console.log('🔗 POST URL:', cancelUrl)
    console.log('📤 Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetchWithTokenRefresh(cancelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, userTokens, session?.user?.id)
    
    console.log('📥 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const details = await response.text()
      console.error('❌ Beds24 API Error:', {
        status: response.status,
        statusText: response.statusText,
        details,
        bookingId,
      })
      
      let errorMessage = 'Beds24 cancellation failed'
      if (response.status === 404) {
        errorMessage = 'Booking not found - may have been already cancelled'
      } else if (response.status === 403) {
        errorMessage = 'Access denied - check API token permissions'
      }
      
      return NextResponse.json(
        { error: errorMessage, status: response.status, details, bookingId },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('📦 Beds24 cancel response:', JSON.stringify(data, null, 2))
    
    // POST returns array of results
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0]
      console.log('📦 First result:', JSON.stringify(result, null, 2))
      
      // Check for errors
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        const errorMessage = result.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        console.error('❌ Beds24 returned error:', errorMessage)
        return NextResponse.json(
          { error: 'Cancellation failed', details: errorMessage, beds24Response: data },
          { status: 400 }
        )
      }
      
      // Check for warnings (but still might be successful)
      if (result.warnings && Array.isArray(result.warnings) && result.warnings.length > 0) {
        console.log('⚠️ Beds24 returned warnings:', result.warnings)
        // If there are warnings but success=true, it's still OK
        if (result.success === true) {
          console.log('✅ Booking cancelled with warnings:', bookingId)
          return NextResponse.json({ success: true, data, bookingId, warnings: result.warnings })
        }
      }
      
      // Check success
      if (result.success === true) {
        console.log('✅ Booking cancelled successfully:', bookingId)
        return NextResponse.json({ success: true, data, bookingId })
      }
      
      // If success is false or undefined
      console.error('❌ Beds24 returned success=false or undefined:', result)
      return NextResponse.json(
        { error: 'Cancellation failed - Beds24 did not confirm success', beds24Response: data },
        { status: 400 }
      )
    }
    
    // Unexpected response
    console.error('❌ Unexpected response format:', data)
    return NextResponse.json(
      { error: 'Unexpected response format from Beds24', beds24Response: data },
      { status: 500 }
    )
  } catch (error) {
    console.error('❌ Unexpected error deleting booking:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      bookingId,
    })
    return NextResponse.json(
      { 
        error: 'Failed to delete booking', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        bookingId,
      },
      { status: 500 }
    )
  }
}
