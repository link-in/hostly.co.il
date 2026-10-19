import type { PasswordChange } from '@/lib/profile/profileForm'
import type { PasswordFieldChange } from '../hooks/useProfileForm'
import { ProfileSection } from './ProfileSection'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'

interface SecuritySectionProps {
  password: PasswordChange
  onChange: PasswordFieldChange
}

export function SecuritySection({ password, onChange }: SecuritySectionProps) {
  const Icon = SECTION_ICONS.security
  return (
    <ProfileSection
      id="security"
      title="אבטחה"
      description="להחלפת סיסמה מלא את השדות ולחץ על שמירה. השאר ריק כדי לא לשנות."
      icon={<Icon size={20} />}
    >
      <div className="profile-grid">
        <TextField
          id="profile-current-password"
          label="סיסמה נוכחית"
          type="password"
          ltr
          fullWidth
          autoComplete="current-password"
          value={password.currentPassword}
          onChange={(v) => onChange('currentPassword', v)}
        />
        <TextField
          id="profile-new-password"
          label="סיסמה חדשה"
          type="password"
          ltr
          autoComplete="new-password"
          placeholder="לפחות 6 תווים"
          value={password.newPassword}
          onChange={(v) => onChange('newPassword', v)}
        />
        <TextField
          id="profile-confirm-password"
          label="אימות סיסמה חדשה"
          type="password"
          ltr
          autoComplete="new-password"
          value={password.confirmPassword}
          onChange={(v) => onChange('confirmPassword', v)}
        />
      </div>
    </ProfileSection>
  )
}
