export type UserRole = 'admin' | 'owner'

export interface CheckInSettings {
  wifi_ssid?: string
  wifi_password?: string
  property_guide_url?: string
  terms_text?: string
  liability_waiver_text?: string
  default_access_code?: string
}

export interface User {
  id: string
  email: string
  passwordHash: string
  displayName: string
  firstName?: string
  lastName?: string
  propertyId: string
  roomId: string
  landingPageUrl?: string
  phoneNumber?: string
  role: UserRole
  isDemo?: boolean
  beds24Token?: string
  beds24RefreshToken?: string
  checkInSettings?: CheckInSettings
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  firstName?: string
  lastName?: string
  propertyId: string
  roomId: string
  landingPageUrl?: string
  phoneNumber?: string
  role: UserRole
  isDemo?: boolean
  beds24Token?: string
  beds24RefreshToken?: string
  checkInSettings?: CheckInSettings
}

export interface UserCredentials {
  email: string
  password: string
}
