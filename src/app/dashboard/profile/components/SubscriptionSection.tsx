'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import {
  billingCycleLabel,
  expiryLabel,
  formatHebrewDate,
  isTrialEndingSoon,
  subscriptionStatusView,
} from '@/lib/profile/subscriptionView'
import { InlineAlert, ResultAlerts } from './InlineAlert'
import { ProfileSection } from './ProfileSection'
import { SECTION_ICONS } from './sectionIcons'
import { useSubscription, type SubscriptionInfo } from '../hooks/useSubscription'

function SubscriptionFacts({ subscription }: { subscription: SubscriptionInfo }) {
  const view = subscriptionStatusView(subscription.status)
  const plan = billingCycleLabel(subscription.billingCycle)
  const expires = formatHebrewDate(subscription.expiresAt)
  const endingSoon = isTrialEndingSoon(subscription.status, subscription.daysRemaining)

  return (
    <div className="profile-facts">
      <div>
        <div className="profile-fact-label">סטטוס</div>
        <span className={`profile-badge profile-badge--${view.tone}`}>{view.label}</span>
      </div>
      {plan ? (
        <div>
          <div className="profile-fact-label">תוכנית</div>
          <div className="profile-fact-value">{plan}</div>
        </div>
      ) : null}
      {expires ? (
        <div>
          <div className="profile-fact-label">{expiryLabel(subscription.status)}</div>
          <div className="profile-fact-value">{expires}</div>
        </div>
      ) : null}
      {subscription.status === 'trial' ? (
        <div>
          <div className="profile-fact-label">ימים שנותרו</div>
          <div className={`profile-fact-value${endingSoon ? ' profile-fact-value--danger' : ''}`}>
            {subscription.daysRemaining} ימים
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SubscriptionSection({ enabled }: { enabled: boolean }) {
  const Icon = SECTION_ICONS.subscription
  const router = useRouter()
  const sub = useSubscription(enabled)
  const goToPricing = () => router.push('/dashboard/pricing')
  const info = sub.subscription
  const accessUntil = formatHebrewDate(info?.expiresAt ?? null) ?? 'תאריך הפקיעה'

  return (
    <ProfileSection id="subscription" title="מנוי" description="סטטוס המנוי והחיוב" icon={<Icon size={20} />}>
      {sub.loading ? <div className="profile-field-hint">טוען פרטי מנוי…</div> : null}
      {!sub.loading && !info ? <div className="profile-field-hint">לא נמצא מנוי פעיל</div> : null}

      {info ? (
        <>
          <SubscriptionFacts subscription={info} />

          <div className="profile-actions">
            {info.status === 'trial' || info.status === 'expired' ? (
              <Button variant="primary" className="profile-cta" onClick={goToPricing}>
                שדרג עכשיו
              </Button>
            ) : null}
            {info.status === 'cancelled' ? (
              <Button variant="primary" className="profile-cta" onClick={goToPricing}>
                חדש מנוי
              </Button>
            ) : null}
            {info.status === 'active' && !sub.confirmingCancel ? (
              <Button variant="secondary" className="profile-btn-danger-outline" onClick={sub.askToCancel}>
                ביטול מנוי
              </Button>
            ) : null}
          </div>

          {sub.confirmingCancel && info.status === 'active' ? (
            <div className="profile-row profile-row--warm">
              <div>
                <div className="profile-row-title">לבטל את המנוי?</div>
                <div className="profile-row-text">תוכל להמשיך להשתמש במערכת עד {accessUntil}.</div>
              </div>
              <div className="profile-actions">
                <Button
                  variant="secondary"
                  className="profile-btn-danger-solid"
                  onClick={sub.cancel}
                  loading={sub.cancelling}
                >
                  {sub.cancelling ? 'מבטל…' : 'כן, בטל מנוי'}
                </Button>
                <Button variant="ghost" onClick={sub.dismissCancel} disabled={sub.cancelling}>
                  חזור
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ResultAlerts message={sub.message} error={sub.error} />
      {info?.status === 'cancelled' && !sub.message ? (
        <InlineAlert tone="info">המנוי בוטל. הגישה למערכת נשארת עד {accessUntil}.</InlineAlert>
      ) : null}
    </ProfileSection>
  )
}
