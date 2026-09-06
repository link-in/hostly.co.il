/**
 * Upload / delete the house photo for the arrival-day WhatsApp automation.
 * Stores in the existing public `landing-images` bucket under
 * `{userId}/arrival/{timestamp}.{ext}`.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'
import { upsertArrivalMessageSettings } from '@/lib/db/arrivalMessages'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.isDemo) {
    return NextResponse.json({ success: true, url: '/photos/hostly-logo.png', demo: true })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filePath = `${session.user.id}/arrival/${Date.now()}.${ext}`

  const supabase = createServerClient()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('landing-images')
    .upload(filePath, buffer, { contentType: file.type, cacheControl: '3600', upsert: false })

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    )
  }

  const { data: publicUrlData } = supabase.storage.from('landing-images').getPublicUrl(filePath)
  const publicUrl = publicUrlData.publicUrl

  const { error: dbError } = await upsertArrivalMessageSettings(session.user.id, {
    photoUrl: publicUrl,
    photoStoragePath: filePath,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError }, { status: 500 })
  }

  return NextResponse.json({ success: true, url: publicUrl, storagePath: filePath })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storagePath = searchParams.get('path')

  if (storagePath) {
    const supabase = createServerClient()
    await supabase.storage.from('landing-images').remove([storagePath])
  }

  const { error } = await upsertArrivalMessageSettings(session.user.id, {
    photoUrl: null,
    photoStoragePath: null,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
