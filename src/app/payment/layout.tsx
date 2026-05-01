import { SessionProvider } from '../dashboard/SessionProvider'
import type { ReactNode } from 'react'

export default function PaymentLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
