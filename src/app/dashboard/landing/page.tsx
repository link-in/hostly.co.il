import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { redirect } from 'next/navigation'
import { LANDING_EDITOR_ENABLED } from '@/lib/dashboard/landingEditor'
import LandingEditor from './LandingEditor'

export const dynamic = 'force-dynamic'

export default async function LandingEditorPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/')
  }

  // HOS-17 — הסתרה זמנית של עמוד ניהול דפי הנחיתה
  if (!LANDING_EDITOR_ENABLED) {
    redirect('/dashboard')
  }
  
  return <LandingEditor />
}
