import { buildPreviewModel } from '@/lib/landingBuilder/selectors'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import PublicSiteAvailability from './booking/PublicSiteAvailability'
import TemplateRenderer from './TemplateRenderer'
import './landing-reset.css'

/** Guest-facing page for a published wizard site; `@container` drives the templates' responsive classes. */
export default function PublishedSite({ draft }: { draft: LandingDraft }) {
  return (
    <main className="site-builder @container min-h-dvh" dir="rtl">
      <PublicSiteAvailability address={draft.siteAddress}>
        <TemplateRenderer model={buildPreviewModel(draft)} />
      </PublicSiteAvailability>
    </main>
  )
}
