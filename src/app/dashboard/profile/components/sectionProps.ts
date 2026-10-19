import type { ProfileFormValues } from '@/lib/profile/profileForm'
import type { ProfileFieldChange } from '../hooks/useProfileForm'

/** props משותפים למקטעים שעורכים שדות בטופס הראשי. */
export interface FormSectionProps {
  values: ProfileFormValues
  onChange: ProfileFieldChange
}
