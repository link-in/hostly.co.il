import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/customers/debug
 * Debug endpoint to check user info and customers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get current user info
    const userInfo = {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      propertyId: session.user.propertyId,
      roomId: session.user.roomId,
    }

    // Get all users from database
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, property_id, room_id')
      .limit(10)

    // Get customers for this user
    const { data: myCustomers, error: customersError } = await supabase
      .from('customers')
      .select('id, user_id, full_name, email, phone')
      .eq('user_id', session.user.id)
      .limit(5)

    // Get all customers (to see user_id distribution)
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from('customers')
      .select('user_id')

    const customersByUser: Record<string, number> = {}
    if (allCustomers) {
      allCustomers.forEach((c: any) => {
        customersByUser[c.user_id] = (customersByUser[c.user_id] || 0) + 1
      })
    }

    return NextResponse.json({
      session: userInfo,
      allUsers: allUsers || [],
      myCustomers: myCustomers || [],
      customerDistribution: customersByUser,
      errors: {
        users: usersError?.message,
        customers: customersError?.message,
        allCustomers: allCustomersError?.message,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
