import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/customers
 * Fetch all customers for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Fetch customers for this user, ordered by last booking date
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_booking_date', { ascending: false })

    if (error) {
      console.error('Failed to fetch customers from Supabase:', error)
      return NextResponse.json(
        { error: 'Failed to fetch customers', details: error.message },
        { status: 500 }
      )
    }

    // Map database columns to camelCase
    const customers = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      firstBookingDate: row.first_booking_date,
      lastBookingDate: row.last_booking_date,
      totalBookings: row.total_bookings,
      bookingSource: row.booking_source || 'direct',
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Error in GET /api/dashboard/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/customers
 * Create or update a customer
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

    const body = await request.json()
    const { fullName, phone, email, bookingDate } = body

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Check if customer already exists (by email or phone)
    let existingCustomer = null
    
    if (email || phone) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', session.user.id)
        .or(`email.eq.${email || ''},phone.eq.${phone || ''}`)
        .single()
      
      existingCustomer = data
    }

    const currentDate = bookingDate || new Date().toISOString()

    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update({
          full_name: fullName,
          phone: phone || existingCustomer.phone,
          email: email || existingCustomer.email,
          last_booking_date: currentDate,
          total_bookings: existingCustomer.total_bookings + 1,
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update customer:', error)
        return NextResponse.json(
          { error: 'Failed to update customer' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        customer: {
          id: data.id,
          userId: data.user_id,
          fullName: data.full_name,
          phone: data.phone,
          email: data.email,
          firstBookingDate: data.first_booking_date,
          lastBookingDate: data.last_booking_date,
          totalBookings: data.total_bookings,
        },
        updated: true
      })
    } else {
      // Create new customer
      const customerId = `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          id: customerId,
          user_id: session.user.id,
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          first_booking_date: currentDate,
          last_booking_date: currentDate,
          total_bookings: 1,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create customer:', error)
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        customer: {
          id: data.id,
          userId: data.user_id,
          fullName: data.full_name,
          phone: data.phone,
          email: data.email,
          firstBookingDate: data.first_booking_date,
          lastBookingDate: data.last_booking_date,
          totalBookings: data.total_bookings,
        },
        created: true
      })
    }
  } catch (error) {
    console.error('Error in POST /api/dashboard/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
