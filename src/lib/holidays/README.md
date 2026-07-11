# Hebrew Holidays Integration

תכונה זו מציגה חגים יהודיים בלוח השנה של הדשבורד.

## רכיבים

### 1. Types (`types.ts`)
מגדיר את הטיפוסים:
- `Holiday` - חג בודד עם תאריך, שם עברי ואנגלי
- `HolidayCache` - מבנה הקיבוב ב-localStorage
- `HolidaysMap` - Map של חגים לפי תאריך

### 2. Hebcal Service (`hebcal.ts`)
שירות לשליפת חגים מ-Hebcal API:
- `fetchHebrewHolidays(year)` - מביא חגים לשנה מסוימת
- `getHolidaysForMonth(date)` - מחזיר רק חגים לחודש מסוים
- **קיבוב**: שומר חגים ב-localStorage ל-30 יום
- **API URL**: `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&lg=he&year=YYYY`

### 3. useHolidays Hook (`src/hooks/useHolidays.ts`)
React hook לניהול חגים:
```typescript
const { holidays, loading, error } = useHolidays(currentMonth)
```
- מחזיר `Map<string, Holiday>` לחיפוש מהיר לפי תאריך
- טוען אוטומטית כשמשנים חודש
- משתמש ב-cache כשאפשרי

### 4. HolidayIndicator Component (`src/components/HolidayIndicator.tsx`)
קומפוננטת תצוגה:
- **Desktop**: אייקון 🚩 עם tooltip ב-hover
- **Mobile**: אייקון 🚩 עם tooltip בלחיצה
- אנימציה: wave - תנועת נפנוף עדינה
- עיצוב: אייקון דגל עם drop-shadow עדין
- **מיקום**: בפינה הימנית העליונה (לא מסתיר את מספר התאריך)

## שימוש

הרכיב כבר משולב ב:
1. **CalendarPricing** (`src/app/dashboard/components/CalendarPricing.tsx`)

### דוגמת שימוש

```typescript
import { useHolidays } from '@/hooks/useHolidays'
import HolidayIndicator from '@/components/HolidayIndicator'

function MyCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { holidays } = useHolidays(currentMonth)
  
  const holiday = holidays.get('2026-02-02') // Tu BiShvat
  
  return (
    <div style={{ position: 'relative' }}>
      {holiday && <HolidayIndicator holiday={holiday} />}
    </div>
  )
}
```

## Cache

החגים נשמרים ב-localStorage עם המפתח:
```
hebcal_holidays_2026
```

Cache תקף ל-30 יום. אחרי התקופה הזאת יבוצע fetch חדש.

## Responsive Design

- **Desktop (>768px)**: Tooltip מוצג ב-hover
- **Mobile (≤768px)**: Tooltip מוצג בלחיצה

## עיצוב האינדיקטור

- **אייקון**: 🚩 (red flag emoji)
- **מיקום**: פינה ימנית עליונה (לא מסתיר את מספר התאריך)
- **אנימציה**: wave - תנועת נפנוף עדינה
- **אפקט**: drop-shadow עדין
- **גודל**: 14px

## חגים נתמכים

החגים מסופקים על ידי [Hebcal.com](https://www.hebcal.com):
- חגים מג'ורים (ראש השנה, יום כיפור, פסח, שבועות, סוכות, וכו')
- חגים מינוריים (ט"ו בשבט, פורים, חנוכה, וכו')
- שמות בעברית ובאנגלית

## טיפול בשגיאות

אם ה-API נכשל:
- הפונקציה מחזירה מערך ריק
- לא מוצגת שגיאה למשתמש
- נרשם log לקונסול
- הלוח ממשיך לעבוד כרגיל ללא האינדיקטורים
