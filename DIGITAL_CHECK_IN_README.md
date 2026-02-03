# מערכת צ'ק-אין דיגיטלי - Hostly

## סקירה

מערכת צ'ק-אין דיגיטלי מתקדמת המאפשרת לאורחים להשלים תהליך צ'ק-אין מרחוק, כולל:
- ✅ מילוי פרטים אישיים
- ✅ העלאת תמונת תעודת זהות/דרכון
- ✅ חתימה דיגיטלית על תנאי אירוח
- ✅ קבלת קוד כניסה ומדריך לנכס
- ✅ התראות WhatsApp אוטומטיות

## הגדרת המערכת

### 1. הרצת Migrations

הרץ את קובצי ה-SQL הבאים בסדר ב-Supabase SQL Editor:

```sql
-- 1. יצירת טבלת check_ins
\i supabase-migrations/014_create_check_ins_table.sql

-- 2. הוספת הגדרות צ'ק-אין לטבלת users
\i supabase-migrations/015_add_check_in_settings_to_users.sql

-- 3. יצירת Storage bucket לתעודות זהות
\i supabase-migrations/016_create_id_documents_storage_bucket.sql
```

**חשוב:** אם Storage bucket כבר קיים או שאתה מקבל שגיאת permission, הרץ ידנית:
1. עבור ל-Storage בפאנל Supabase
2. צור bucket בשם `id-documents` (private)
3. הוסף את ה-policies מקובץ 016

### 2. התקנת תלויות

```bash
npm install
```

התלויות החדשות שנוספו:
- `react-signature-canvas` - לחתימה דיגיטלית
- `jspdf` + `jspdf-autotable` - ליצירת PDF (עתידי)
- `date-fns` - לטיפול בתאריכים

### 3. הגדרת משתני סביבה

ודא שקיימים ב-`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=http://localhost:3000  # או הדומיין שלך
NEXTAUTH_SECRET=your_secret
```

### 4. הרצת השרת

```bash
npm run dev
```

## זרימת העבודה

### יצירת הזמנה חדשה

כאשר בעל נכס יוצר הזמנה חדשה:

1. **אוטומטית נוצר רשומת צ'ק-אין** עם טוקן ייחודי
2. **נשלח WhatsApp לאורח** עם קישור לצ'ק-אין:
   ```
   שלום [שם האורח]! 🏔️
   
   קיבלנו את הזמנתך ב-[שם הנכס].
   📅 תאריך כניסה: [תאריך]
   📅 תאריך יציאה: [תאריך]
   
   🔗 אנא השלם/י צ'ק-אין דיגיטלי (לוקח 3 דקות):
   [קישור]
   
   נשמח לארח אותך! 🎉
   ```

### תהליך הצ'ק-אין לאורח

האורח פותח את הקישור ועובר 4 שלבים:

**שלב 1: ברוכים הבאים**
- הצגת פרטי ההזמנה
- תאריכי כניסה/יציאה
- כפתור התחלה

**שלב 2: פרטים אישיים**
- סוג תעודה (ת.ז / דרכון / רישיון)
- מספר תעודה
- תאריך לידה
- **העלאת תמונת תעודה** (מצלמה או קובץ)
- כתובת מגורים
- איש קשר לחירום (אופציונלי)
- מספר אורחים בפועל
- שעת הגעה משוערת

**שלב 3: תנאי אירוח וחתימה**
- הצגת תנאי אירוח (גלילה)
- checkbox אישור תנאים
- **חתימה דיגיטלית על המסך** (touch/mouse)
- שמירת החתימה כ-base64

**שלב 4: השלמה**
- הצגת **קוד כניסה לנכס**
- פרטי WiFi
- מדריך לנכס
- פרטי יצירת קשר עם בעל הנכס

### לאחר השלמת הצ'ק-אין

המערכת אוטומטית:
1. ✅ שומרת את כל הפרטים בדאטהבייס
2. ✅ מייצרת/שולפת קוד כניסה
3. ✅ שולחת WhatsApp לאורח עם:
   - קוד כניסה
   - פרטי WiFi
   - מדריך לנכס
4. ✅ שולחת התראה לבעל הנכס:
   ```
   ✅ האורח [שם] השלים צ'ק-אין דיגיטלי!
   
   📅 כניסה: [תאריך]
   🕐 שעה משוערת: [שעה]
   👥 מספר אורחים: [מספר]
   ```

## דאשבורד לבעל נכס

### דף ניהול צ'ק-אינים (`/dashboard/check-ins`)

- **סטטיסטיקות:**
  - מספר צ'ק-אינים ממתינים
  - מספר צ'ק-אינים שהושלמו
  - אחוז השלמה

- **פילטרים:**
  - הכל / ממתינים / הושלמו / פג תוקף

- **טבלה:**
  - שם אורח + טלפון
  - תאריך כניסה
  - סטטוס (badge צבעוני)
  - תאריך השלמה
  - **פעולות:**
    - 👁️ צפה בפרטים
    - 📤 שלח קישור שוב (למי שלא השלים)
    - 📄 הורד PDF (למי שהשלים)

### דף פרטי צ'ק-אין (`/dashboard/check-ins/[id]`)

הצגה מפורטת של:
- ✅ **פרטי האורח** - שם, טלפון, אימייל, תאריכים
- ✅ **מצב צ'ק-אין** - סטטוס, תאריכי יצירה/השלמה, קוד כניסה
- ✅ **פרטים אישיים** - סוג תעודה, מספר, תאריך לידה, כתובת
- ✅ **איש קשר לחירום**
- ✅ **תמונת תעודת הזהות** (עם הגדלה)
- ✅ **חתימה דיגיטלית** (כולל IP וחותמת זמן)

## API Endpoints

