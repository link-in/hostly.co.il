import type { AssistantUIMessage } from '@/lib/ai-assistant/ui/types'
import ToolPartView from './ToolPartView'

interface MessageBubbleProps {
  message: AssistantUIMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`d-flex flex-column gap-2 ${isUser ? 'align-items-start' : 'align-items-end'}`}
      data-testid={`ai-assistant-message-${message.role}`}
    >
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`
        if (part.type === 'text') {
          if (!part.text.trim()) return null
          return (
            <div
              key={key}
              className="px-3 py-2 rounded-3"
              style={{
                maxWidth: '85%',
                whiteSpace: 'pre-wrap',
                background: isUser ? 'var(--hb)' : 'var(--hsurf-2)',
                color: isUser ? '#fff' : 'var(--htxt-1)',
              }}
            >
              {part.text}
            </div>
          )
        }
        if (part.type.startsWith('tool-')) return <ToolPartView key={key} part={part} />
        return null
      })}
    </div>
  )
}
