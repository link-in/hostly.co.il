import { z } from 'zod'

export const CONTACT_MAX_LENGTH = { whatsapp: 20, phone: 20, email: 120 } as const
export type ContactField = keyof typeof CONTACT_MAX_LENGTH

/** Lenient on purpose: half-typed values must still save; `getInvalidContactFields` gates publishing. */
export const siteContactSchema = z.object({
  whatsapp: z.string().max(CONTACT_MAX_LENGTH.whatsapp),
  phone: z.string().max(CONTACT_MAX_LENGTH.phone),
  email: z.string().max(CONTACT_MAX_LENGTH.email),
})
export type SiteContact = z.infer<typeof siteContactSchema>

export const EMPTY_CONTACT: SiteContact = { whatsapp: '', phone: '', email: '' }

export const CONTACT_FIELD_ERRORS: Record<ContactField, string> = {
  whatsapp: 'מספר וואטסאפ לא תקין.',
  phone: 'מספר טלפון לא תקין.',
  email: 'כתובת מייל לא תקינה.',
}

export const hasContact = (contact: SiteContact) => Boolean(contact.whatsapp || contact.phone || contact.email)

const PHONE_CHARACTERS = /^\+?[0-9\-\s()]+$/
const MIN_PHONE_DIGITS = 9

const digitsOnly = (value: string) => value.replace(/\D/g, '')

function isPhoneNumber(value: string): boolean {
  return PHONE_CHARACTERS.test(value.trim()) && digitsOnly(value).length >= MIN_PHONE_DIGITS
}

/** wa.me needs the international form without "+": 050-1234567 -> 972501234567. */
export function toWhatsAppNumber(input: string): string | null {
  if (!isPhoneNumber(input)) return null
  const digits = digitsOnly(input)
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  return digits
}

/** Keeps a single leading "+" and digits, for `tel:` links. */
export function toTelHref(input: string): string | null {
  if (!isPhoneNumber(input)) return null
  return `tel:${input.trim().startsWith('+') ? '+' : ''}${digitsOnly(input)}`
}

const isEmail = (value: string) => z.email().safeParse(value.trim()).success

const CONTACT_VALIDATORS: Record<ContactField, (value: string) => boolean> = {
  whatsapp: isPhoneNumber,
  phone: isPhoneNumber,
  email: isEmail,
}

export const isValidContactValue = (field: ContactField, value: string) => value === '' || CONTACT_VALIDATORS[field](value)

/** Non-empty fields the guest-facing links could not use. */
export function getInvalidContactFields(contact: SiteContact): ContactField[] {
  return (Object.keys(CONTACT_VALIDATORS) as ContactField[]).filter((field) => !isValidContactValue(field, contact[field]))
}

export interface InquiryDetails {
  siteTitle: string
  checkIn: string | null
  checkOut: string | null
  nights: number
}

const formatIsoDay = (iso: string) => iso.split('-').reverse().join('/')

export function buildInquiryMessage({ siteTitle, checkIn, checkOut, nights }: InquiryDetails): string {
  const greeting = `שלום, אשמח לבדוק זמינות ב${siteTitle}`
  if (!checkIn || !checkOut) return `${greeting}.`
  return `${greeting} מ-${formatIsoDay(checkIn)} עד ${formatIsoDay(checkOut)} (${nights} לילות).`
}

export function buildWhatsAppHref(number: string, message: string): string | null {
  const international = toWhatsAppNumber(number)
  return international ? `https://wa.me/${international}?text=${encodeURIComponent(message)}` : null
}

export function buildMailtoHref(email: string, siteTitle: string, message: string): string | null {
  if (!isEmail(email)) return null
  const query = `subject=${encodeURIComponent(`בקשת הזמנה - ${siteTitle}`)}&body=${encodeURIComponent(message)}`
  return `mailto:${email.trim()}?${query}`
}

const legacyMetaSettingsSchema = z.looseObject({
  whatsapp_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
})

function keepIfValid(field: ContactField, value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  return trimmed.length <= CONTACT_MAX_LENGTH[field] && isValidContactValue(field, trimmed) ? trimmed : ''
}

/** Contact details from the old landing editor (`landing_pages.meta_settings`); invalid values are dropped. */
export function contactFromLegacyMeta(meta: unknown): SiteContact {
  const parsed = legacyMetaSettingsSchema.safeParse(meta)
  if (!parsed.success) return { ...EMPTY_CONTACT }
  return {
    whatsapp: keepIfValid('whatsapp', parsed.data.whatsapp_number),
    phone: keepIfValid('phone', parsed.data.phone),
    email: keepIfValid('email', parsed.data.email),
  }
}
