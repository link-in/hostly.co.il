import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhoneNumber } from '@/lib/utils/phoneFormatter'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'
import { refreshRoomCache } from '@/lib/availability/cache'

// Force dynamic rendering for webhooks
export const dynamic = 'force-dynamic'

// Beds24 sends the booking inside a wrapper object
interface Beds24WebhookWrapper {
  timeStamp: string
  booking: Beds24Booking
  infoItems?: any[]
  invoiceItems?: any[]
  messages?: any[]
  retries?: number
}

interface Beds24Booking {
  id: number
  propertyId: number
  roomId: number
  status: string
  subStatus: string
  arrival: string
  departure: string
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  address: string
  city: string
  postcode: string
  country: string
  price: number
  deposit: number
  tax: number
  bookingTime: string
  modifiedTime: string
  [key: string]: any
}

interface OwnerInfo {
  phoneNumber: string | null
  roomName: string | null
}

/**
 * Find user ID based on property/room from booking
 */
async function getUserIdFromBooking(booking: Beds24Booking): Promise<string | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('property_id', String(booking.propertyId))
      .eq('room_id', String(booking.roomId))
      .single()
    
    if (error || !data) {
      console.warn(`⚠️  No user found for property ${booking.propertyId}, room ${booking.roomId}`)
      return null
    }
    
    return data.id
  } catch (error) {
    console.error('Error finding user:', error)
    return null
  }
}

