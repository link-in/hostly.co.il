import type { CampaignContent } from '@/lib/promotions/domain/types'
import { buildAdMessage } from '@/lib/promotions/publishing/meta/adMessage'

const CTA_LABELS: Record<CampaignContent['callToAction'], string> = {
  BOOK_TRAVEL: 'להזמנה',
  LEARN_MORE: 'למידע נוסף',
}

interface AdPreviewProps {
  content: CampaignContent
  imageUrl: string | null
  pageName: string
  linkHost: string
}

/** Approximation of a Facebook/Instagram feed ad, so the host sees what will be published. */
export default function AdPreview({ content, imageUrl, pageName, linkHost }: AdPreviewProps) {
  return (
    <div className="ad-preview" data-testid="promotions-ad-preview">
      <div className="ad-preview-header">
        <strong>{pageName}</strong>
        <div className="promotions-muted" style={{ fontSize: 11 }}>
          ממומן
        </div>
      </div>
      <div className="ad-preview-text">{buildAdMessage(content)}</div>
      {imageUrl ? (
        <img className="ad-preview-image" src={imageUrl} alt="" />
      ) : (
        <div className="ad-preview-image" />
      )}
      <div className="ad-preview-footer">
        <div style={{ minWidth: 0 }}>
          <div className="promotions-muted" style={{ fontSize: 11, direction: 'ltr', textAlign: 'right' }}>
            {linkHost}
          </div>
          <strong style={{ fontSize: 14 }}>{content.headline}</strong>
          {content.description && <div className="promotions-muted">{content.description}</div>}
        </div>
        <span className="ad-preview-cta">{CTA_LABELS[content.callToAction]}</span>
      </div>
    </div>
  )
}
