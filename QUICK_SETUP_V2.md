# התקנה מהירה - BEDS24 V2 Sub-Accounts

## 🚀 3 צעדים להפעלה

### 1️⃣ הרץ Migration ב-Supabase

**Supabase Dashboard** → **SQL Editor** → **New Query**

העתק והדבק:

```sql
-- Add BEDS24 sub-account credentials
ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_username TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_password_encrypted TEXT;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_username TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_password_encrypted TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_beds24_account_id ON users(beds24_account_id);

COMMENT ON COLUMN users.beds24_username IS 'BEDS24 sub-account username';
COMMENT ON COLUMN users.beds24_password_encrypted IS 'Encrypted BEDS24 sub-account password';
COMMENT ON COLUMN users.beds24_account_id IS 'BEDS24 sub-account ID from V2 API';ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_username TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_password_encrypted TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_beds24_account_id ON users(beds24_account_id);

COMMENT ON COLUMN users.beds24_username IS 'BEDS24 sub-account username';
COMMENT ON COLUMN users.beds24_password_encrypted IS 'Encrypted BEDS24 sub-account password';
COMMENT ON COLUMN users.beds24_account_id IS 'BEDS24 sub-account ID from V2 API';
ALTER TABLE users
ADD COLUMN IF NOT EXISTS beds24_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_beds24_account_id ON users(beds24_account_id);

COMMENT ON COLUMN users.beds24_username IS 'BEDS24 sub-account username';
COMMENT ON COLUMN users.beds24_password_encrypted IS 'Encrypted BEDS24 sub-account password';
COMMENT ON COLUMN users.beds24_account_id IS 'BEDS24 sub-account ID from V2 API';
```

לחץ **Run** (Ctrl+Enter)

---

### 2️⃣ בדוק `.env.local`

ודא שיש לך:

```env
# BEDS24 V2 API Token (לא API Key!)
BEDS24_TOKEN=your_v2_token_here
BEDS24_REFRESH_TOKEN=your_refresh_token_here

# Encryption
ENCRYPTION_KEY=your_encryption_key_here
# או:
NEXTAUTH_SECRET=your_nextauth_secret

# URL
NEXTAUTH_URL=http://localhost:3000
```

**חשוב**: V2 API דורש **token** עם כל ה-scopes הנדרשים!

### 🔑 איך לקבל token עם כל ה-permissions:

**קרא את המדריך המלא:** `BEDS24_OAUTH_SCOPES_SETUP.md`

**בקיצור:**
1. התחבר ל-BEDS24 Dashboard
2. Settings → Account → API → V2 API
3. Create Invite Code
4. **בחר את כל ה-scopes:**
   - ✅ `write:accounts` ← **חובה ליצירת sub-accounts!**
   - ✅ `write:properties` ← **חובה ליצירת properties!**
   - ✅ `write:bookings` ← **חובה לניהול הזמנות!**
   - ✅ `write:inventory` ← **חובה למחירים/זמינות!**
   - ✅ כל ה-read scopes
5. Generate → Copy invite code
6. המר ל-token: [Swagger UI](https://beds24.com/api/v2) → GET /authentication/setup

---

### 3️⃣ הרץ ובדוק

```bash
# הרץ את השרת
npm run dev
```

```bash
# גש להרשמה
http://localhost:3000/register
```

צור משתמש חדש ובדוק בלוגים:

```
✅ [REGISTER] Creating BEDS24 sub-account (V2): username123
✅ [BEDS24 Account V2] Response status: 200
✅ [REGISTER] BEDS24 sub-account created
✅ [REGISTER] Assigning property to sub-account...
✅ [REGISTER] Property assigned successfully
✅ [REGISTER] User created successfully!
```

---

## ✅ זהו!

עכשיו כל משתמש חדש מקבל:
- ✅ Sub-account ב-BEDS24
- ✅ Property + Room משלו
- ✅ Property משויך לחשבון שלו
- ✅ Credentials מוצפנים

---

## ⚠️ בעיות נפוצות

### שגיאה: "BEDS24_TOKEN not configured"
**פתרון**: הוסף `BEDS24_TOKEN` ל-`.env.local`

### שגיאה: "401 - Unauthorized"
**פתרון**: 
1. בדוק שה-token תקין
2. בדוק שזה **V2 token**, לא API key
3. רענן את ה-token אם פג תוקפו

### שגיאה: "column does not exist"
**פתרון**: הרץ את ה-migration (שלב 1)

### שגיאה: "ENCRYPTION_KEY not configured"
**פתרון**: הוסף `ENCRYPTION_KEY` או השתמש ב-`NEXTAUTH_SECRET`

---

## 📚 למידע נוסף

קרא: **BEDS24_V2_SUB_ACCOUNTS.md** - מדריך מפורט

---

**בהצלחה! 🎉**
