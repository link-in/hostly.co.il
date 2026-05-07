/**
 * Admin: API Keys management for any user
 *
 * GET  /api/admin/api-keys?userId=<id>   — list all keys for a specific user
 * POST /api/admin/api-keys               — create a key on behalf of a user
 *
 * Body for POST: { userId: string; name: string; allowedRoomIds?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/availability/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') return null
  return session
}

const CreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  allowedRoomIds: z.array(z.string()).optional().default([]),
})

export async function GET(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key, allowed_room_ids, is_active, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const keys = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    keyPreview: `${row.key.slice(0, 16)}...`,
    allowedRoomIds: row.allowed_room_ids ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? null,
  }))

  return NextResponse.json({ keys })
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { userId, name, allowedRoomIds } = parsed.data
  const newKey = generateApiKey()
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: userId, name, key: newKey, allowed_room_ids: allowedRoomIds, is_active: true })
    .select('id, name, key, allowed_room_ids, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { id: data.id, name: data.name, key: data.key, allowedRoomIds: data.allowed_room_ids ?? [], isActive: data.is_active, createdAt: data.created_at },
    { status: 201 },
  )
}
