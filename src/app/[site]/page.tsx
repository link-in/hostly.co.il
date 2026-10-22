import { cache } from 'react'
import { notFound } from 'next/navigation'
import PublishedSite from '@/components/landing-templates/PublishedSite'
import { findPublishedDraft } from '@/lib/landingBuilder/persistence/findPublishedDraft'
import { buildPublishedSiteMetadata } from '@/lib/landingBuilder/publishing/siteMetadata'
import { createServerClient } from '@/lib/supabase/server'
import LandingPageClient from './LandingPageClient'

interface PageProps {
  params: Promise<{ site: string }>
}

export const dynamic = 'force-dynamic'

const getPublishedDraft = cache(findPublishedDraft)

export default async function SitePage({ params }: PageProps) {
  const { site } = await params
  const publishedDraft = await getPublishedDraft(site)
  if (publishedDraft) return <PublishedSite draft={publishedDraft} />

  const supabase = createServerClient()
  
  // Fetch landing page content
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select(`
      *,
      sections:landing_sections(*),
      images:landing_images(*)
    `)
    .eq('subdomain', site)
    .single()
  
  if (error || !landingPage) {
    notFound()
  }
  
  return <LandingPageClient landingPage={landingPage} />
}

export async function generateMetadata({ params }: PageProps) {
  const { site } = await params
  const publishedDraft = await getPublishedDraft(site)
  if (publishedDraft) return buildPublishedSiteMetadata(publishedDraft)

  const supabase = createServerClient()
  
  const { data } = await supabase
    .from('landing_pages')
    .select('site_title, site_subtitle')
    .eq('subdomain', site)
    .single()
  
  return {
    title: data?.site_title || site,
    description: data?.site_subtitle || '',
  }
}
