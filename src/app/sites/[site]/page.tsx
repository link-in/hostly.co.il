import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LandingPageClient from './LandingPageClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ site: string }>
}

export default async function SitePage({ params }: PageProps) {
  const { site } = await params
  const supabase = createServerClient()
  
  // קבל את הדף
  const { data: landingPage, error: pageError } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('subdomain', site)
    .single()
  
  if (pageError || !landingPage) {
    notFound()
  }
  
  // קבל את כל ה-sections
  const { data: sections } = await supabase
    .from('landing_sections')
    .select('*')
    .eq('landing_page_id', landingPage.id)
    .eq('is_visible', true)
    .order('order_index')
  
  // קבל את כל התמונות
  const { data: images } = await supabase
    .from('landing_images')
    .select('*')
    .eq('landing_page_id', landingPage.id)
    .order('order_index')
  
  return (
    <LandingPageClient 
      landingPage={landingPage} 
      sections={sections || []} 
      images={images || []}
    />
  )
}
