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

## טכנולוגיות

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js
- **UI:** React Bootstrap, Tailwind CSS
- **Deployment:** Vercel

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
