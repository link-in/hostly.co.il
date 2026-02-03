import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * POST /api/check-in/upload-id
 * Upload ID document photo to Supabase Storage
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const token = formData.get('token') as string
    const documentType = formData.get('documentType') as string

    if (!file || !token) {
      return NextResponse.json(
        { error: 'File and token are required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and PDF are allowed.' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verify token exists and is valid
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('id, status, expires_at')
      .eq('token', token)
      .single()

    if (checkInError || !checkIn) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    if (checkIn.status === 'completed' || checkIn.status === 'expired') {
      return NextResponse.json(
        { error: 'Check-in is already completed or expired' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${checkIn.id}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('id-documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL (even though bucket is private, we store the path)
    const { data: urlData } = supabase
      .storage
      .from('id-documents')
      .getPublicUrl(filePath)

    const fileUrl = urlData.publicUrl

    // Update check-in record with document URL and type
    const { error: updateError } = await supabase
      .from('check_ins')
      .update({
        id_document_url: fileUrl,
        id_document_type: documentType || null,
      })
      .eq('id', checkIn.id)

    if (updateError) {
      console.error('❌ Error updating check-in with document URL:', updateError)
      // Try to delete the uploaded file
      await supabase.storage.from('id-documents').remove([filePath])
      
      return NextResponse.json(
        { error: 'Failed to update check-in record' },
        { status: 500 }
      )
    }

    console.log('✅ ID document uploaded:', {
      checkInId: checkIn.id,
      fileName,
      type: documentType
    })

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
    })

  } catch (error) {
    console.error('❌ Unexpected error uploading ID document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
