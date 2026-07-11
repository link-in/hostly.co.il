# מפת בדיקות — לפי סדר הרצה

קטלוג של כל הבדיקות האוטומטיות בפרויקט: מה כל קובץ בודק, כמה בדיקות יש בו, ובאילו פקודות הוא רץ. להסבר על השכבות ועל מתי להוסיף איזה סוג בדיקה, ראו **[TESTING.md](TESTING.md)**.

## איך מריצים

| פקודה | מה היא מריצה |
|---|---|
| `npm test` | כל בדיקות Vitest (יחידה + אינטגרציה) |
| `npm run test:coverage` | כמו למעלה, עם דוח כיסוי |
| `npm run test:e2e` | בדיקות Playwright (E2E מדומה) |
| `npm run test:all` | `npm test` ואז `npm run test:e2e`, ברצף |
| `npx tsc --noEmit` | טייפצ'ק (לא בדיקה פונקציונלית, אבל רץ יחד עם הבדיקות ב-CI) |

**הערה על "סדר הרצה":** Vitest מריץ קובצי בדיקה שונים **במקביל** (בין קבצים אין סדר כרונולוגי מובטח), ובתוך קובץ בודד הבדיקות רצות בסדר שהן מוגדרות בו. הטבלאות למטה מסודרות לפי סדר **לוגי** — שכבה 1 (יחידה) ← שכבה 2 (אינטגרציה) ← שכבה 3 (E2E) — לפי הכניסה שלהן ל-CI (`.github/workflows/ci.yml`): קודם ה-job `test` (Vitest + build), ואז ה-job `e2e` (Playwright, רץ במקביל אבל תלוי-build בפני עצמו).

**סה"כ נכון להיום:** 143 בדיקות Vitest (9 קבצים) + 1 תרחיש Playwright = 144 בדיקות.

---

## שכבה 1 — יחידה (Unit, Vitest)

בדיקות על פונקציות טהורות, ללא רשת ו-DB.

| # | קובץ | # בדיקות | מה נבדק | הערות |
|---|---|---|---|---|
| 1 | `src/lib/bookings/normalizer.test.ts` | 34 | נירמול הזמנות מ-Beds24: `extractInvoiceTotal`, `parseBookingSource`, `extractBookingId`, `isConfirmedBookingStatus`, `normalizeBookingItem`, `extractUserTokens` | קיים מלפני פיצ'ר החסימה — משמש כדוגמה למבנה בדיקות בפרויקט |
| 2 | `src/lib/availability/blocking.test.ts` **(חדש)** | 21 | לוגיקת חסימת/שחרור תאריכים: `expandDateRangeLocal`, `buildCacheRowsFromPayload`, `overlayAvailabilityCache`, `writeCacheAvailability` | כולל 3 בדיקות **רגרסיה** מפורשות לבאגים שתוקנו: (א) off-by-one בפענוח תאריך מקומי, (ב) שימור מחיר קיים כששוחררת חסימה, (ג) הזרקת entry סינתטי לתאריך חסום שאין לו מחיר ב-Beds24. משתמש ב-`vi.mock('@/lib/supabase/server')` + `createFakeSupabaseClient` |
| 3 | `src/lib/dashboard/calendarDates.test.ts` **(חדש)** | 19 | עזרי תאריכים ללוח השנה: `normalizeDate`, `toKey`, `isSameDay`, `addDays`, `sortDates`, `buildDateRanges` | חולצו מ-`CalendarPricing.tsx` כדי שיהיו ניתנים לבדיקה ישירה; כוללות בדיקות גבול (חציית חודש/שנה) |
| 4 | `src/lib/webhook/processor.test.ts` | 13 | סינון סטטוס הזמנה, בניית שם אורח, זיהוי מקור הזמנה (Airbnb/Booking), בניית הודעת בעל דירה | קיים מלפני פיצ'ר החסימה |
| 5 | `src/__tests__/availability-cache.test.ts` | 23 | יצירת API key, ולידציית תאריכים/טווחים ל-Calendar API הציבורי, צורת תגובת `CachedAvailability`, ולידציית חדרים מורשים, תנאי הפעלת רענון cache מ-webhook, **(חדש)** לוגיקת טריות ה-cache ב-`/api/public/calendar` (cache-first), **(חדש)** לוגיקת פתרון טוקן Beds24 (משתמש מול env) | קיים מלפני פיצ'ר החסימה; הורחב עם תיקון פערי ה-cache |
| 6 | `src/lib/utils/phoneFormatter.test.ts` | 18 | נירמול וולידציה של מספרי טלפון ישראליים (נייד/קווי, פורמטים שונים) | קיים מלפני פיצ'ר החסימה |

## שכבה 2 — אינטגרציה (Integration, Vitest + מוקים)

בדיקות על handlers שלמים (`GET`/`POST`), עם Beds24 ו-Supabase **מדומים** — אין קריאת רשת אמיתית.

