import { Lock } from 'lucide-react'
import { ProfileGroup, ProfileSection } from './ProfileSection'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'
import type { FormSectionProps } from './sectionProps'

interface DetailsSectionProps extends FormSectionProps {
  propertyId: string
  roomId: string
}

export function DetailsSection({ values, onChange, propertyId, roomId }: DetailsSectionProps) {
  const Icon = SECTION_ICONS.details
  return (
    <ProfileSection
      id="details"
      title="פרטים אישיים"
      description="שם, אימייל ופרטי הנכס שלך"
      icon={<Icon size={20} />}
    >
      <div className="profile-grid">
        <TextField
          id="profile-display-name"
          label="שם תצוגה"
          value={values.displayName}
          onChange={(v) => onChange('displayName', v)}
        />
        <TextField
          id="profile-email"
          label="אימייל"
          type="email"
          ltr
          value={values.email}
          onChange={(v) => onChange('email', v)}
        />
        <TextField
          id="profile-phone"
          label="טלפון (WhatsApp להתראות)"
          type="tel"
          ltr
          placeholder="0528676516"
          hint="לכאן נשלחות התראות על הזמנות חדשות. מספר ישראלי — מומר אוטומטית לפורמט בינלאומי."
          value={values.phoneNumber}
          onChange={(v) => onChange('phoneNumber', v)}
        />
        <TextField
          id="profile-landing-url"
          label="כתובת דף נחיתה"
          type="url"
          ltr
          fullWidth
          placeholder="https://example.com"
          hint="כתובת ה-URL של דף הנחיתה של היחידה"
          value={values.landingPageUrl}
          onChange={(v) => onChange('landingPageUrl', v)}
        />
      </div>

      <ProfileGroup
        title="פרטי הנכס"
        hint="מזהים אלו מקושרים ל-Beds24 ולכן אי אפשר לערוך אותם כאן."
      >
        <div className="profile-grid">
          <TextField id="profile-property-id" label="Property ID" ltr readOnly value={propertyId} />
          <TextField id="profile-room-id" label="Room ID" ltr readOnly value={roomId} />
        </div>
        <span className="profile-field-hint d-inline-flex align-items-center gap-1">
          <Lock size={12} /> לשינוי פנה לתמיכה
        </span>
      </ProfileGroup>
    </ProfileSection>
  )
}
