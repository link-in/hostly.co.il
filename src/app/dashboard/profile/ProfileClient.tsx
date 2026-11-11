'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { UserRound } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader } from '@/components/ui'
import { getVisibleSections, shouldShowSubscription } from '@/lib/profile/sections'
import { ChannelsSection } from './components/ChannelsSection'
import { CheckInSection } from './components/CheckInSection'
import { DetailsSection } from './components/DetailsSection'
import { InlineAlert } from './components/InlineAlert'
import { NotificationsSection } from './components/NotificationsSection'
import { ProfileSectionNav } from './components/ProfileSectionNav'
import { ReceiptsSection } from './components/ReceiptsSection'
import { SaveBar } from './components/SaveBar'
import { SecuritySection } from './components/SecuritySection'
import { SubscriptionSection } from './components/SubscriptionSection'
import { useActiveSection } from './hooks/useActiveSection'
import { useProfileForm } from './hooks/useProfileForm'
import './profile.css'

const ProfileClient = () => {
  const { data: session } = useSession()
  const form = useProfileForm()

  const user = session?.user
  const showSubscription = shouldShowSubscription(user)
  const sections = useMemo(
    () => getVisibleSections({ hasProperty: Boolean(user?.propertyId), showSubscription }),
    [user?.propertyId, showSubscription],
  )
  const { activeId, setActiveId } = useActiveSection(sections.map((s) => s.id))

  if (!user) {
    return <DashboardLoader variant="fullscreen" label="טוען פרופיל…" />
  }

  const visible = new Set(sections.map((s) => s.id))

  return (
    <main className="profile-page" dir="rtl">
      <DashboardHeader session={session} showLandingPageButton={true} currentPage="profile" />

      <div className="container py-3 py-md-4">
        <PageHeader title="אזור אישי" subtitle={user.email ?? undefined} icon={<UserRound size={22} />} />

        <div className="profile-layout">
          <ProfileSectionNav sections={sections} activeId={activeId} onSelect={setActiveId} />

          <div className="profile-sections">
            {form.success ? <InlineAlert tone="success">{form.success}</InlineAlert> : null}

            <DetailsSection
              values={form.values}
              onChange={form.setField}
              propertyId={user.propertyId}
              roomId={user.roomId}
            />
            <NotificationsSection values={form.values} onChange={form.setField} />
            {visible.has('channels') ? <ChannelsSection /> : null}
            <CheckInSection values={form.values} onChange={form.setField} />
            <ReceiptsSection enabled />
            <SecuritySection password={form.password} onChange={form.setPasswordField} />
            {visible.has('subscription') ? <SubscriptionSection enabled /> : null}

            {form.dirty ? (
              <SaveBar saving={form.saving} error={form.error} onSave={form.save} onCancel={form.reset} />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProfileClient
