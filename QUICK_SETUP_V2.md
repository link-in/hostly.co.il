# קליטת לקוח חדש – Beds24 V2

כל לקוח מקבל **נכס משני בחשבון המאסטר** של Beds24 (לא תת-חשבון).
הקליטה מתבצעת באשף אדמין אחד: `/admin/onboarding/<userId>`.

המעבר לתת-חשבון בעתיד נשאר אפשרי: אם נשמרים למשתמש `beds24_token` ו-`beds24_refresh_token`,
כל קריאות הקליטה והמטמון עוברות אוטומטית לטוקנים שלו במקום לטוקני המאסטר.

---

## 1. הכנה חד-פעמית

### Migration

הרץ ב-Supabase (SQL Editor) את הקובץ:

```
supabase-migrations/027_onboarding_state_and_audit_log.sql
```

הוא מוסיף:
- `users.onboarding_state` – סטטוס כל שלב באשף (JSONB), כדי שאפשר יהיה לחזור לאשף באמצע.
- `users.onboarding_completed_at` – מתי הלקוח הופעל. משתמשים קיימים עם `property_id` מסומנים כפעילים.
- טבלת `onboarding_audit_log` – כל קריאה ל-Beds24 מהאשף: שלב, נתיב, סטטוס, שגיאה, עלות קרדיטים ויתרה.
  הטבלה עם RLS וללא policies, כלומר נגישה רק ל-service role.

### משתני סביבה

```env
BEDS24_TOKEN=...            # טוקן V2 של חשבון המאסטר
BEDS24_REFRESH_TOKEN=...
NEXTAUTH_URL=https://app.hostly.co.il
```

הטוקן צריך את ה-scopes: `properties`, `inventory`, `channels` (קריאה וכתיבה), ו-`accounts` ו-`bookings` (קריאה).
פירוט ביצירת הטוקן: `BEDS24_OAUTH_SCOPES_SETUP.md`.

---

## 2. התהליך

1. **יצירת משתמש** – `/admin/users/create`. בסיום המערכת עוברת אוטומטית לאשף הקליטה.
2. **אשף הקליטה** – `/admin/onboarding/<userId>`. אפשר להגיע אליו גם מרשימת הלקוחות
   (תג "קליטה לא הושלמה") ומעמוד עריכת המשתמש.

| שלב | מה קורה | Beds24 |
|---|---|---|
| נכס וחדר | יצירת נכס עם חדר אחד בקריאה אחת, או ייבוא ממודעת Airbnb קיימת | `POST /properties` / `POST /channels/airbnb` (`importAsNewProperty`) |
| מחיר בסיס | מחיר ומינימום לילות ל-12 חודשים, וזמינות 1 | `POST /inventory/rooms/calendar` |
| חיבור Airbnb | קישור הרשאה ללקוח, בחירת חשבון ומודעה, חיבור מלא לחדר | `GET /channels/airbnb/users`, `GET /channels/airbnb/listings`, `POST /channels/airbnb` (`connectToExistingRoom`) |
| מכפיל Airbnb | מכפיל 1.21 ברמת הנכס (עמלה 15% ועמלות נלוות) | `POST /channels/settings` |
| Booking.com | צ'קליסט ידני – ל-Beds24 אין API לחיבור Booking.com | – |
| בדיקת חיבורים | קריאה חוזרת של מיפוי Airbnb והמכפיל, ומספר החיבורים בחשבון | `GET /channels/settings`, `GET /accounts?includeUsage=true` |
| הפעלה | מילוי מטמון זמינות, יצירת מפתח API ליומן, סימון הלקוח כפעיל | `GET /inventory/rooms/calendar`, `GET /bookings` (דרך המטמון) |

**מגבלה ידועה בחיבור Airbnb:** קישור ההרשאה הנוכחי (`buildAirbnbOAuthUrl`) לא מכיל מזהה של חשבון Beds24.
ההרשאה נשמרת בחשבון המאסטר רק כשהמאשר מחובר ל-Beds24 באותו דפדפן. לקוח שאינו מחובר ל-Beds24 לא יופיע
ב-`GET /channels/airbnb/users`. Beds24 אישרו שכפתור "Connect with Airbnb Account" (שפותר זאת) עולה
100 אירו לחודש, ולכן הוחלט לא להפעיל אותו כרגע. הפתרון הנוכחי: לבצע את האישור בדפדפן שמחובר לחשבון
המאסטר, כשבעלת המודעה מתחברת ל-Airbnb בעצמה, בחלון גלישה פרטית. חלופה: ליצור ללקוח תת-חשבון Beds24
(מצב `usesOwnBeds24Account`) ולחבר דרכו.

