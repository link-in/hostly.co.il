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
        hint="ההתראות נשלחות לטלפון הראשי שמוגדר ב״פרטים אישיים״. אפשר להוסיף כאן מספר נוסף שיקבל את אותן התראות."
      >
        <div className="profile-grid">
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
