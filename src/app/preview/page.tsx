import type { Metadata } from 'next'
import PreviewLandingClient from './PreviewLandingClient'

export const metadata: Metadata = {
  title: 'Hostly - מערכת ניהול צימרים ונכסי השכרה',
  description: 'סנכרון מלא בין Airbnb, Booking והזמנות ישירות. בלי דאבל-בוקינג ובלי בלבול. מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר.',
  openGraph: {
    title: 'Hostly - מערכת ניהול צימרים ונכסי השכרה',
    description: 'סנכרון מלא בין Airbnb, Booking והזמנות ישירות. בלי דאבל-בוקינג ובלי בלבול.',
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hostly - מערכת ניהול צימרים ונכסי השכרה',
    description: 'סנכרון מלא בין Airbnb, Booking והזמנות ישירות. בלי דאבל-בוקינג ובלי בלבול.',
  },
}

export default function PreviewPage() {
  return <PreviewLandingClient />
}