| # | קובץ | # בדיקות | מה נבדק | הערות |
|---|---|---|---|---|
| 7 | `src/app/api/dashboard/rooms/route.test.ts` **(חדש)** | 4 | `POST` שולח `numAvail:0` ל-Beds24 וכותב ל-`availability_cache`; `GET` מציג תאריך חסום גם כש-Beds24 לא מחזיר אותו (2 תרחישים); **round-trip מלא**: חסימה → GET מציג חסום → שחרור → GET מציג פתוח | מחליף את הבדיקה המנואלית שבוצעה בעבר עם scripts (`check-availability.mjs`, `test-block-roundtrip.mjs`) מול Beds24 חי. משתמש ב-`src/__tests__/fixtures/beds24.ts` ו-`src/__tests__/helpers/fakeSupabase.ts` (שניהם חדשים) |
| 8 | `src/app/api/public/calendar/route.test.ts` **(חדש)** | 6 | `GET` בפועל: מגיש מה-cache כשהוא טרי בלי לגעת ב-Beds24; fetch חי כשאין cache; fetch חי כש-cache ישן (חוצה את `CACHE_FRESHNESS_MS`); 503 כשאין טוקנים בכלל; 401 מפתח לא תקין; 403 חדר לא מורשה | בודק את לוגיקת ה-cache-first שנוספה ב-`/api/public/calendar`; דרש הרחבת `fakeSupabase.ts` עם `.single()`/`.order()`/`.limit()`/`.gte()`/`.lte()` |
| 9 | `src/lib/webhook/processor.integration.test.ts` **(חדש)** | 5 | `processWebhook` בפועל: מעדיף טוקן Beds24 של המשתמש; נופל לטוקן env כשלמשתמש אין; לא מרענן cache כשאין טוקן בכלל; לא מרענן כשלא נמצא משתמש להזמנה; לא מרענן להזמנה מבוטלת | בודק את פתרון הטוקן שנוסף ל-`maybeRefreshCache()` (multi-tenant) |

## שכבה 3 — E2E מדומה (Playwright)

בדיקת דפדפן אמיתי (headless), אבל **ללא רשת חיה** — כל קריאות ה-API מיורטות עם `page.route()`.

| # | קובץ | # תרחישים | מה נבדק | הערות |
|---|---|---|---|---|
| 10 | `e2e/calendar-blocking.spec.ts` **(חדש)** | 1 | זרימת משתמש מלאה: כניסה כמשתמש דמו → ניווט קדימה בלוח השנה → בחירת תאריך פנוי → "סגור להזמנות" → אימות Toast + badge "חסום" → בחירה מחדש → "שחרר חסימה" → אימות שהתאריך נפתח מחדש | התחברות בהזרקת session cookie חתום (`e2e/helpers/session.ts`) ולא טופס login אמיתי — כדי לא להיות תלויים ב-Supabase. `**/api/dashboard/rooms` (POST) ו-`**/api/dashboard/cache/refresh` מיורטים; `**/api/auth/**` **לא** מיורט (עובד אמיתי, בלי I/O ל-DB בפועל). ריצה: `next build && next start` פנימי דרך `playwright.config.ts` — ריצה ראשונה איטית יותר (build) |

---

## מיפוי קובץ נבדק ← קובץ בדיקה

| קובץ מקור | נבדק ב- |
|---|---|
| `src/lib/availability/blocking.ts` | `src/lib/availability/blocking.test.ts` (יחידה) + `src/app/api/dashboard/rooms/route.test.ts` (אינטגרציה, דרך ה-route) |
| `src/lib/dashboard/calendarDates.ts` | `src/lib/dashboard/calendarDates.test.ts` |
| `src/app/api/dashboard/rooms/route.ts` | `src/app/api/dashboard/rooms/route.test.ts` |
| `src/app/dashboard/components/CalendarPricing.tsx` | `e2e/calendar-blocking.spec.ts` (זרימת המשתמש) + בעקיפין דרך `calendarDates.test.ts` (הלוגיקה שחולצה ממנו) |
| `src/lib/availability/cache.ts` (`refreshRoomCache`) | מכוסה דרך תרחיש ה-round-trip ב-`rooms/route.test.ts`, ודרך `public/calendar/route.test.ts` (קריאה מ-cache-first) ו-`processor.integration.test.ts` (רענון מ-webhook) |
| `src/app/api/public/calendar/route.ts` | `src/app/api/public/calendar/route.test.ts` |
| `src/lib/webhook/processor.ts` (`maybeRefreshCache`) | `src/lib/webhook/processor.integration.test.ts` |
| `src/lib/db/users.ts` (`getUserBeds24Tokens`) | מכוסה בעקיפין דרך `processor.integration.test.ts` (מדומה עם `vi.mock`) |

## פערים / מועמדים לבדיקות עתידיות

- ה-E2E מכסה תרחיש "מאושר" (happy path) אחד בלבד — בכוונה (ר' `TESTING.md`, "Suite קטן ומהיר בכוונה"). תרחישי כשל (למשל Beds24 מחזיר שגיאה מה-`POST`) מכוסים ברמת האינטגרציה (`route.test.ts`) אך לא ב-E2E.
- אין עדיין בדיקה ל"dogpile" — כמה בקשות מקבילות ל-`/api/public/calendar` לאותו חדר כש-cache ישן, שכל אחת מהן מפעילה גם fetch חי וגם `refreshRoomCache` ברקע. אם זה יתברר כבעיה בפועל (עומס על Beds24 rate limits), שווה להוסיף דדופליקציה בסגנון `refreshPromise` שקיים כבר ב-`tokenManager.ts`.
