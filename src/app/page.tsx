import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { redirect } from 'next/navigation'
import HomeLanding from './HomeLanding'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect('/dashboard')
  }
  return <HomeLanding />
}