### יצירת צ'ק-אין חדש
```
POST /api/check-in/create
Body: {
  bookingId: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  checkInDate: string
  checkOutDate: string
  numAdult?: number
  numChild?: number
  userId: string
}
Response: {
  success: boolean
  checkInId: string
  token: string
  link: string
}
```

### שליפת פרטי צ'ק-אין
```
GET /api/check-in/[token]
Response: CheckIn details + property info
```

### העלאת תמונת תעודה
```
POST /api/check-in/upload-id
Body: FormData {
  file: File
  token: string
  documentType: string
}
Response: {
  success: boolean
  url: string
  fileName: string
}
```

### השלמת צ'ק-אין
```
POST /api/check-in/submit
Body: {
  token: string
  formData: {
    id_document_type: string
    id_number: string
    date_of_birth: string
    address: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    actual_num_guests: number
    estimated_arrival_time?: string
    terms_accepted: boolean
    signature_data_url: string
  }
  ip_address?: string
}
Response: {
  success: boolean
  access_code: string
  wifi_ssid: string
  wifi_password: string
  property_guide: string
  owner_phone: string
}
```

### רשימת צ'ק-אינים (דאשבורד)
```
GET /api/dashboard/check-ins
Response: CheckIn[]
```

### פרטי צ'ק-אין ספציפי
```
GET /api/dashboard/check-ins/[id]
Response: CheckIn
```

## מבנה הדאטהבייס

### טבלה: `check_ins`

```sql
id                      UUID PRIMARY KEY
booking_id              TEXT NOT NULL
user_id                 TEXT NOT NULL (FK → users.id)
token                   TEXT UNIQUE NOT NULL
guest_name              TEXT NOT NULL
guest_phone             TEXT NOT NULL
guest_email             TEXT
check_in_date           DATE NOT NULL
check_out_date          DATE NOT NULL
num_adults              INTEGER DEFAULT 2
num_children            INTEGER DEFAULT 0
id_document_url         TEXT
id_document_type        TEXT
id_number               TEXT
date_of_birth           DATE
address                 TEXT
emergency_contact_name  TEXT
emergency_contact_phone TEXT
actual_num_guests       INTEGER
estimated_arrival_time  TIME
signature_data_url      TEXT
signature_timestamp     TIMESTAMPTZ
terms_accepted          BOOLEAN DEFAULT false
terms_version           TEXT DEFAULT 'v1.0'
ip_address              TEXT
status                  TEXT DEFAULT 'pending'
completed_at            TIMESTAMPTZ
access_code             TEXT
access_code_sent_at     TIMESTAMPTZ
reminder_sent_at        TIMESTAMPTZ
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
expires_at              TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
```

**אינדקסים:**
- `idx_check_ins_token` על `token`
- `idx_check_ins_booking_id` על `booking_id`
- `idx_check_ins_user_id` על `user_id`
- `idx_check_ins_status` על `status`

### עדכון טבלה: `users`

הוסף עמודה `check_in_settings` מסוג JSONB:
```json
{
  "auto_send_on_booking": true,
  "send_days_before": 3,
  "send_reminder": true,
  "access_code_format": "digits",
  "wifi_ssid": "",
  "wifi_password": "",
  "property_guide": "",
  "terms_template": "default"
}
```

### Storage Bucket: `id-documents`

- **Bucket:** `id-documents` (private)
- **גודל מקסימלי:** 5MB
- **פורמטים:** JPG, PNG, PDF
- **RLS:** רק service_role יכול לגשת (אבטחה מלאה)

## אבטחה ותיעוד משפטי

✅ **שמירת IP address** - לתיעוד מקור החתימה  
✅ **חותמת זמן מדויקת** - timestamp של החתימה  
✅ **אחסון מוצפן** - תעודות ב-Supabase Storage (private)  
✅ **Row Level Security** - על טבלת check_ins  
✅ **Audit trail** - כל הפעולות נרשמות  
✅ **Token expiry** - קישורים תקפים 30 יום  

## תכונות עתידיות (לא יושמו)

- ⏰ **Cron job לתזכורות** - שליחת תזכורת אוטומטית 2-3 ימים לפני כניסה
- 📄 **יצירת PDF אוטומטי** - סיכום מלא של הצ'ק-אין
- ⚙️ **דף הגדרות** - התאמה אישית של תנאי אירוח, תבניות, וכו'
- 📊 **דוחות ואנליטיקס** - סטטיסטיקות מתקדמות

## בעיות נפוצות ופתרונות

### Storage bucket לא נוצר
```sql
-- הרץ ידנית ב-SQL Editor:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('id-documents', 'id-documents', false, 5242880, 
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
```

### WhatsApp לא נשלח
- ודא ש-`WHAPI_TOKEN` תקף ב-`.env.local`
- בדוק שמספרי הטלפון מתוקננים נכון (+972...)
- בדוק logs בקונסול

### קישור צ'ק-אין לא עובד
- ודא ש-`NEXTAUTH_URL` מוגדר נכון
- בדוק שה-token תקף ולא פג תוקף
- בדוק ב-Supabase שהרשומה קיימת

## תמיכה

לבעיות ושאלות:
1. בדוק את ה-logs בקונסול הדפדפן
2. בדוק את ה-logs ב-Supabase (Logs → API)
3. בדוק את ה-Network tab בדפדפן

## סיכום

המערכת מספקת פתרון קצה לקצה לצ'ק-אין דיגיטלי:
- ✅ חווית משתמש מעולה למובייל
- ✅ אינטגרציה מלאה עם מערכת ההזמנות
- ✅ אבטחה ותיעוד משפטי מלא
- ✅ התראות WhatsApp אוטומטיות
- ✅ ניהול נוח מהדאשבורד

**המערכת מוכנה לשימוש ייצור! 🚀**
