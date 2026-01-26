import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sectionType = formData.get('sectionType') as string
    
    console.log('Upload request:', { fileName: file?.name, sectionType, userId: session.user.id })
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const supabase = createServerClient()
    
    // קבל landing page ID
    const { data: landingPage } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    
    if (!landingPage) {
      return NextResponse.json({ error: 'Landing page not found. Please save settings first.' }, { status: 404 })
    }
    
    console.log('Landing page found:', landingPage.id)
    
    // יצירת נתיב ייחודי
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const filePath = `${session.user.id}/${sectionType}/${timestamp}.${fileExt}`
    
    console.log('Uploading to path:', filePath)
    
    // Convert File to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // העלאה ל-Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('landing-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: `Storage upload failed: ${uploadError.message}. Make sure 'landing-images' bucket exists and is public.` 
      }, { status: 500 })
    }
    
    console.log('Upload successful:', uploadData)
  
    // קבל URL ציבורי
    const { data: publicUrlData } = supabase
      .storage
      .from('landing-images')
      .getPublicUrl(filePath)
    
    console.log('Public URL:', publicUrlData.publicUrl)
    
    // שמור ב-DB
    const { data: imageRecord, error: dbError } = await supabase
      .from('landing_images')
      .insert({
        landing_page_id: landingPage.id,
        section_type: sectionType,
        storage_path: filePath,
        public_url: publicUrlData.publicUrl
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }
    
    console.log('Image record created:', imageRecord)
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrlData.publicUrl,
      image: imageRecord
    })
  } catch (error) {
    console.error('Upload handler error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown upload error' 
    }, { status: 500 })
  }
}

// DELETE - מחק תמונה
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const imageId = searchParams.get('id')
  
  if (!imageId) {
    return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
  }
  
  const supabase = createServerClient()
  
  // קבל את הנתונים של התמונה
  const { data: image } = await supabase
    .from('landing_images')
    .select('storage_path, landing_page_id')
    .eq('id', imageId)
    .single()
  
  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }
  
  // מחק מ-Storage
  await supabase.storage
    .from('landing-images')
    .remove([image.storage_path])
  
  // מחק מ-DB
  await supabase
    .from('landing_images')
    .delete()
    .eq('id', imageId)
  
  return NextResponse.json({ success: true })
}
