'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import ArrivalMessageSection from '../messages/components/ArrivalMessageSection'

export default function ArrivalMessageClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return <DashboardLoader />
  if (!session?.user) return null

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <div className="container py-3 py-md-4">
        <div className="mb-3 mb-md-4">
          <DashboardHeader session={session} currentPage="messages" />
        </div>

        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <ArrivalMessageSection />
          </div>
        </div>
      </div>
    </main>
  )
}
