import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Override root layout PWA metadata — embed runs inside an iframe and
  // should not trigger browser install prompts.
  manifest: undefined,
  applicationName: undefined,
  appleWebApp: undefined,
}

export default function EmbedRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ margin: 0, padding: 0, background: '#fff' }}>
      {children}
    </div>
  )
}
