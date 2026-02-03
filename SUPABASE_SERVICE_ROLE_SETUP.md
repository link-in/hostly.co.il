# הוספת Supabase Service Role Key

## ⚠️ חשוב! צריך להוסיף את ה-Service Role Key

הפונקציה של ייבוא לקוחות זקוקה ל-Service Role Key כדי לעקוף את ה-Row Level Security policies.

## 📋 שלבים:

### 1. קבל את ה-Service Role Key מ-Supabase:

1. היכנס ל-https://supabase.com/dashboard
2. בחר את הפרויקט שלך
3. לך ל-**Settings** → **API**
4. גלול למטה ל-**Project API keys**
5. העתק את **service_role** key (⚠️ **לא** את anon/public!)

### 2. הוסף ל-`.env.local`:

פתח את הקובץ `.env.local` והוסף שורה חדשה:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...YOUR_SERVICE_ROLE_KEY_HERE
```

### 3. הפעל מחדש את השרת:

```bash
npm run dev
```

---

## ⚠️ אזהרת אבטחה:

**Service Role Key עוקף את כל ה-RLS policies!**

- ✅ השתמש רק ב-server-side code
- ✅ לעולם אל תחשוף ל-client
- ✅ אל תשתף במקומות ציבוריים (GitHub, etc.)
- ✅ המפתח כבר ב-`.gitignore`

---

## 🧪 איך לבדוק שזה עובד:

אחרי הוספת המפתח:

1. רענן את האפליקציה
2. לך ל-**ניהול לקוחות**
3. לחץ על **"📥 ייבוא לקוחות"**
4. אמור לעבוד ללא שגיאות RLS!

---

## 🔧 אם אין לך גישה ל-Service Role Key:

פנה למנהל הפרויקט ב-Supabase או צור פרויקט חדש בו אתה הבעלים.
