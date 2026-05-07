/**
 * Dashboard: API Keys management
 *
 * GET  /api/dashboard/api-keys        — list all keys for the current user
 * POST /api/dashboard/api-keys        — create a new key
 *
 * Body for POST:
 *   { name: string; allowedRoomIds?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/availability/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
  allowedRoomIds: z.array(z.string()).optional().default([]),
})

// ---------------------------------------------------------------------------
// GET — list keys
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key, allowed_room_ids, is_active, created_at, last_used_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mask the key so only the prefix is visible in the list view
  const masked = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    keyPreview: maskKey(row.key),
    allowedRoomIds: row.allowed_room_ids ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? null,
  }))

  return NextResponse.json({ keys: masked })
}

// ---------------------------------------------------------------------------
// POST — create key
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, allowedRoomIds } = parsed.data
  const newKey = generateApiKey()

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: session.user.id,
      name,
      key: newKey,
      allowed_room_ids: allowedRoomIds,
      is_active: true,
    })
    .select('id, name, key, allowed_room_ids, is_active, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return the full key ONCE — it won't be shown again in plaintext
  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      key: data.key,
      allowedRoomIds: data.allowed_room_ids ?? [],
      isActive: data.is_active,
      createdAt: data.created_at,
    },
    { status: 201 },
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Show only the prefix: hst_live_a3f8k2...  */
function maskKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 16)}...`
}
