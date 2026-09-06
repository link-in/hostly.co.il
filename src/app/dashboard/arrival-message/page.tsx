import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { redirect } from 'next/navigation'
import ArrivalMessageClient from './ArrivalMessageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ArrivalMessagePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <ArrivalMessageClient />
}