async function getOwnerInfo(booking: Beds24Booking): Promise<OwnerInfo> {
  try {
    // First priority: Try to find user by propertyId or roomId from booking
    const supabase = createServerClient()
    
    let query = supabase.from('users').select('display_name, phone_number')
    
    if (booking.propertyId) {
      query = query.eq('property_id', String(booking.propertyId))
    } else if (booking.roomId) {
      query = query.eq('room_id', String(booking.roomId))
    } else {
      // No property or room ID provided, try env variable
      const envPhone = process.env.OWNER_PHONE_NUMBER
      if (envPhone && envPhone.trim()) {
        console.log('✅ Using owner phone from env variable')
        return {
          phoneNumber: envPhone,
          roomName: null,
        }
      }
      
      console.warn('⚠️  No propertyId or roomId in booking')
      return { phoneNumber: null, roomName: null }
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('⚠️  No user found for property/room:', {
          propertyId: booking.propertyId,
          roomId: booking.roomId,
        })
      } else {
        console.error('❌ Error querying users:', error)
      }
      
      // Fallback: Try environment variable
      const envPhone = process.env.OWNER_PHONE_NUMBER
      if (envPhone && envPhone.trim()) {
        console.log('✅ Using owner phone from env variable (fallback)')
        return {
          phoneNumber: envPhone,
          roomName: null,
        }
      }
      
      return { phoneNumber: null, roomName: null }
    }

    if (data && data.phone_number && data.phone_number.trim()) {
      console.log('✅ Found owner from Supabase:', data.display_name)
      const normalizedOwnerPhone = normalizePhoneNumber(data.phone_number)
      console.log(`📱 Owner phone: ${data.phone_number} → ${normalizedOwnerPhone}`)
      return {
        phoneNumber: normalizedOwnerPhone,
        roomName: data.display_name,
      }
    }

    console.warn('⚠️  User found but no phone number configured')
    return { phoneNumber: null, roomName: data?.display_name || null }
  } catch (error) {
    console.error('❌ Error getting owner info:', error)
    return { phoneNumber: null, roomName: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming JSON payload from Beds24 (wrapper object)
    const webhookData: Beds24WebhookWrapper = await request.json()
    const booking = webhookData.booking

    // Log the received data to console for debugging
    console.log('📥 Received Beds24 Webhook:')
    console.log('Booking ID:', booking.id)
    console.log('Status:', booking.status)
    console.log('Guest:', `${booking.firstName} ${booking.lastName}`)
    console.log('Phone/Mobile:', booking.mobile || booking.phone)
    console.log('Arrival:', booking.arrival)
    console.log('Property/Room:', `${booking.propertyId}/${booking.roomId}`)
    console.log('Retries:', webhookData.retries || 0)
    console.log('Full booking:', JSON.stringify(booking, null, 2))

    // Check for duplicate webhooks - Beds24 may retry on timeout
    const supabase = createServerClient()
    const { data: existingNotification } = await supabase
      .from('notifications_log')
      .select('id, created_at')
      .eq('booking_id', String(booking.id))
      .single()

    if (existingNotification) {
      console.log(`⚠️  Duplicate webhook detected for booking ${booking.id} - already processed at ${existingNotification.created_at}`)
      return NextResponse.json(
        { 
          success: true,
          message: `Booking ${booking.id} already processed - duplicate webhook ignored`,
        },
        { status: 200 }
      )
    }

    // Filter: Only process confirmed bookings (skip cancelled, etc.)
    const validStatuses = ['confirmed', 'new', '1']  // Beds24 uses different status values
    if (!validStatuses.includes(booking.status.toLowerCase()) && booking.status !== '1') {
      console.log(`⚠️  Skipping booking with status: ${booking.status}`)
      return NextResponse.json(
        { 
          success: true,
          message: `Booking status '${booking.status}' - skipped`,
        },
        { status: 200 }
      )
    }

    // Build guest name
    const guestName = `${booking.firstName} ${booking.lastName}`.trim()
    const guestPhoneRaw = booking.mobile || booking.phone || ''
    const guestPhone = guestPhoneRaw ? normalizePhoneNumber(guestPhoneRaw) : ''
    const guestEmail = booking.email || ''
    
    if (!guestPhone) {
      console.warn('⚠️  No phone number in booking')
    } else {
      console.log(`📞 Phone normalized: ${guestPhoneRaw} → ${guestPhone}`)
    }
    
    if (guestEmail) {
      console.log(`📧 Email: ${guestEmail}`)
    }

    // Save to Supabase notifications_log table
    const { data, error } = await supabase
      .from('notifications_log')
      .insert({
        guest_name: guestName,
        phone: guestPhone,
        guest_email: guestEmail || null,
        check_in_date: booking.arrival,
        raw_payload: webhookData,  // Save the entire webhook for reference
        status: 'received',
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('❌ Error saving to Supabase:', error)
      // Still return 200 to Beds24 so they don't retry
      return NextResponse.json(
        { 
          success: false, 
          message: 'Webhook received but failed to save to database',
          error: error.message 
        },
        { status: 200 }
      )
    }

    console.log('✅ Webhook saved to database:', data)

    const recordId = data[0]?.id
    
    // Save/update customer in customers table
    const userId = await getUserIdFromBooking(booking)
    if (userId && guestName) {
      console.log('👥 Saving customer from webhook to database...')
      
      // Extract booking source
      const apiSource = String(booking.apiSource || '').toLowerCase()
      let bookingSource = 'other'
      
      if (apiSource.includes('airbnb')) {
        bookingSource = 'airbnb'
      } else if (apiSource.includes('booking')) {
        bookingSource = 'booking.com'
      }
      
      const customerResult = await addOrUpdateCustomer({
        userId,
        fullName: guestName,
        phone: guestPhone || null,
        email: guestEmail || null,
        bookingDate: booking.arrival || new Date().toISOString(),
        bookingSource,
      })
      
      if (customerResult.success) {
        console.log('✅ Customer saved/updated from webhook:', customerResult.customerId)
      } else {
        console.error('❌ Failed to save customer from webhook:', customerResult.error)
      }
    }

    // Refresh availability cache in the background (non-blocking)
    if (userId) {
      const accessToken = process.env.BEDS24_TOKEN
      const refreshToken = process.env.BEDS24_REFRESH_TOKEN
      if (accessToken && refreshToken) {
        refreshRoomCache(
          userId,
          String(booking.propertyId),
          String(booking.roomId),
          accessToken,
          refreshToken,
        ).then((r) => {
          console.log(`[AvailabilityCache] Webhook refresh: ${r.upserted} rows for room ${booking.roomId}${r.error ? ` (error: ${r.error})` : ''}`)
        }).catch((e) => {
          console.error('[AvailabilityCache] Webhook refresh failed:', e)
        })
      }
    }

    // Get owner info first (for both guest and owner messages)
    const ownerInfo = await getOwnerInfo(booking)
    
    // Send WhatsApp message to guest (only if we have a phone number)
    let whatsappResult: { success: boolean; provider: string; error?: string } = { 
      success: false, 
      provider: 'none', 
      error: 'No phone number' 
    }
    
    if (guestPhone) {
      const propertyName = ownerInfo.roomName || 'Mountain View' // Fallback to default if not found
      whatsappResult = await sendWhatsAppMessage({
        to: guestPhone,
        message: `שלום ${guestName}! 🏔️\n\nקיבלנו את הזמנתך ב-${propertyName}.\n📅 תאריך כניסה: ${booking.arrival}\n\nנשמח לארח אותך! 🎉`,
      })
    } else {
      console.warn('⚠️  Skipping guest WhatsApp - no phone number')
    }

    // Send notification to property owner
    let ownerNotificationResult = null
    
    if (ownerInfo.phoneNumber) {
      console.log(`📞 Sending owner notification to: ${ownerInfo.phoneNumber}`)
      ownerNotificationResult = await sendWhatsAppMessage({
        to: ownerInfo.phoneNumber,
        message: `🔔 הזמנה חדשה!\n\n👤 אורח: ${guestName}\n📱 טלפון: ${guestPhone || 'לא צוין'}\n📅 כניסה: ${booking.arrival}${booking.departure ? `\n📅 יציאה: ${booking.departure}` : ''}${ownerInfo.roomName ? `\n🏠 יחידה: ${ownerInfo.roomName}` : ''}${booking.numAdult ? `\n👥 מספר אורחים: ${booking.numAdult}` : ''}\n🔖 מספר הזמנה: ${booking.id}`,
      })
      
      if (ownerNotificationResult.success) {
        console.log(`✅ Owner notification sent successfully to ${ownerInfo.phoneNumber}`)
      } else {
        console.error(`❌ Failed to send owner notification to ${ownerInfo.phoneNumber}:`, ownerNotificationResult.error)
      }
    } else {
      console.warn('⚠️  No owner phone number found - skipping owner notification')
    }

    // Update database with WhatsApp status
    if (recordId) {
      await supabase
        .from('notifications_log')
        .update({
          status: whatsappResult.success ? 'sent' : 'failed',
          whatsapp_sent_at: whatsappResult.success ? new Date().toISOString() : null,
          whatsapp_error: whatsappResult.error || null,
        })
        .eq('id', recordId)
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Webhook received and processed successfully',
        data,
        whatsapp: {
          guest: {
            sent: whatsappResult.success,
            provider: whatsappResult.provider,
            error: whatsappResult.error,
          },
          owner: ownerNotificationResult ? {
            sent: ownerNotificationResult.success,
            provider: ownerNotificationResult.provider,
            error: ownerNotificationResult.error,
          } : {
            sent: false,
            message: 'Owner phone not configured (set OWNER_PHONE_NUMBER in .env)'
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    
    // Return 200 even on error to prevent Beds24 from retrying
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error processing webhook',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 200 }
    )
  }
}

// Optional: Add GET handler for testing
export async function GET() {
  return NextResponse.json(
    { 
      message: 'Beds24 Webhook Endpoint',
      status: 'active',
      endpoint: '/api/webhook',
      method: 'POST'
    },
    { status: 200 }
  )
}
