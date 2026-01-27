# Hostly - מערכת ניהול נכסים

מערכת ניהול מתקדמת לנכסי השכרה לטווח קצר.

## תכונות עיקריות

- 🏠 דשבורד מתקדם לניהול הזמנות
- 📊 ניתוח נתונים וביצועים
- 📱 ממשק רספונסיבי
- 🔐 מערכת אימות מאובטחת
- 🎨 מערכת Landing Pages עם subdomains
- 📅 אינטגרציה עם Beds24
- 💳 ניהול מנויים ותשלומים
- 🎭 מצב דמו עם התחברות אוטומטית

## טכנולוגיות

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js
- **UI:** React Bootstrap, Tailwind CSS
- **Deployment:** Vercel

## 🎭 מצב דמו (Demo Mode)

### 🚀 קישור מהיר להדגמה

```
https://your-domain.com/demo
```

פשוט שתף את הקישור - ההתחברות אוטומטית! ✨

### 📚 מסמכי עזר

- **[מדריך מהיר למשתמש](./DEMO_GUIDE.md)** - שלח לחברים
- **[סיכום שיפורים](./DEMO_IMPROVEMENTS.md)** - תיעוד טכני מלא
- **[רשימת בדיקה](./TESTING_CHECKLIST.md)** - לפני שיתוף

### התחברות ידנית למשתמש דמו

**פרטי התחברות:**
- 📧 **אימייל:** `demo@hostly.co.il`
- 🔑 **סיסמה:** `demo2026`

### ✨ תכונות חדשות במצב דמו

- 🎨 עיצוב מודרני עם אנימציות חלקות
- 📊 פרוגרס בר חי עם אחוזים
- 📋 כפתור העתקה חכם לקישור
- 🌟 אנימציות רקע מרחפות
- ⚡ ביצועים מהירים וחלקים
- 📱 רספונסיבי מושלם לכל מכשיר

### מה כולל מצב הדמו?

- ✅ נתונים מדומים (Mock Data) - לא משפיעים על מערכות אמיתיות
- ✅ כל התכונות של המערכת זמינות
- ✅ הזמנות ושינויים נשמרים ב-Session Storage
- ✅ אידיאלי להדגמות, בדיקות ומשוב

## התקנה מקומית

```bash
npm install
npm run dev
```

## משתנים סביבתיים

העתק את `.env.local` מהפרויקט הישן או צור חדש עם:

```
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
BEDS24_API_KEY=...
```

## Deployment

הפרויקט מוגדר עבור Vercel:
```bash
vercel
```

## מבנה הפרויקט

```
src/
├── app/
│   ├── dashboard/     # דשבורד ראשי
│   ├── admin/         # ניהול מערכת
│   ├── api/           # API routes
│   ├── sites/         # Landing pages system
│   └── [site]/        # Dynamic landing pages
├── lib/               # Logic & utilities
│   ├── auth/          # Authentication
│   ├── supabase/      # Database client
│   └── dashboard/     # Dashboard providers
└── middleware.ts      # Routing & protection
```
