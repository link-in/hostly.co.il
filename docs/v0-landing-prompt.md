# פרומט לדף נחיתה (Landing Page) ב-v0.dev – Hostly

השתמש בפרומט הבא כשאתה מייצר דף נחיתה ב-v0.dev. העתק את החלק הרלוונטי (או את הכל) לתיבת הפרומט.

---

## 1. פלטת צבעים (Color Palette)

**בקש ב-v0:**
> Use this exact color palette. Do not substitute with generic purples or pinks.

| שימוש | Hex | שם |
|--------|-----|-----|
| **Primary (כחול-סגול)** | `#667eea` | צבע ראשי – כפתורים, לינקים, הדגשות |
| **Secondary (סגול כהה)** | `#764ba2` | גרדיאנט שני |
| **Accent (ורוד)** | `#f093fb` | הדגשה, באדג'ים, CTA משני |
| **גרדיאנט ראשי (רקע/טקסט)** | `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)` | לרקעים מלאים או לטקסט גרדיאנט |
| **רקע Hero כהה** | `#1e293b` → `#334155` → `#475569` | גרדיאנט רקע לסקשן Hero |
| **Success** | `#10b981` | הצלחה, אישורים |
| **Danger/Error** | `#dc2626` | שגיאות, אזהרות |
| **Warning** | `#ff9800` | אזהרה, חסום |
| **טקסט כהה** | `#1e293b`, `#374151` | כותרות על רקע בהיר |
| **טקסט משני** | `#64748b`, `#6b7280` | תת-כותרות, טקסט משני |
| **לבן על רקע כהה** | `rgba(255,255,255,0.9)` / `rgba(255,255,255,0.85)` | טקסט ראשי על גרדיאנט/כהה |

**Tailwind (אם רלוונטי):**
- Primary: `#667eea`
- Accent: `#f093fb`
- גרדיאנט: `from-[#667eea] via-[#764ba2] to-[#f093fb]` (135deg)

---

## 2. לוגו (Logo)

- **נתיב:** `/photos/hostly-logo.png`
- **Alt:** `Hostly Logo` או `לוגו Hostly`
- **שימוש:** בהדר (Header), ב-Hero ליד הכותרת, ובפוטר אם מתאים.
- **גודל מומלץ:** גובה 40–48px בהדר, עד 80–120px ב-Hero.
- **רקע:** הלוגו עובד טוב על רקע לבן וגם על גרדיאנט/כהה (להתאים בהירות/ניגודיות אם צריך).

---

## 3. מיתוג וטקסט (Copy)

- **שם המותג:** Hostly
- **דומיין:** hostly.co.il
- **סלוגן ראשי:**  
  **מנהלים את הצימר בראש שקט**  
  כל ערוצי ההזמנות במקום אחד
- **תג עילי (Badge):**  
  ✨ מערכת ניהול נכסים מתקדמת
- **תיאור קצר:**  
  סנכרון מלא בין Airbnb, Booking והזמנות ישירות.  
  **בלי דאבל-בוקינג, בלי בלבול במחירים** – הכל בממשק אחד מהיר ונוח.
- **CTA ראשי:**  
  "התחל בחינם" / "נסה עכשיו" / "לכניסה למערכת"
- **קהל יעד:**  
  בעלי צימרים, נכסים להשכרה, מנהלי נכסים בישראל.

---

## 4. הנחיות לפיתוח (Development Guidelines)

**בקש ב-v0:**

- **שפה וכיוון:**  
  דף בעברית, RTL מלא.  
  הוסף `dir="rtl"` ל-`html` או ל-container הראשי, והשתמש ב-`text-right` / `text-start` בהתאם.

- **טכנולוגיה:**  
  Next.js (App Router), React, TypeScript.  
  Styling: Tailwind CSS.  
  קומפוננטות מודולריות וברורות.

- **מה המערכת עושה (להצגה בדף):**  
  - סנכרון לוח שנה ומחירים עם **Airbnb** ו-**Booking.com**  
  - הזמנות ישירות מהאתר (בוקינג ישיר)  
  - לוח שנה אחד, מחירים מסונכרנים, מניעת דאבל-בוקינג  
  - צ'ק-אין דיגיטלי לאורחים  
  - דשבורד ניהול: הזמנות, לקוחות, זמינות ומחירים  
  - אתר נחיתה מותאם לכל נכס (subdomain: `שם.hostly.co.il`)

