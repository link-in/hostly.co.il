/**
 * GET  /api/dashboard/embed-settings  — returns current embed settings for the logged-in user
 * PATCH /api/dashboard/embed-settings  — updates embed settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('embed_settings')
    .select('payment_required')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return NextResponse.json({ paymentRequired: data?.payment_required ?? false })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { paymentRequired?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.paymentRequired !== 'boolean') {
    return NextResponse.json({ error: 'paymentRequired must be a boolean' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('embed_settings')
    .upsert(
      { user_id: session.user.id, payment_required: body.paymentRequired, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) {
    console.error('[embed-settings] upsert error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, paymentRequired: body.paymentRequired })
}
