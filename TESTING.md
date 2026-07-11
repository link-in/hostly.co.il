# בדיקות אוטומטיות

מסמך זה מסביר את שלוש שכבות הבדיקה בפרויקט, איך להריץ אותן לוקלית, ואיך הן מחוברות ל-CI לפני מיזוג ל-`main`.

> לרשימה מלאה של כל קובצי הבדיקה בפועל (לפי סדר הרצה, עם מספר בדיקות והערות), ראו **[TEST_INVENTORY.md](TEST_INVENTORY.md)**.

## חזון

**כל שינוי עתידי — לא רק בפיצ'ר החסימה — צריך לעבור בדיקה אוטומטית לפני שהוא מגיע ל-production.** הפריסה ל-Vercel קורית אוטומטית אחרי מיזוג ל-`main`, כך שהגנה על `main` (ראו [Branch Protection](#-שלב-ידני-הגנה-על-main) למטה) שקולה להגנה על production.

## שלוש השכבות

### 1. יחידה (Unit) — Vitest

בודקות פונקציות טהורות בבידוד מלא, בלי רשת, בלי DB.

```bash
npm test          # הרצה חד-פעמית
npm run test:watch
npm run test:coverage
```

**דוגמאות בפרויקט:** `src/lib/dashboard/calendarDates.test.ts`, `src/lib/availability/blocking.test.ts`, `src/lib/bookings/normalizer.test.ts`.

### 2. אינטגרציה (Integration) — Vitest + מוקים

בודקות handlers שלמים (`GET`/`POST` של route.ts) עם Beds24 ו-Supabase **מדומים** (`vi.mock`), כדי לתפוס באגים באינטגרציה בין הלוגיקה לבין ה-API routes בלי לגעת בשירותים חיים.

- `src/__tests__/fixtures/beds24.ts` — תגובות Beds24 קבועות לשימוש חוזר.
- `src/__tests__/helpers/fakeSupabase.ts` — קליינט Supabase מדומה בזיכרון.
- דוגמה: `src/app/api/dashboard/rooms/route.test.ts` — תרחיש round-trip מלא (חסימה → GET מציג חסום → שחרור → GET מציג פתוח).

### 3. E2E מדומה — Playwright

בודקות זרימת משתמש שלמה בדפדפן (אמיתי, headless), אבל **ללא רשת חיה** — כל קריאות ה-API מיורטות עם `page.route()` ומקבלות תגובות מוכנות מראש. ההתחברות נעשית בהזרקת session cookie חתום (ולא טופס login אמיתי), כדי שלא להיות תלויים ב-DB אמיתי.

```bash
npm run test:e2e              # מריץ build + start + בדיקות
npx playwright test --headed  # לראות את הדפדפן בזמן ריצה
npx playwright show-report    # לפתוח דוח HTML אחרי כשלון
```

**דוגמה:** `e2e/calendar-blocking.spec.ts`.

> ⚠️ הבדיקה מריצה `next build && next start` (דרך `playwright.config.ts`), כך שבפעם הראשונה לוקלית היא עלולה לקחת דקה-שתיים.

## כלל אצבע לפיצ'ר חדש

| סוג השינוי | מה להוסיף |
|---|---|
| לוגיקה טהורה חדשה (חישוב, פרסור, טרנספורמציה) | Unit test בקובץ `*.test.ts` צמוד למקור |
| endpoint חדש או שינוי ב-route.ts קיים | Integration test עם Beds24/Supabase מדומים |
| שינוי בזרימת משתמש (קליק, טופס, ניווט) בלוח השנה/הזמנות | תרחיש Playwright אחד (לא regression מלא — smoke ממוקד) |

## עקרון מנחה: הכל מדומה (Mock-only)

שלוש השכבות **לא** מבצעות אף פעם קריאה חיה ל-Beds24 או Supabase אמיתיים. זו החלטה מכוונת:

- ריצה מהירה ודטרמיניסטית (אין תלות ברשת/quota/rate-limit של Beds24).
- אין סיכון לשינוי בפועל בנתונים אמיתיים (למשל חסימת תאריך אמיתי) בזמן ריצת בדיקות.
- CI לא צריך secrets אמיתיים — `ci.yml` מזריק ערכי דמה בלבד.

אם בעתיד יתעורר צורך בבדיקה חיה (למשל dry-run מתוזמן מול חדר בדיקה ייעודי ב-Beds24), זו תוספת נפרדת ומכוונת (למשל workflow לילי), לא חלק מה-required checks שחוסמים מיזוג.

## איך זה רץ ב-CI

`.github/workflows/ci.yml` מגדיר שני jobs שרצים על כל push/PR ל-`main`:

- **`test`** — `npm test` (unit + integration) → `tsc --noEmit` → `npm run build`.
- **`e2e`** — מתקין דפדפן Chromium → `npx playwright test` (כולל build+start פנימי). בכשלון, דוח HTML מועלה כ-artifact.

### שלב ידני: הגנה על `main`

כדי שכשלון ב-CI **יחסום בפועל** מיזוג (ולא רק יוצג כ-✗ שאפשר להתעלם ממנו), יש להגדיר ב-GitHub, ידנית, פעם אחת:

**Settings → Branches → Add rule** על `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging → סמנו `test` ו-`e2e`

בלי זה, ה-CI רק "מריץ ובודק" אבל לא באמת מונע מיזוג של קוד שנכשל.
