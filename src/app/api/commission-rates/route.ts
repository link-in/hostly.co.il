import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/commission-rates
 * Get active commission rates (for dashboard calculations)
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
      .select('platform_name, commission_rate, display_name')
      .eq('is_active', true)

    if (error) {
      console.error('Failed to fetch commission rates:', error)
      
      // Return default rates if DB fails
      return NextResponse.json({
        rates: {
          booking: 0.15,
          airbnb: 0.16,
        }
      })
    }

    // Convert array to object for easier lookup
    const ratesMap: Record<string, number> = {}
    data?.forEach((rate) => {
      ratesMap[rate.platform_name] = rate.commission_rate
    })

    return NextResponse.json({ rates: ratesMap })
  } catch (error) {
    console.error('Error in GET /api/commission-rates:', error)
    
    // Return default rates on error
    return NextResponse.json({
      rates: {
        booking: 0.15,
        airbnb: 0.16,
      }
    })
  }
}
