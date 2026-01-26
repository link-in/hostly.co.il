import React from 'react'
import DashboardClient from './DashboardClient'
import { SessionProvider } from './SessionProvider'

export const metadata = {
  title: 'דשבורד | נוף הרים בדפנה',
}

const DashboardPage = () => {
  return (
    <SessionProvider>
      <DashboardClient />
    </SessionProvider>
  )
}

export default DashboardPage
