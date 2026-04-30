# הרצה מקומית - Hostly

## דרישות מקדימות

- **Node.js** גרסה 18+ (מומלץ 20)
- **npm** (מגיע עם Node)

בדיקה:
```bash
node --version
npm --version
```

אם הפקודות לא מזוהות – התקן Node מ-[nodejs.org](https://nodejs.org) או השתמש ב-nvm/fnm.

---

## שלב 1: התקנת תלויות

```bash
cd c:\Users\zurbr\Sites\hostly.co.il
npm install
```

---

## שלב 2: משתני סביבה

1. צור קובץ **`.env.local`** בתיקיית הפרויקט.
2. העתק את התוכן מ-**`.env.example`** והשלם ערכים אמיתיים.

**מינימום להרצה (כדי שהאפליקציה תעלה):**

| משתנה | תיאור |
|--------|--------|
| `NEXTAUTH_SECRET` | מפתח סודי כלשהו (לפחות 32 תווים) |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת פרויקט Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח anon מ-Supabase Dashboard |

ל-Supabase: **Dashboard → Settings → API** – העתק את ה-URL ואת ה-anon key.

---

## שלב 3: הרצת שרת הפיתוח

```bash
npm run dev
```

האפליקציה תהיה זמינה ב: **http://localhost:3000**

---

## פקודות נוספות

| פקודה | שימוש |
|--------|--------|
| `npm run build` | בנייה ל-production |
| `npm run start` | הרצה אחרי build |
| `npm run lint` | בדיקת קוד עם ESLint |

---

## אם משהו נכשל

- **"Missing Supabase environment variables"** – וודא ש-`NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY` מוגדרים ב-`.env.local`.
- **NextAuth / middleware** – וודא ש-`NEXTAUTH_SECRET` ו-`NEXTAUTH_URL` מוגדרים.
- **BEDS24 / דשבורד** – דורש גם `BEDS24_TOKEN` ו-`BEDS24_REFRESH_TOKEN` (לפי `QUICK_SETUP_V2.md`).
