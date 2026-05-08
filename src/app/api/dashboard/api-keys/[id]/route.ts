/**
 * Dashboard: API Key by ID
 *
 * PATCH  /api/dashboard/api-keys/[id]  — rename or toggle active status
 * DELETE /api/dashboard/api-keys/[id]  — permanently delete the key
 *
 * Body for PATCH (all fields optional):
 *   { name?: string; isActive?: boolean; allowedRoomIds?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PatchKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  allowedRoomIds: z.array(z.string()).optional(),
})

// ---------------------------------------------------------------------------
// PATCH — update name / status / allowed rooms
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, isActive, allowedRoomIds } = parsed.data

  if (name === undefined && isActive === undefined && allowedRoomIds === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (isActive !== undefined) updates.is_active = isActive
  if (allowedRoomIds !== undefined) updates.allowed_room_ids = allowedRoomIds

  const { data, error } = await supabase
    .from('api_keys')
    .update(updates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('id, name, allowed_room_ids, is_active, created_at, last_used_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    allowedRoomIds: data.allowed_room_ids ?? [],
    isActive: data.is_active,
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at ?? null,
  })
}

// ---------------------------------------------------------------------------
// DELETE — remove key permanently
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceRoleClient()

  const { error, count } = await supabase
    .from('api_keys')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
