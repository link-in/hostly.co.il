import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'
import type { CommissionRate, UpdateCommissionRateRequest } from '@/lib/types/commission'

/**
 * GET /api/admin/commission-rates
 * Get all commission rates
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('commission_rates')
      .select('*')
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Failed to fetch commission rates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch commission rates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rates: data || [] })
  } catch (error) {
    console.error('Error in GET /api/admin/commission-rates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/commission-rates
 * Update commission rates
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body: UpdateCommissionRateRequest = await req.json()

    if (!body.platform_name || body.commission_rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (body.commission_rate < 0 || body.commission_rate > 1) {
      return NextResponse.json(
        { error: 'Commission rate must be between 0 and 1' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const updateData: any = {
      commission_rate: body.commission_rate,
      updated_at: new Date().toISOString(),
      updated_by: session.user.email,
    }

    if (body.display_name) {
      updateData.display_name = body.display_name
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    const { data, error } = await supabase
      .from('commission_rates')
      .update(updateData)
      .eq('platform_name', body.platform_name)
      .select()
      .single()

    if (error) {
      console.error('Failed to update commission rate:', error)
      return NextResponse.json(
        { error: 'Failed to update commission rate' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      rate: data 
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/commission-rates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
