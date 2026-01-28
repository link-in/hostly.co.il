// 🧪 TEST ENVIRONMENT - Dashboard Copy for UI Experiments
// This is a copy of the main dashboard for testing new designs (especially mobile stacked lists)
// Changes here do NOT affect the production dashboard

import React from 'react'
import DashboardTestClient from './DashboardTestClient'
import { SessionProvider } from '../SessionProvider'

export const metadata = {
  title: '🧪 דשבורד בדיקה | נוף הרים בדפנה',
}

const DashboardTestPage = () => {
  return (
    <SessionProvider>
      <DashboardTestClient />
    </SessionProvider>
  )
}

export default DashboardTestPage
