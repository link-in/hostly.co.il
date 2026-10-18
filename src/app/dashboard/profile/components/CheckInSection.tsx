import { ProfileGroup, ProfileSection } from './ProfileSection'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'
import type { FormSectionProps } from './sectionProps'

export function CheckInSection({ values, onChange }: FormSectionProps) {
  const Icon = SECTION_ICONS.checkin
  return (
    <ProfileSection
      id="checkin"
      title="צ'ק-אין דיגיטלי"
      description="אם לא תמלא פרטים, ייעשה שימוש בברירות מחדל"
      icon={<Icon size={20} />}
    >
      <ProfileGroup title="פרטי כניסה לאורח" hint="הפרטים נשלחים לאורח אוטומטית אחרי שמילא צ'ק-אין.">
        <div className="profile-grid">
          <TextField
            id="profile-wifi-ssid"
            label="שם רשת WiFi (SSID)"
            placeholder="שם הרשת שלך"
            value={values.wifiSsid}
            onChange={(v) => onChange('wifiSsid', v)}
          />
          <TextField
            id="profile-wifi-password"
            label="סיסמת WiFi"
            placeholder="סיסמת הרשת שלך"
            value={values.wifiPassword}
            onChange={(v) => onChange('wifiPassword', v)}
          />
          <TextField
            id="profile-access-code"
            label="קוד כניסה ברירת מחדל"
            ltr
            placeholder="1234 או #1234*"
            hint="קוד קבוע למנעול הדירה (אם לא משתמשים בקודים דינמיים)"
            value={values.defaultAccessCode}
            onChange={(v) => onChange('defaultAccessCode', v)}
          />
          <TextField
            id="profile-guide-url"
            label="קישור למדריך הנכס"
            type="url"
            ltr
            placeholder="https://drive.google.com/..."
            hint="PDF, Google Drive או כל קישור אחר"
            value={values.propertyGuideUrl}
            onChange={(v) => onChange('propertyGuideUrl', v)}
          />
        </div>
      </ProfileGroup>

      <ProfileGroup title="תנאים ואחריות" hint="השאר ריק לשימוש בנוסח המשפטי המלא (מומלץ).">
        <TextField
          id="profile-terms"
          label="תנאי אירוח מותאמים אישית"
          multiline
          rows={5}
          placeholder="השאר ריק לשימוש בתנאי ברירת מחדל, או כתוב תנאים בפורמט HTML..."
          hint="תנאים שתכתוב יוצגו במקום תנאי ברירת המחדל"
          value={values.termsText}
          onChange={(v) => onChange('termsText', v)}
        />
        <TextField
          id="profile-waiver"
          label="כתב ויתור אחריות מותאם אישית"
          multiline
          rows={5}
          placeholder="השאר ריק לשימוש בכתב ברירת מחדל..."
          hint="יופיע בטופס הצ'ק-אין"
          value={values.liabilityWaiverText}
          onChange={(v) => onChange('liabilityWaiverText', v)}
        />
      </ProfileGroup>
    </ProfileSection>
  )
}
