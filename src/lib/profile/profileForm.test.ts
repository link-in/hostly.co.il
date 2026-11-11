import { describe, expect, it } from 'vitest'
import {
  EMPTY_PASSWORD_CHANGE,
  buildSessionPatch,
  buildUpdateProfileRequest,
  hasPasswordInput,
  isProfileDirty,
  profileFormFromUser,
  trimProfileForm,
  validateProfileSubmission,
} from './profileForm'

const user = {
  displayName: 'רותם',
  email: 'rotem@example.com',
  phoneNumber: '+972524892229',
  checkInSettings: { wifi_ssid: 'Hostly', default_access_code: '1234' },
}

describe('profileFormFromUser', () => {
  it('maps session fields and check-in settings, defaulting to empty strings', () => {
    const form = profileFormFromUser(user)
    expect(form.displayName).toBe('רותם')
    expect(form.wifiSsid).toBe('Hostly')
    expect(form.defaultAccessCode).toBe('1234')
    expect(form.secondaryPhoneNumber).toBe('')
    expect(form.termsText).toBe('')
  })

  it('returns an empty form when there is no user', () => {
    expect(profileFormFromUser(undefined).displayName).toBe('')
  })
})

describe('isProfileDirty', () => {
  it('is false for identical values and true after any change', () => {
    const base = profileFormFromUser(user)
    expect(isProfileDirty({ ...base }, base)).toBe(false)
    expect(isProfileDirty({ ...base, wifiSsid: 'Other' }, base)).toBe(true)
  })
})

describe('trimProfileForm', () => {
  it('trims every field', () => {
    const trimmed = trimProfileForm({ ...profileFormFromUser(user), displayName: '  רותם  ' })
    expect(trimmed.displayName).toBe('רותם')
  })
})

describe('validateProfileSubmission', () => {
  const values = profileFormFromUser(user)

  it('accepts a valid form without password change', () => {
    expect(validateProfileSubmission(values, EMPTY_PASSWORD_CHANGE)).toBeNull()
  })

  it('requires a display name', () => {
    expect(validateProfileSubmission({ ...values, displayName: '   ' }, EMPTY_PASSWORD_CHANGE)).toBe('יש להזין שם תצוגה')
  })

  it('requires the current password when changing the password', () => {
    expect(
      validateProfileSubmission(values, { currentPassword: '', newPassword: 'abcdef', confirmPassword: 'abcdef' }),
    ).toBe('יש להזין את הסיסמה הנוכחית')
  })

  it('rejects mismatched confirmation', () => {
    expect(
      validateProfileSubmission(values, { currentPassword: 'old', newPassword: 'abcdef', confirmPassword: 'abcdeg' }),
    ).toBe('הסיסמאות אינן תואמות')
  })

  it('rejects short new passwords', () => {
    expect(
      validateProfileSubmission(values, { currentPassword: 'old', newPassword: 'abc', confirmPassword: 'abc' }),
    ).toBe('סיסמה חדשה חייבת להכיל לפחות 6 תווים')
  })

  it('accepts a valid password change', () => {
    expect(
      validateProfileSubmission(values, { currentPassword: 'old', newPassword: 'abcdef', confirmPassword: 'abcdef' }),
    ).toBeNull()
  })
})

describe('hasPasswordInput', () => {
  it('detects any password field being filled', () => {
    expect(hasPasswordInput(EMPTY_PASSWORD_CHANGE)).toBe(false)
    expect(hasPasswordInput({ ...EMPTY_PASSWORD_CHANGE, newPassword: 'x' })).toBe(true)
  })
})

describe('buildUpdateProfileRequest', () => {
  const values = { ...profileFormFromUser(user), displayName: ' רותם ' }

  it('trims values and nests check-in settings', () => {
    const body = buildUpdateProfileRequest(values, EMPTY_PASSWORD_CHANGE)
    expect(body.displayName).toBe('רותם')
    expect(body.checkInSettings.wifi_ssid).toBe('Hostly')
  })

  it('does not send review-reminder settings (managed in the WhatsApp messages area)', () => {
    const body = buildUpdateProfileRequest(values, EMPTY_PASSWORD_CHANGE)
    expect(body).not.toHaveProperty('googleReviewUrl')
    expect(body).not.toHaveProperty('reviewMessageText')
    expect(buildSessionPatch(values)).not.toHaveProperty('googleReviewUrl')
  })

  it('omits password fields when the password is not being changed', () => {
    expect(buildUpdateProfileRequest(values, EMPTY_PASSWORD_CHANGE)).not.toHaveProperty('newPassword')
  })

  it('includes current and new password when changing it', () => {
    const body = buildUpdateProfileRequest(values, {
      currentPassword: 'old',
      newPassword: 'abcdef',
      confirmPassword: 'abcdef',
    })
    expect(body).toMatchObject({ currentPassword: 'old', newPassword: 'abcdef' })
    expect(body).not.toHaveProperty('confirmPassword')
  })
})

describe('buildSessionPatch', () => {
  it('never leaks email or password data into the session', () => {
    const patch = buildSessionPatch(profileFormFromUser(user))
    expect(patch).not.toHaveProperty('email')
    expect(patch).not.toHaveProperty('newPassword')
    expect(patch.phoneNumber).toBe('+972524892229')
  })
})
