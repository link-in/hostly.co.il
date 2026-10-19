import {
  Bell,
  ClipboardCheck,
  CreditCard,
  FileText,
  Link2,
  ShieldCheck,
  Star,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import type { ProfileSectionId } from '@/lib/profile/sections'

export const SECTION_ICONS: Record<ProfileSectionId, LucideIcon> = {
  details: UserRound,
  notifications: Bell,
  channels: Link2,
  checkin: ClipboardCheck,
  review: Star,
  receipts: FileText,
  security: ShieldCheck,
  subscription: CreditCard,
}
