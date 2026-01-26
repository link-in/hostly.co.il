import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hostly - מערכת ניהול נכסים',
  description: 'מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר',
  manifest: '/manifest.json',
  metadataBase: new URL('https://hostly.co.il'),
  applicationName: 'Hostly',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hostly',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Hostly',
    title: 'Hostly - מערכת ניהול נכסים',
    description: 'מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר',
    url: 'https://hostly.co.il',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'Hostly - מערכת ניהול נכסים',
    description: 'מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#667eea' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