- **אלמנטים מומלצים בדף נחיתה:**  
  - Hero עם כותרת גרדיאנט (טקסט "בראש שקט" בגרדיאנט #667eea → #764ba2 → #f093fb)  
  - לוגו Hostly בולט  
  - סקשן "איך זה עובד" (3–4 שלבים)  
  - סקשן יתרונות (סנכרון, מניעת דאבל-בוקינג, צ'ק-אין דיגיטלי, ממשק אחד)  
  - לוגואים/אייקונים של Airbnb ו-Booking.com (אופציונלי)  
  - CTA ברור: "התחל בחינם" / "כניסה למערכת"  
  - פוטר עם לינק ל-dashboard (hostly.co.il/dashboard) ופרטי קשר (support@hostly.co.il)

- **גופנים:**  
  Heebo או Assistant כ-primary, עם fallback ל-sans-serif.  
  טען מ-Google Fonts: Heebo (400, 500, 600, 700, 800).

- **סגנון ויזואלי:**  
  מודרני, נקי, עם גרדיאנטים עדינים (סגול–ורוד) ורקעים כהים או לבנים.  
  כפתורים עם גרדיאנט או רקע `#667eea`, hover עם בהירות/שקיפות.  
  תמיכה ב-RTL מלא (מרווחים, יישור, סדר אלמנטים).

---

## 5. סנכרון v0 עם הפרויקט (Sync v0 ↔ Repo)

**אין "סנכרון אוטומטי רציף"** – v0 לא דוחף ישר ל-`main` ולא מעדכן את הפרויקט בכל שינוי.  
**יש סנכרון דרך GitHub:** כל שינוי ב-v0 נשמר כ־commit על branch, ואתה מחליט מתי למזג ל־main ולמשוך אצלך.

### איך זה עובד

1. **חיבור ריפו קיים ל-v0**  
   - ב-v0: לחץ על **+** בשורת הפרומט (או "New chat" / "Import").  
   - בחר **Import from GitHub**.  
   - בחר את ה-repository של hostly.co.il (אותו ריפו שאתה עובד עליו ב-Cursor).  
   - v0 יוצר **branch חדש** לכל צ'אט (למשל `v0/main-abc123`) ו-**לא** דוחף ל-`main`.

2. **עבודה בדף הנחיתה ב-v0**  
   - כל הודעה שמשנה קוד = **commit אוטומטי** על ה-branch של הצ'אט.  
   - אין צורך להריץ `git` ידנית מתוך v0.

3. **הבאת העדכונים לפרויקט אצלך**  
   - כשאתה מרוצה מהשינויים: ב-v0 לחץ **Publish** → **Open PR**.  
   - נפתח Pull Request ב-GitHub מ-branch של v0 ל-`main`.  
   - אתה (או מישהו בצוות) **ממזג את ה-PR** ב-GitHub.  
   - **במחשב המקומי:** `git pull` (או Pull ב-Cursor) – הקוד המעודכן נכנס לפרויקט.

4. **המשך עבודה**  
   - אחרי מיזוג: צ'אט חדש ב-v0 = branch חדש מ-`main` (עם הדף הנחיתה המעודכן).  
   - שינויים ב-Cursor: דחיפה ל-GitHub, ואז ב-v0 אפשר לעבוד על אותו ריפו – v0 רואה את העדכונים כשעובדים על הריפו המחובר.

### דרישות

- הפרויקט hostly.co.il **חייב להיות ב-GitHub** (אותו ריפו שאתה מושך ממנו ב-Cursor).  
- חשבון v0 מחובר ל-**אותו חשבון GitHub** שיש לו גישה לריפו.  
- (אופציונלי) חיבור ה-repo ל-**Vercel** נותן previews ודיפלוי; אפשר גם רק לייצא קוד ולמשוך דרך Git.

### סיכום

| פעולה | איפה |
|--------|------|
| עריכת דף הנחיתה | v0 |
| שמירת שינויים כ-commits | אוטומטי ב-v0 על branch |
| העברת שינויים ל־main | GitHub: merge של ה-PR ש-v0 פתח |
| עדכון הפרויקט אצלך | `git pull` (או Pull ב-Cursor) אחרי המיזוג |

כלומר: **העדכונים "נכנסים" לפרויקט כשאתה ממזג את ה-PR ומושך (`git pull`)** – לא בכל שינוי ב-v0, אבל בלי לעשות copy-paste ידני של קוד.

---

## 6. פרומט מוכן להדבקה (Copy-Paste v0.dev)

```
Landing page for "Hostly" (hostly.co.il) – Hebrew, RTL.

Brand:
- Name: Hostly. Tagline: "מנהלים את הצימר בראש שקט – כל ערוצי ההזמנות במקום אחד."
- Product: PMS for vacation rentals in Israel. Syncs Airbnb, Booking.com, and direct bookings. One calendar, one dashboard, no double-booking.

Colors (use exactly):
- Primary: #667eea
- Secondary purple: #764ba2
- Accent pink: #f093fb
- Main gradient (background or text): linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
- Dark hero background: #1e293b to #475569
- Success: #10b981. Danger: #dc2626. Text on dark: white / rgba(255,255,255,0.9)

Logo: Use image at path /photos/hostly-logo.png, alt "Hostly Logo". Show in header and hero.

Requirements:
- Full RTL (dir="rtl"), Hebrew copy.
- Next.js App Router, TypeScript, Tailwind CSS.
- Sections: Hero (with gradient headline "בראש שקט"), value props (sync, no double-booking, digital check-in, one dashboard), optional "How it works", CTA "התחל בחינם" / "כניסה למערכת", footer with link to hostly.co.il/dashboard and support@hostly.co.il.
- Font: Heebo (Google Fonts), weights 400–800.
- Modern, clean layout; buttons use #667eea or gradient; support RTL spacing and alignment.
```

---

סיום הקובץ. עדכן את הנתיב ללוגו או את הטקסטים אם משהו השתנה בפרויקט.
