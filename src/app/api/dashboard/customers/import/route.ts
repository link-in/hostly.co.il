import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { addOrUpdateCustomer } from '@/lib/customers/addOrUpdateCustomer'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes timeout for large imports

/**
 * Find user ID based on property/room from booking
 * This is needed because bookings from different properties should go to different users
 */
async function getUserIdFromBooking(booking: any): Promise<string | null> {
  try {
    const propertyId = String(booking.propertyId || '')
    const roomId = String(booking.roomId || '')
    
    if (!propertyId || !roomId) {
      console.warn('⚠️  Missing propertyId or roomId in booking')
      return null
    }
    
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('property_id', propertyId)
      .eq('room_id', roomId)
      .single()
    
    if (error || !data) {
      console.warn(`⚠️  No user found for property ${propertyId}, room ${roomId}`)
      return null
    }
    
    return data.id
  } catch (error) {
    console.error('Error finding user from booking:', error)
    return null
  }
}

/**
 * POST /api/dashboard/customers/import
 * Import all existing customers from Beds24 bookings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting customer import from Beds24...')
    console.log('👤 Current user:', {
      id: session.user.id,
      email: session.user.email,
      propertyId: session.user.propertyId,
      roomId: session.user.roomId,
    })

    // Fetch all bookings from our existing bookings endpoint
    const bookingsUrl = new URL('/api/dashboard/bookings', request.url)
    bookingsUrl.protocol = request.url.startsWith('https') ? 'https' : 'http'
    bookingsUrl.host = request.headers.get('host') || 'localhost:3000'

    const bookingsResponse = await fetch(bookingsUrl.toString(), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    if (!bookingsResponse.ok) {
      console.error('❌ Failed to fetch bookings:', bookingsResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch bookings from Beds24' },
        { status: 500 }
      )
    }

    const bookingsData = await bookingsResponse.json()
    console.log('📦 Received bookings data:', typeof bookingsData, Array.isArray(bookingsData))

    // Extract bookings array - handle both array and {data: [...]} formats
    let bookings: any[] = []
    if (Array.isArray(bookingsData)) {
      bookings = bookingsData
    } else if (bookingsData.data && Array.isArray(bookingsData.data)) {
      bookings = bookingsData.data
    } else {
      console.error('❌ Unexpected bookings data format:', bookingsData)
      return NextResponse.json(
        { error: 'Unexpected bookings data format' },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${bookings.length} bookings to process`)
    
    // Debug: Show first booking structure
    if (bookings.length > 0) {
      console.log('🔍 First booking sample:', JSON.stringify({
        id: bookings[0].id,
        propertyId: bookings[0].propertyId,
        roomId: bookings[0].roomId,
        firstName: bookings[0].firstName,
        lastName: bookings[0].lastName,
      }, null, 2))
    }

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Since bookings are already filtered by session.user (propertyId + roomId),
    // all bookings belong to the current user. So we use session.user.id directly.
    const currentUserId = session.user.id
    console.log(`📝 All bookings will be assigned to user: ${currentUserId}`)

    // Process each booking
    for (const booking of bookings) {
      try {
        
        // Extract guest information
        const firstName = String(booking.firstName || '').trim()
        const lastName = String(booking.lastName || '').trim()
        const fullName = `${firstName} ${lastName}`.trim()
        
        // Skip if no name
        if (!fullName || fullName.length < 2) {
          skippedCount++
          continue
        }

        const phone = String(booking.mobile || booking.phone || '').trim() || null
        const email = String(booking.email || '').trim() || null
        const bookingDate = booking.arrival || booking.bookingTime || new Date().toISOString()
        
        // Extract booking source (channel)
        const apiSource = String(booking.apiSource || booking.channel || '').toLowerCase()
        let bookingSource = 'direct'
        
        if (apiSource.includes('airbnb')) {
          bookingSource = 'airbnb'
        } else if (apiSource.includes('booking')) {
          bookingSource = 'booking.com'
        } else if (apiSource.includes('direct')) {
          bookingSource = 'direct'
        } else if (apiSource && apiSource !== 'direct') {
          bookingSource = apiSource
        }

        // Import customer with current user_id
        // (All bookings are already filtered by this user's propertyId + roomId)
        const result = await addOrUpdateCustomer({
          userId: currentUserId,
          fullName,
          phone,
          email,
          bookingDate,
          bookingSource,
        })

        if (result.success) {
          // Check if it was a new customer or update
          // We can't tell from the current function, so we'll count all as imported
          importedCount++
        } else {
          console.error(`❌ Failed to import customer ${fullName}:`, result.error)
          errorCount++
        }
      } catch (error) {
        console.error('❌ Error processing booking:', error)
        errorCount++
      }
    }

    console.log('✅ Import complete:', {
      total: bookings.length,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
    })

    return NextResponse.json({
      success: true,
      message: 'Import completed successfully',
      stats: {
        totalBookings: bookings.length,
        customersImported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/dashboard/customers/import:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