כללים:
- השלבים Airbnb, המכפיל ו-Booking.com ניתנים לדילוג. דילוג על Airbnb מדלג גם על המכפיל.
- שלב שהושלם לא ירוץ שוב (אין נכסים כפולים). מחיר, מכפיל, Booking.com ובדיקה ניתנים להרצה חוזרת.
- כישלון נשמר עם הודעת השגיאה, ואפשר לנסות שוב מאותו מקום.
- לפני כל קריאה נבדקת יתרת הקרדיטים של חלון 5 הדקות. אם נותרו פחות מ-10, הקריאה נחסמת עם 429 עד לאיפוס.
  חלון הקרדיטים משותף לכל הלקוחות בחשבון המאסטר.
- מפתח ה-API מוצג פעם אחת בלבד, בסיום שלב ההפעלה.

### Booking.com – הצעדים הידניים

1. הלקוח נכנס ל-Extranet, תחת חשבון ואז ספק קישוריות, מחפש את Beds24 ומסמן הזמנות וגם מחירים וזמינות.
2. ב-Beds24, תחת מנהל ערוצים ואז Booking.com, מזינים את מזהה המלון.
3. ממפים חדרים ותוכניות מחיר בעזרת הכפתור לקבלת הקודים.
4. מפעילים את החדר, מייבאים הזמנות קיימות ומפעילים את החיבור.
5. באשף מסמנים את הצ'קליסט, מזינים את מזהה המלון ומאשרים.

---

## 3. נתיבי API (אדמין בלבד)

כולם תחת `/api/admin/onboarding/[userId]`, עם ולידציית Zod:

```
GET  /                     סטטוס האשף
POST /property             { mode: 'create', name, propertyType?, maxPeople?, currency? }
                           { mode: 'importAirbnb', airbnbUserId, airbnbListingId, listingName? }
POST /base-price           { price, minStay?, months? }
GET  /airbnb/users
GET  /airbnb/listings?airbnbUserId=
POST /airbnb/connect       { airbnbUserId, airbnbListingId, listingName? }
POST /airbnb/multiplier
POST /booking-com          { hotelId? }
POST /verify
POST /finalize
POST /skip                 { step: 'airbnbConnect' | 'airbnbMultiplier' | 'bookingCom' }
```

קודי שגיאה: 403 לא אדמין, 422 קלט לא תקין, 409 שלב קודם חסר, 429 קרדיטים, 502 שגיאת Beds24.

נתיבים שהוסרו: `admin/beds24/create-subaccount`, `admin/users/[id]/airbnb`,
`dashboard/beds24/{create-property, airbnb-connect, airbnb-users, airbnb-listings}`.
`admin/beds24/create-property` נשאר ליצירת נכס ללא לקוח, לאדמין בלבד.

---

## 4. בדיקות בלקוח האמיתי הראשון

ל-Beds24 אין סביבת בדיקות, ולכן הלקוח הראשון הוא גם הבדיקה. לוודא:

- [ ] מזהי הנכס והחדר שבאשף זהים למה שמופיע ב-Beds24, ו-`users.room_id` בפורמט `id:name`.
- [ ] המחיר והזמינות מופיעים ביומן של Beds24 ל-12 החודשים הקרובים.
- [ ] בשלב הבדיקה המכפיל שנקרא בחזרה הוא 1.21 (אם לא – לבדוק את המכפיל ב-Beds24 ידנית).
- [ ] מספר החיבורים בחשבון עלה ב-Airbnb וב-Booking.com.
- [ ] היומן הציבורי עובד עם מפתח ה-API החדש.
- [ ] צריכת הקרדיטים לכל הקליטה, לפי `onboarding_audit_log`:

```sql
SELECT step, count(*), sum(request_cost), min(credits_remaining)
FROM onboarding_audit_log
WHERE user_id = '<userId>'
GROUP BY step;
```

---

## 5. פנייה לתמיכה של Beds24

טקסט מוכן לשליחה:

```text
Subject: Questions about sub-accounts, moving properties and developer access

Hello,

We are a software company building a property management product on top of the Beds24 API V2.
Each of our clients is currently set up as a property inside our own master account.
Before we scale, we would like to confirm a few things:

1. Sub-account billing: if we create a sub-account per client, does each sub-account pay
   its own base subscription fee, or is it billed only per unit and channel link under our account?

2. Moving properties: can a property (with its rooms, bookings, prices and channel connections
   to Airbnb and Booking.com) be moved later from our master account into a new sub-account
   without reconnecting the channels? If yes, what is the process?

3. Developer access: is there a developer, sandbox or staging account we can use to test
   API calls (creating properties, channel mapping) without affecting live listings or billing?

Thank you,
Hostly
```
