import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isAssistantEnabled } from '@/lib/ai-assistant/config'
import AssistantChat from './components/AssistantChat'

export const metadata: Metadata = {
  title: 'העוזר החכם | Hostly',
  description: 'בדיקת זמינות, חסימת תאריכים ועדכון מחירים בשיחה',
}

export const dynamic = 'force-dynamic'

export default function AiAssistantPage() {
  if (!isAssistantEnabled()) notFound()
  return <AssistantChat />
}
