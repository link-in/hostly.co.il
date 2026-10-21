# Landing Page Builder Wizard — plan & status

A split-screen wizard that lets a property manager generate a standalone
direct-booking website: controls on one side, a live browser-mockup preview on
the other, updating on every change.

- Route: `/dashboard/site-builder` (branch `feat/landing-builder-wizard`)
- Feature flag: `isSiteBuilderEnabled()` — on with `npm run dev`, otherwise only
  when `NEXT_PUBLIC_SITE_BUILDER_ENABLED=true` (e.g. a Vercel preview env).
- Login locally via `/demo` (demo user), then open the route.

## Status

| # | Phase | Status |
|---|-------|--------|
| 1 | Split-screen skeleton (wizard panel + live preview) | Done |
| 2 | State management for the draft | Done |
| 3 | Two mock templates rendered in the preview, incl. booking widget mock | Done |
| 4 | "Import from Hostly" — real property data from Supabase | Todo (demo fixture wired) |
| 5 | "Generate with AI" | Todo (button + reducer action ready, disabled in UI) |
| 6 | Persist draft, upload images to Storage, publish to subdomain | Todo |
| 7 | Real booking engine on the published site (availability + Cardcom) | Todo |
| 8 | E2E tests + nav entry + remove flag | Todo |

## Architecture

```
src/lib/landingBuilder/            # framework-free domain logic, unit tested
  types.ts                         # Zod schemas: LandingDraft, PropertyContent, GeneratedContent
  draftReducer.ts                  # pure reducer + actions (single source of truth)
  selectors.ts                     # buildPreviewModel (placeholders), getCoverImage, isStepComplete
  templates.ts                     # template registry metadata (id, name, swatches)
  calendarGrid.ts / dateRange.ts   # booking calendar grid + stay-range selection rules
  pricing.ts                       # stay total + ILS formatting (direct = no markup)
  previewZoom.ts                   # virtual viewport widths + zoom-to-fit
  amenities.ts                     # add/remove amenity rules
  demoProperty.ts                  # fixture used until phase 4
  mockAvailability.ts              # fake occupancy until phase 7
  featureFlag.ts

src/app/dashboard/site-builder/    # the wizard (client UI only)
  page.tsx                         # server: auth + flag gate
  SiteBuilderWizard.tsx            # provider + split layout
  site-builder.css                 # Tailwind-vs-Bootstrap cascade fix (see Gotchas)
  state/BuilderProvider.tsx        # Context + useReducer; useBuilderState / useBuilderDispatch
  state/importPropertyContent.ts   # import adapter — swap body for a server action in phase 4
  state/uploadedImages.ts          # File -> blob: preview image
  components/wizard/*              # header (value prop), stepper (accordion), footer nav
  components/steps/*               # TemplateStep, ImportStep, CustomizeStep (+ customize/*)
  components/preview/*             # LivePreview, PreviewToolbar, BrowserFrame, ScaledViewport

src/components/landing-templates/  # shared by the preview and (phase 6) the public site
  TemplateRenderer.tsx             # templateId -> component
  MinimalistModernTemplate.tsx
  CozyWarmTemplate.tsx
  booking/*                        # BookingWidget (client island), calendar, summary, checkout mock
  shared/TemplateImage.tsx
```

### State

`BuilderState = { draft: LandingDraft, activeStep, previewDevice }`.
Actions (see `draftReducer.ts`): `template/selected`, `step/activated`,
`preview/deviceChanged`, `property/imported`, `content/edited`,
`content/generated`, `images/added`, `images/removed`, `images/coverSelected`,
`draft/reset`.

Rules worth knowing:
- Re-import replaces imported images but keeps manual uploads.
- Removing the cover falls back to the next image; AI can only pick a cover id
  that exists in the draft.
- `contentOrigin` tracks the last source (`import` / `ai` / `manual`) — useful
  for analytics and "AI wrote this" hints.
- The preview never shows empty sections: `buildPreviewModel` fills per-field
  placeholders.

### Decisions

- **Context + `useReducer`, not Zustand** — no new dependency, and the pure
  reducer is trivially unit-testable. Two contexts (state / dispatch) so
  dispatch-only components don't re-render.
- **Real-width preview** — `ScaledViewport` lays the page out at 1280px
  (desktop) or 390px (mobile) and applies CSS `zoom` to fit. Templates use
  container queries (`@3xl:`), so the preview shows the true desktop/mobile
  layout regardless of the dashboard's own width.
- **RTL** — controls sit on the inline-start side (right in Hebrew), preview on
  the left. Swap the two children in `SiteBuilderWizard.tsx` to mirror.
- **Templates outside the route** — `src/components/landing-templates` has no
  dashboard dependencies so the public site can render the same components.
  Only `BookingWidget` is a client component.
- **`<img>` not `next/image` in templates** — sources include `blob:` uploads and
  arbitrary channel CDNs that `next.config.ts` `remotePatterns` doesn't cover.

## Gotchas

- `bootstrap.min.css` and `globals.css` (`* { padding: 0; margin: 0 }`) are
  **unlayered**, so they beat every Tailwind v4 utility (which lives in
  `@layer utilities`). Inside `.site-builder` this is undone with
  `all: revert-layer` (`site-builder.css`). Any new Tailwind surface outside the
  builder (e.g. the public site in phase 6) needs the same treatment.
