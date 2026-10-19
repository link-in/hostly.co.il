import Link from 'next/link'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { ProfileGroup, ProfileSection } from './ProfileSection'
import { ResultAlerts } from './InlineAlert'
import { TextField } from './TextField'
import { SECTION_ICONS } from './sectionIcons'
import type { FormSectionProps } from './sectionProps'
import { useReviewReminderTools } from '../hooks/useReviewReminderTools'

export function ReviewSection({ values, onChange }: FormSectionProps) {
  const Icon = SECTION_ICONS.review
  const { test, live, sendTest, sendForYesterday } = useReviewReminderTools({
    googleReviewUrl: values.googleReviewUrl,
    reviewMessageText: values.reviewMessageText,
    phoneNumber: values.phoneNumber,
  })

  return (
    <ProfileSection
      id="review"
      title="בקשת ביקורת אחרי צ'ק-אאוט"
      description="בבוקר שאחרי הצ'ק-אאוט נשלחת לאורח הודעת WhatsApp עם תודה ובקשה לכתוב ביקורת"
      icon={<Icon size={20} />}
    >
      <p className="profile-group-hint m-0">
        בהזמנה ישירה ההודעה נשלחת עם הקישור שתגדיר כאן; בהזמנה מ-Airbnb או Booking.com נשלחת תזכורת לכתוב ביקורת באפליקציה
        עצמה.{' '}
        <Link href="/dashboard/messages?tab=review" className="profile-link">
          לניהול כל הודעות ה-WhatsApp
        </Link>
      </p>

      <ProfileGroup title="תוכן ההודעה">
        <TextField
          id="profile-google-review"
          label="קישור לביקורת בגוגל"
          type="url"
          ltr
          placeholder="https://g.page/r/..."
          hint="נשלח לאורחים שהזמינו ישירות. אם נשאר ריק, ההודעה תבקש משוב בלבד ללא קישור."
          value={values.googleReviewUrl}
          onChange={(v) => onChange('googleReviewUrl', v)}
        />
        <TextField
          id="profile-review-text"
          label="הודעה מותאמת אישית"
          multiline
          rows={4}
          placeholder="השאר ריק לשימוש בנוסח ברירת המחדל..."
          hint="אפשר להשתמש ב-{guestName} וב-{propertyName}"
          value={values.reviewMessageText}
          onChange={(v) => onChange('reviewMessageText', v)}
        />
      </ProfileGroup>

      <ProfileGroup
        title="בדיקות שליחה"
        hint="הודעת בדיקה נשלחת למספר שלך בלבד ולא נוגעת בהזמנות אמיתיות. ההרצה עבור אתמול שולחת בפועל לאורחים שיצאו אתמול, כמו הריצה היומית — הזמנות שכבר נשלחו לא יישלחו שוב."
      >
        <div className="profile-actions">
          <Button
            variant="primary"
            onClick={sendTest}
            loading={test.running}
            iconStart={<MessageSquare size={15} />}
          >
            שלח הודעת בדיקה אליי
          </Button>
          <Button
            variant="secondary"
            onClick={sendForYesterday}
            loading={live.running}
            iconStart={<RefreshCw size={15} />}
          >
            הפעל שליחה עבור אתמול
          </Button>
        </div>
        <ResultAlerts message={test.result} error={test.error} />
        <ResultAlerts message={live.result} error={live.error} />
      </ProfileGroup>
    </ProfileSection>
  )
}
