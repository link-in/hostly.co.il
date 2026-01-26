import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/subscriptions - Get all subscriptions with user and plan details
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    
    // Get all subscriptions
    const { data: subscriptionsData, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (subsError) {
      console.error('❌ Failed to fetch subscriptions:', subsError)
      console.error('Supabase error details:', JSON.stringify(subsError, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to fetch subscriptions', 
          details: subsError.message,
          hint: 'Have you run the SQL migration in Supabase? Check BILLING_SETUP.md'
        },
        { status: 500 }
      )
    }

    // Get all users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name')
    
    const usersMap = new Map(
      (usersData || []).map(u => [u.id, u])
    )

    // Get all plans
    const { data: plansData, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id, display_name, monthly_price, max_whatsapp_per_month')
    
    const plansMap = new Map(
      (plansData || []).map(p => [p.id, p])
    )

    // Get current month for usage stats
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    // Get usage stats for all users
    const { data: usageData, error: usageError } = await supabase
      .from('usage_stats')
      .select('user_id, whatsapp_sent')
      .eq('month', currentMonth)

    const usageMap = new Map(
      (usageData || []).map(u => [u.user_id, u.whatsapp_sent])
    )

    // Map to response format
    const subscriptions = subscriptionsData.map((sub: any) => {
      const user = usersMap.get(sub.user_id)
      const plan = plansMap.get(sub.plan_id)
      
      return {
        id: sub.id,
        userId: sub.user_id,
        planId: sub.plan_id,
        status: sub.status,
        billingCycle: sub.billing_cycle,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        autoRenew: sub.auto_renew,
        user: {
          displayName: user?.display_name || 'Unknown User',
          email: user?.email || 'N/A',
        },
        plan: {
          displayName: plan?.display_name || 'Unknown Plan',
          monthlyPrice: plan?.monthly_price || 0,
        },
        usage: {
          whatsappSent: usageMap.get(sub.user_id) || 0,
          whatsappLimit: plan?.max_whatsapp_per_month || 0,
        },
      }
    })

    // Calculate stats
    const stats = {
      totalRevenue: subscriptions
        .filter((s: any) => s.status === 'active')
        .reduce((sum: number, s: any) => sum + Number(s.plan.monthlyPrice), 0),
      activeSubscriptions: subscriptions.filter((s: any) => s.status === 'active').length,
      trialSubscriptions: subscriptions.filter((s: any) => s.status === 'trial').length,
      expiredSubscriptions: subscriptions.filter((s: any) => s.status === 'expired').length,
    }

    return NextResponse.json({ subscriptions, stats })
  } catch (error) {
    console.error('Error in GET /api/admin/subscriptions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
