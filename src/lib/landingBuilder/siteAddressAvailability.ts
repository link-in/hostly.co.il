import { SITE_ADDRESS_ERROR_MESSAGES, validateSiteAddress } from './siteAddress'

export type SiteAddressStatus = 'available' | 'yours' | 'taken' | 'invalid'

export interface SiteAddressCheck {
  status: SiteAddressStatus
  message: string
}

export const SITE_ADDRESS_STATUS_MESSAGES: Record<Exclude<SiteAddressStatus, 'invalid'>, string> = {
  available: 'הכתובת פנויה.',
  yours: 'זו הכתובת הנוכחית של האתר שלך.',
  taken: 'הכתובת כבר תפוסה. נסו כתובת אחרת.',
}

export async function checkSiteAddress(
  address: string,
  userId: string,
  findOwner: (address: string) => Promise<string | null>,
): Promise<SiteAddressCheck> {
  const error = validateSiteAddress(address)
  if (error) return { status: 'invalid', message: SITE_ADDRESS_ERROR_MESSAGES[error] }

  const owner = await findOwner(address)
  const status = owner === null ? 'available' : owner === userId ? 'yours' : 'taken'
  return { status, message: SITE_ADDRESS_STATUS_MESSAGES[status] }
}
