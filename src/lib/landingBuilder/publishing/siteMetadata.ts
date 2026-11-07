import type { Metadata } from 'next'
import { getCoverImage } from '../selectors'
import { buildSiteHost } from '../siteAddress'
import type { LandingDraft } from '../types'

const DESCRIPTION_MAX_LENGTH = 160

function summarize(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > DESCRIPTION_MAX_LENGTH ? `${singleLine.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…` : singleLine
}

export function buildPublishedSiteMetadata(draft: LandingDraft): Metadata {
  const title = draft.content.siteTitle || draft.content.heroTitle
  const description = summarize(draft.content.heroSubtitle || draft.content.description)
  const url = `https://${buildSiteHost(draft.siteAddress)}`
  const cover = getCoverImage(draft)

  return {
    title,
    description,
    applicationName: title,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      siteName: title,
      title,
      description,
      url,
      images: cover ? [{ url: cover.url, alt: cover.alt }] : undefined,
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description },
  }
}
