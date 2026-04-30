import type { Metadata, Viewport } from 'next'
import { Rubik } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import ServiceWorkerRegistrar from './components/ServiceWorkerRegistrar'
import PWAInstallBanner from './components/PWAInstallBanner'

const rubik = Rubik({ subsets: ['latin', 'hebrew'], variable: '--font-rubik' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#667eea' },
  ],
}

export const metadata: Metadata = {
  title: 'Hostly - מערכת ניהול נכסים',
  description: 'מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://app.hostly.co.il'),
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
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.hostly.co.il',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'Hostly - מערכת ניהול נכסים',
    description: 'מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={rubik.className} suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistrar />
        <PWAInstallBanner />
      </body>
    </html>
  )
}
