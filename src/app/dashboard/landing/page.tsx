import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { redirect } from 'next/navigation'
import LandingEditor from './LandingEditor'
import { SessionProvider } from '../SessionProvider'

export const dynamic = 'force-dynamic'

export default async function LandingEditorPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/dashboard/login')
  }
  
  return (
    <SessionProvider>
      <LandingEditor />
    </SessionProvider>
  )
}
