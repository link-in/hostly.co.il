import { Mail, MessageCircle, Phone } from 'lucide-react'
import {
  buildInquiryMessage,
  buildMailtoHref,
  buildWhatsAppHref,
  toTelHref,
  type InquiryDetails,
  type SiteContact,
} from '@/lib/landingBuilder/contact'
import type { BookingTheme } from './bookingTheme'

interface InquiryActionsProps {
  contact: SiteContact
  details: InquiryDetails
  theme: BookingTheme
}

const SECONDARY_LINK = 'flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800'

/** Inquiry mode: the stay is requested from the host until real checkout exists (phase 7). */
export function InquiryActions({ contact, details, theme }: InquiryActionsProps) {
  const hasDates = details.checkIn !== null && details.checkOut !== null
  const message = buildInquiryMessage(details)
  const whatsappHref = buildWhatsAppHref(contact.whatsapp, message)
  const mailHref = buildMailtoHref(contact.email, details.siteTitle, message)
  const telHref = toTelHref(contact.phone)
  const primaryHref = whatsappHref ?? mailHref
  const buttonClasses = `flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold transition ${theme.primaryButton}`

  return (
    <div className="space-y-2.5">
      {primaryHref && hasDates ? (
        <a href={primaryHref} target="_blank" rel="noreferrer" className={buttonClasses}>
          {whatsappHref ? <MessageCircle className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
          {whatsappHref ? 'שליחת בקשה בוואטסאפ' : 'שליחת בקשה במייל'}
        </a>
      ) : (
        <span aria-disabled className={`${buttonClasses} cursor-not-allowed opacity-40`}>
          {hasDates ? 'צרו קשר לבדיקת זמינות' : 'בחרו תאריכים'}
        </span>
      )}
      <div className="flex items-center justify-center gap-4">
        {telHref && (
          <a href={telHref} className={SECONDARY_LINK}>
            <Phone className="size-3.5" aria-hidden />
            התקשרו
          </a>
        )}
        {whatsappHref && mailHref && (
          <a href={mailHref} className={SECONDARY_LINK}>
            <Mail className="size-3.5" aria-hidden />
            שלחו מייל
          </a>
        )}
      </div>
      <p className="text-center text-[11px] text-slate-400">הבקשה נשלחת למארחים, שיאשרו זמינות ומחיר סופי.</p>
    </div>
  )
}
