import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - קבל את כל התוכן של דף הנחיתה
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createServerClient()
  
  // קבל את הדף הראשי
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('user_id', session.user.id)
    .single()
  
  if (!landingPage) {
    return NextResponse.json({ landingPage: null, sections: [], images: [] })
  }
  
  // קבל את כל ה-sections
  const { data: sections } = await supabase
    .from('landing_sections')
    .select('*')
    .eq('landing_page_id', landingPage.id)
    .order('order_index')
  
  // קבל את כל התמונות
  const { data: images } = await supabase
    .from('landing_images')
    .select('*')
    .eq('landing_page_id', landingPage.id)
    .order('order_index')
  
  return NextResponse.json({ 
    landingPage, 
    sections: sections || [], 
    images: images || [] 
  })
}

// POST - שמור/עדכן section או meta
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, sectionType, content, subdomain, siteTitle, siteSubtitle, metaSettings } = body
    
    console.log('Landing API POST:', { action, subdomain, userId: session.user.id })
    
    const supabase = createServerClient()
    
    // קבל/צור את הדף
    let { data: landingPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    
    // אם לא קיים דף - צור חדש
    if (!landingPage || fetchError?.code === 'PGRST116') {
      console.log('Creating new landing page...')
      
      // ודא שיש subdomain
      if (!subdomain || subdomain.trim() === '') {
        console.error('Subdomain is empty:', { subdomain })
        return NextResponse.json({ 
          error: 'יש למלא כתובת URL (subdomain) לפני שמירה' 
        }, { status: 400 })
      }
      
      // צור דף חדש
      const { data: newPage, error: createError } = await supabase
        .from('landing_pages')
        .insert({
          user_id: session.user.id,
          subdomain: subdomain,
          site_title: siteTitle || '',
          site_subtitle: siteSubtitle || '',
          meta_settings: metaSettings || {}
        })
        .select('id')
        .single()
      
      if (createError) {
        console.error('Create landing page error:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
      
      landingPage = newPage
      console.log('Landing page created:', landingPage.id)
      
      // צור sections ברירת מחדל
      try {
        const { error: rpcError } = await supabase.rpc('create_default_sections', { page_id: landingPage.id })
        if (rpcError) {
          console.error('RPC error:', rpcError)
        }
      } catch (rpcErr) {
        console.error('Failed to create default sections:', rpcErr)
        // לא נעצור - נמשיך גם בלי sections
      }
    }
  
    // עדכן section ספציפי
    if (action === 'update_section' && sectionType) {
      const { error } = await supabase
        .from('landing_sections')
        .upsert({
          landing_page_id: landingPage.id,
          section_type: sectionType,
          content
        }, {
          onConflict: 'landing_page_id,section_type'
        })
      
      if (error) {
        console.error('Update section error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    // עדכן מטא דאטה
    if (action === 'update_meta') {
      const { error } = await supabase
        .from('landing_pages')
        .update({
          site_title: siteTitle,
          site_subtitle: siteSubtitle,
          subdomain: subdomain,
          meta_settings: metaSettings
        })
        .eq('id', landingPage.id)
      
      if (error) {
        console.error('Update meta error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Landing API POST error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
