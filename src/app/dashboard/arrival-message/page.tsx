import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ArrivalMessagePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  // אוחד לתוך עמוד הודעות WhatsApp (HOS-22)
  redirect('/dashboard/messages')
}
