import React from 'react'
import PricingDemoClient from './PricingDemoClient'
import { SessionProvider } from '../SessionProvider'

export const metadata = {
  title: 'מחשבון מחירים | Hostly',
}

const PricingDemoPage = () => {
  return (
    <SessionProvider>
      <PricingDemoClient />
    </SessionProvider>
  )
}

export default PricingDemoPage
