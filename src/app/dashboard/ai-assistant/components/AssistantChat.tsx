'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader } from '@/components/ui'
import { readChatErrorMessage } from '@/lib/ai-assistant/ui/chatErrors'
import type { AssistantUIMessage } from '@/lib/ai-assistant/ui/types'
import ChatComposer from './ChatComposer'
import EmptyState from './EmptyState'
import MessageBubble from './MessageBubble'

const transport = new DefaultChatTransport<AssistantUIMessage>({ api: '/api/ai-assistant/chat' })

export default function AssistantChat() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { messages, sendMessage, status, error, stop, clearError } = useChat<AssistantUIMessage>({ transport })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/')
  }, [sessionStatus, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status])

  if (sessionStatus === 'loading') return <DashboardLoader />

  const isBusy = status === 'submitted' || status === 'streaming'

  const send = (text: string) => {
    clearError()
    void sendMessage({ text })
  }

  return (
    <main className="ai-assistant-page" data-testid="ai-assistant-page" dir="rtl" style={{ minHeight: '100vh' }}>
      <div className="container py-3 py-md-4">
        <div className="mb-3 mb-md-4">
          <DashboardHeader session={session} currentPage="ai-assistant" showLandingPageButton={false} />
        </div>

        <PageHeader
          title="העוזר החכם"
          subtitle="שאלו על זמינות, בקשו לחסום תאריכים או לעדכן מחיר. כל שינוי מחכה לאישור שלכם."
          icon={<Sparkles size={22} />}
        />

        <div className="card border-0 shadow-sm hostly-dark-card d-flex flex-column" style={{ minHeight: '60vh' }}>
          <div className="card-body p-3 p-md-4 flex-grow-1 d-flex flex-column gap-3" data-testid="ai-assistant-messages">
            {messages.length === 0 ? (
              <EmptyState onPick={send} disabled={isBusy} />
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            {status === 'submitted' && (
              <div className="small" style={{ color: 'var(--htxt-3)' }} data-testid="ai-assistant-thinking">
                העוזר חושב...
              </div>
            )}

            {error && (
              <div className="alert alert-danger mb-0 py-2 small" role="alert" data-testid="ai-assistant-error">
                {readChatErrorMessage(error)}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="card-footer border-0 p-3" style={{ borderTop: '1px solid var(--hborder-light)' }}>
            <ChatComposer onSend={send} onStop={stop} isBusy={isBusy} />
          </div>
        </div>
      </div>
    </main>
  )
}
