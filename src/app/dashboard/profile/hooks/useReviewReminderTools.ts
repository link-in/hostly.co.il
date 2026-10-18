'use client'

import { useCallback, useState } from 'react'

interface ReviewReminderInput {
  googleReviewUrl: string
  reviewMessageText: string
  phoneNumber: string
}

interface ActionState {
  running: boolean
  result: string | null
  error: string | null
}

const IDLE: ActionState = { running: false, result: null, error: null }

async function postJson(url: string, body: unknown, fallbackError: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? fallbackError)
  return data
}

/** שתי פעולות בדיקה לבקשת הביקורת: הודעת תצוגה מקדימה לעצמך, והרצה אמיתית עבור אתמול. */
export function useReviewReminderTools({ googleReviewUrl, reviewMessageText, phoneNumber }: ReviewReminderInput) {
  const [test, setTest] = useState<ActionState>(IDLE)
  const [live, setLive] = useState<ActionState>(IDLE)

  const sendTest = useCallback(async () => {
    setTest({ running: true, result: null, error: null })
    try {
      await postJson(
        '/api/dashboard/review-reminders/test-send',
        {
          channel: 'direct',
          googleReviewUrl: googleReviewUrl.trim() || undefined,
          reviewMessageText: reviewMessageText.trim() || undefined,
        },
        'שליחת הודעת הבדיקה נכשלה',
      )
      setTest({
        running: false,
        result: `הודעת בדיקה נשלחה למספר שלך (${phoneNumber || 'המספר בפרופיל'})`,
        error: null,
      })
    } catch (err) {
      setTest({ running: false, result: null, error: err instanceof Error ? err.message : 'שגיאה לא ידועה' })
    }
  }, [googleReviewUrl, reviewMessageText, phoneNumber])

  const sendForYesterday = useCallback(async () => {
    setLive({ running: true, result: null, error: null })
    try {
      const data = await postJson('/api/dashboard/review-reminders/send-now', {}, 'השליחה נכשלה')
      setLive({
        running: false,
        result: `נבדקו ${data.bookingsFound} הזמנות ל-${data.date}: ${data.sent} נשלחו, ${data.skipped} דולגו (כבר נשלחו/אין טלפון), ${data.failed} נכשלו`,
        error: null,
      })
    } catch (err) {
      setLive({ running: false, result: null, error: err instanceof Error ? err.message : 'שגיאה לא ידועה' })
    }
  }, [])

  return { test, live, sendTest, sendForYesterday }
}
