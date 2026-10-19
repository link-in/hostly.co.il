'use client'

import { SessionProvider } from 'next-auth/react'
import '../dashboard/dashboard-surfaces.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div 
        className="min-vh-100 hostly-admin-root"
        style={{ 
          background: 'var(--hn-50)',
        }}
      >
        {children}
      </div>
    </SessionProvider>
  )
}