- Inside `.site-builder`, avoid class names Bootstrap also defines with
  `!important`: `p-3..5`, `m-3..5`, `gap-3..5`, bare `border`, bare `rounded`,
  `shadow`, `shadow-sm`, `shadow-lg`, `text-start/end`, `start-0/end-0`,
  `container`, `placeholder`. Use e.g. `p-2.5`, `p-6`, `border-[1px]`,
  `ring-1`, `rounded-xl`, `shadow-xl`.
- Don't use the shared `hostly-btn` `Button` inside the builder — the reset
  overrides it. Use `components/ui/BuilderButton.tsx`.
- `dashboard-surfaces.css` forces `background: transparent !important` on any
  `<main>` inside `.hostly-main-panel` — don't use `<main>` in templates.

## Existing system to reconcile

- Old landing system: tables `landing_pages` (one per user, `subdomain`),
  `landing_sections` (JSON content per section), `landing_images` (bucket
  `landing-images`), editor at `/dashboard/landing` (hidden by HOS-17 flag),
  renderers at `/sites/[site]` and `/[site]`.
- Direct booking already exists for the embed calendar: `/api/public/property`,
  `/api/public/calendar`, `/api/public/booking` (API-key auth, `api_keys` table),
  `booking_payments` table, Cardcom client in `src/lib/cardcom`, Beds24 booking
  created after payment.
- Availability/prices: `availability_cache` (`user_id, room_id, date, price,
  num_avail, min_stay`).

## Next phases

### Phase 4 — Import from Hostly
Supabase does **not** currently store property content (texts, pictures,
amenities); `/api/dashboard/properties` proxies Beds24 live.
1. Add a cache table, e.g. `property_content_cache (user_id, property_id,
   room_id, payload jsonb, synced_at)`, filled from Beds24 V2 `GET /properties`
   with `includeAllRooms`, `includeTexts`, `includePictures` (confirm exact
   parameter names in the Beds24 V2 docs). Refresh it during onboarding and from
   the existing cron.
2. Server action `importPropertyContent(roomId)` in
   `src/app/dashboard/site-builder/actions.ts`: `getServerSession` -> read cache
   by `user_id` -> map to `PropertyContent` -> `propertyContentSchema.parse`.
   Fallback: live Beds24 fetch via `fetchWithTokenRefresh` if the cache is empty.
3. Replace the body of `state/importPropertyContent.ts`; remove the "demo data"
   note in `ImportStep`. Room selection: default to `RoomContext`'s selected room.
4. Tests: mapper unit tests with a Beds24 fixture (pick highest-res picture,
   strip HTML from descriptions, dedupe amenities).

### Phase 5 — Generate with AI
1. Server action `generateLandingContent(draft)`; the model provider is TBD (no
   AI SDK in the repo yet; key in env, server-only).
2. Input: imported name/description/amenities/city + image list (ids + alt;
   optionally vision captions). Output must pass `generatedContentSchema`;
   then `dispatch({ type: 'content/generated', generated })`.
3. Cover choice: prefer landscape, bright, exterior/view shots; the reducer
   already ignores ids not in the draft.
4. Enable the button in `AiGenerateCard` (requires `propertyId`), loading state
   via `useTransition`, rate-limit per user.

### Phase 6 — Persist & publish
1. Schema: add `template_id` + `draft jsonb` + `published_at` to `landing_pages`
   (or a new `landing_drafts` table); validate with `landingDraftSchema` on save.
2. Autosave (debounced) via server action; load the draft into
   `BuilderProvider initialDraft`.
3. Upload `source: 'upload'` images to bucket `landing-images` (reuse
   `/api/landing/upload` logic), replace `blob:` URLs with public URLs.
4. Subdomain picker + publish; `/sites/[site]` renders `TemplateRenderer` from
   the published draft (apply the CSS reset there too).
5. Decide the fate of the old `/dashboard/landing` editor (migrate or remove).

### Phase 7 — Real booking engine
1. Replace `isMockBooked` with `availability_cache` rows (`num_avail = 0` ->
   blocked), respect `min_stay`, nightly price per date.
2. Direct-booking price = cached price as-is. The 1.21 multiplier is for Airbnb
   pricing only and must not be applied here.
3. Checkout: reuse the embed flow (`/api/public/booking` -> `booking_payments`
   -> Cardcom redirect -> webhook -> Beds24 booking). Auto-provision an API key
   per published site, or add a session-less server route keyed by subdomain.
4. Re-validate price and availability server-side before creating a payment.

### Phase 8 — Hardening
- Playwright `e2e/site-builder.spec.ts`: template switch, import, edit text ->
  preview updates, mobile toggle, date selection -> checkout.
- Add the page to `dashboardNav.ts`, remove the feature flag.
- a11y pass (keyboard nav in the calendar, focus management between steps).

## Open questions

- One site per user, or one per property/room? (`landing_pages.user_id` is
  `UNIQUE` today.)
- Which AI provider/model, and who pays for usage (plan tier)?
- Custom domains in addition to `*.hostly.co.il`?
