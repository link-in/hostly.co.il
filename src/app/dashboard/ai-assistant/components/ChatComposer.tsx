'use client'

import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizontal, Square } from 'lucide-react'
import { Button } from '@/components/ui'

const MAX_CHARS = 2000
const ACTION_BUTTON_STYLE = { minWidth: 104, fontSize: '1rem' }

interface ChatComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  isBusy: boolean
}

export default function ChatComposer({ onSend, onStop, isBusy }: ChatComposerProps) {
  const [text, setText] = useState('')
  const trimmed = text.trim()

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!trimmed || isBusy) return
    onSend(trimmed)
    setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
  }

  return (
    <form className="d-flex align-items-stretch gap-2" onSubmit={submit} data-testid="ai-assistant-composer">
      <textarea
        className="form-control"
        rows={2}
        maxLength={MAX_CHARS}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="למשל: מה פנוי בסופ״ש הבא?"
        aria-label="הודעה לעוזר"
        style={{ resize: 'none' }}
        data-testid="ai-assistant-input"
      />
      {isBusy ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onStop}
          iconStart={<Square size={18} />}
          style={ACTION_BUTTON_STYLE}
          aria-label="עצור"
        >
          עצור
        </Button>
      ) : (
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!trimmed}
          iconStart={<SendHorizontal size={20} style={{ transform: 'scaleX(-1)' }} />}
          style={ACTION_BUTTON_STYLE}
          data-testid="ai-assistant-send"
        >
          שלח
        </Button>
      )}
    </form>
  )
}
