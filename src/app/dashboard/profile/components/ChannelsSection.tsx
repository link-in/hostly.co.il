import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui'
import { InlineAlert } from './InlineAlert'
import { ProfileSection } from './ProfileSection'
import { SECTION_ICONS } from './sectionIcons'
import { useAirbnbConnect } from '../hooks/useAirbnbConnect'

export function ChannelsSection() {
  const Icon = SECTION_ICONS.channels
  const { linking, error, opened, connect } = useAirbnbConnect()

  return (
    <ProfileSection
      id="channels"
      title="חיבור Airbnb"
      description="חיבור הנכס לחשבון Airbnb דרך Beds24"
      icon={<Icon size={20} />}
    >
      <div className="profile-row profile-row--warm">
        <div>
          <div className="profile-row-title">חיבור חשבון Airbnb</div>
          <div className="profile-row-text">יפתח דף הרשאה של Airbnb בחלון חדש</div>
        </div>
        <Button
          variant="primary"
          className="profile-cta"
          onClick={connect}
          loading={linking}
          iconStart={<ExternalLink size={15} />}
        >
          {linking ? 'מחפש קישור…' : 'חבר Airbnb'}
        </Button>
      </div>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {opened ? (
        <InlineAlert tone="success">
          נפתח דף ההרשאה של Airbnb. לאחר אישור, הנכס יהיה מחובר אוטומטית.
        </InlineAlert>
      ) : null}
    </ProfileSection>
  )
}
