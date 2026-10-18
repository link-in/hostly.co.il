import { PushNotificationManager } from '@/components/PushNotificationManager'
import { AdminPushTestLink } from '@/components/AdminPushTestLink'
import { ProfileGroup, ProfileSection } from './ProfileSection'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'
import type { FormSectionProps } from './sectionProps'

export function NotificationsSection({ values, onChange }: FormSectionProps) {
  const Icon = SECTION_ICONS.notifications
  return (
    <ProfileSection
      id="notifications"
      title="התראות"
      description="לאן נשלחות התראות על הזמנות, בקשות, ביטולים וסיום צ'ק-אין"
      icon={<Icon size={20} />}
    >
      <ProfileGroup title="התראה למכשיר הזה">
        <PushNotificationManager />
        <AdminPushTestLink />
      </ProfileGroup>

      <ProfileGroup
        title="התראות WhatsApp"
        hint="הכנס מספר טלפון ישראלי — המערכת ממירה אוטומטית לפורמט בינלאומי."
      >
        <div className="profile-grid">
          <TextField
            id="profile-phone"
            label="מספר WhatsApp ראשי"
            type="tel"
            ltr
            placeholder="0528676516"
            hint="המספר שמקבל את כל ההתראות"
            value={values.phoneNumber}
            onChange={(v) => onChange('phoneNumber', v)}
          />
          <TextField
            id="profile-secondary-phone"
            label="מספר נוסף (מנהל / מארח) — אופציונלי"
            type="tel"
            ltr
            placeholder="0528676516"
            hint="יקבל את אותן התראות כמו המספר הראשי"
            value={values.secondaryPhoneNumber}
            onChange={(v) => onChange('secondaryPhoneNumber', v)}
          />
        </div>
      </ProfileGroup>
    </ProfileSection>
  )
}
