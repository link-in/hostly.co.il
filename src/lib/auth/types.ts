export type UserRole = 'admin' | 'owner'

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired'

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
  passwordHash: string | null
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
  beds24AccountId?: string
  checkInSettings?: CheckInSettings
  googleReviewUrl?: string
  subscriptionStatus?: SubscriptionStatus
  trialEndsAt?: string
  subscriptionPlanId?: string
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
  beds24AccountId?: string
  checkInSettings?: CheckInSettings
  googleReviewUrl?: string
  subscriptionStatus?: SubscriptionStatus
  trialEndsAt?: string
  subscriptionPlanId?: string
}

export interface UserCredentials {
  email: string
  password: string
}
