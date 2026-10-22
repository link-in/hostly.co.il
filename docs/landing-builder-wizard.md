# Landing Page Builder Wizard — plan & status

A split-screen wizard that lets a property manager generate a standalone
direct-booking website: controls on one side, a live browser-mockup preview on
the other, updating on every change.

- Route: `/dashboard/site-builder` (branch `feat/landing-builder-wizard`),
  sidebar item "בונה אתר הזמנות".
- Feature flag: `isSiteBuilderEnabled()` — on with `npm run dev`, otherwise only
  when `NEXT_PUBLIC_SITE_BUILDER_ENABLED=true` (e.g. a Vercel preview env).
  Gates the page, the sidebar item and the import server action.
- Login locally via `/demo` (demo user), then open the route. Demo users import
  `DEMO_PROPERTY`; real users import their Beds24 property.

## Status

| # | Phase | Status |
|---|-------|--------|
| 1 | Split-screen skeleton (wizard panel + live preview) | Done |
| 2 | State management for the draft | Done |
| 3 | Two mock templates rendered in the preview, incl. booking widget mock | Done |
| 4 | "Import from Hostly" — real property data (Beds24 texts/amenities + Supabase images) | Done |
| 5 | "Generate with AI" | Todo (button + reducer action ready, disabled in UI) |
| 6 | Persist draft, upload images to Storage, publish to subdomain | Partly done: save/resume + uploads + full-screen preview; publish blocked on phase 7 |
| 7 | Real booking engine on the published site (availability + Cardcom) | Todo |
| 8 | E2E tests + remove flag (nav entry done) | Todo |

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
  demoProperty.ts                  # demo-user import result + test fixture
  mockAvailability.ts              # fake occupancy until phase 7
  featureFlag.ts
  import/                          # phase 4 — property import
    beds24Property.ts              # Zod schema for GET /properties + query params
    localizedText.ts               # he > en > any language, HTML stripping
    featureCodes.ts                # Beds24 featureCodes -> Hebrew amenity labels
    mapBeds24Property.ts           # pure Beds24 -> PropertyContent mapper
    importPropertyContent.ts       # orchestrator (deps injected), room ownership, demo users
    fetchBeds24Property.ts         # I/O: Beds24 via fetchWithTokenRefresh
    loadLandingImages.ts           # I/O: landing_images from Supabase
    findBeds24Pictures.ts          # picture strategy: V1 API with propKey, else public URLs
    beds24V1Pictures.ts            # Zod schema + pure picture selection for V1 getPropertyContent
    fetchBeds24V1Pictures.ts       # I/O: V1 JSON API
    beds24PropKey.ts               # per-property propKey (users.beds24_prop_key / env)
    beds24PublicPictures.ts        # fallback: probe media.xmlcal.com URL pattern
    errors.ts                      # error codes -> Hebrew messages
    beds24PropertyFixture.ts       # trimmed real Beds24 response for tests

src/app/dashboard/site-builder/    # the wizard (client UI only)
  page.tsx                         # server: auth + flag gate
  actions.ts                       # server actions: importPropertyContentAction
  draftActions.ts                  # server actions: saveDraftAction, signImageUploadAction
  state/DraftPersistence.tsx       # save state (dirty / saving / savedAt), leave-page warning
  state/persistDraft.ts            # upload blob: images via signed URLs, then save the draft
  SiteBuilderWizard.tsx            # provider + split layout
  (reset: src/components/landing-templates/landing-reset.css — Tailwind-vs-Bootstrap fix, see Gotchas)
  state/BuilderProvider.tsx        # Context + useReducer; useBuilderState / useBuilderDispatch
  state/importPropertyContent.ts   # client adapter: calls the action, throws Hebrew errors
  state/uploadedImages.ts          # File -> blob: preview image
  components/wizard/*              # header (value prop), stepper (accordion), footer nav
  components/steps/*               # TemplateStep, ImportStep, CustomizeStep (+ customize/*)
  components/preview/*             # LivePreview, PreviewToolbar, BrowserFrame, ScaledViewport, FullScreenPreview

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
  `all: revert-layer` (`src/components/landing-templates/landing-reset.css`). Any new Tailwind surface outside the
  builder (e.g. the public site in phase 6) needs the same treatment.
- Inside `.site-builder`, avoid class names Bootstrap also defines with
  `!important`: `p-3..5`, `m-3..5`, `gap-3..5`, bare `border`, bare `rounded`,
  `shadow`, `shadow-sm`, `shadow-lg`, `text-start/end`, `start-0/end-0`,
  `container`, `placeholder`. Use e.g. `p-2.5`, `p-6`, `border-[1px]`,
  `ring-1`, `rounded-xl`, `shadow-xl`.
- Don't use the shared `hostly-btn` `Button` inside the builder — the reset
  overrides it. Use `components/ui/BuilderButton.tsx`.
- Client code must read env vars as direct `process.env.X` members — Next.js
  only inlines those; `process.env` as an object is empty in the browser
  (that's why `isSiteBuilderEnabled` takes `{ nodeEnv, flag }`).
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

### Phase 4 — Import from Hostly (done)
Flow: `ImportStep` -> `importPropertyContentAction(selectedRoomId)` ->
`importPropertyContent` -> Beds24 `GET /properties?id=…&includeAllRooms&includeTexts=all&includeLanguages=all&includePictures`
+ `landing_images` -> `mapBeds24Property` -> `propertyContentSchema`.

What the real Beds24 V2 response contains (checked against property 306559):
- **Texts** per language. Room texts (`displayName`, `contentHeadline`,
  `contentDescription`) are usually in Hebrew; property texts
  (`propertyDescription1`) are often English HTML. The mapper prefers room ->
  property and he -> en -> any language, and strips HTML.
- **Amenities** as `featureCodes`, e.g. `[["AIR_CONDITIONING"], ["BEDROOM","BED_DOUBLE"]]`.
  Mapped to Hebrew labels in `featureCodes.ts` (unknown codes are skipped);
  bedroom/bathroom groups become "2 חדרי שינה" / "חדר רחצה".
- **Price/guests**: `rackRate` (else `minPrice`) as the nightly price, `maxPeople`.
- **No pictures in V2** — `includePictures=true` returns no picture field at all
  (documented: "API V2 does not return property or room pictures yet").

Pictures (`findBeds24Pictures.ts`), merged after `landing_images` (old editor
uploads, hero first) and de-duplicated by URL:
1. **V1 JSON API** `POST https://api.beds24.com/json/getPropertyContent`
   `{ authentication: { apiKey, propKey }, images: true }`. Returns
   `images.hosted` / `images.external` slots with `url` and
   `map: [{ propId, roomId?, position }]`. Room-assigned pictures win (room
   order), then property pictures, then unassigned ones. The response `propId`
   must match the session property.
   - `apiKey` = `BEDS24_API_KEY` (account-wide). `propKey` is per property:
     `users.beds24_prop_key` (migration 009, service-role read only, never in
     the session), falling back to `BEDS24_PROP_KEY` only when
     `BEDS24_PROPERTY_ID` is the same property.
2. **Fallback** when there is no propKey or V1 fails: probe the undocumented
   public pattern `https://media.xmlcal.com/pic/p{id[0..4]}/{id[4..8]}/{NN}.png`
   (id zero-padded to 8 digits) with HEAD requests for slots 01–24. Order is
   file number, not the Beds24 position; duplicates can't be detected (no
   size/ETag/Range support), so the user removes them in Customize.

Onboarding (manual, per customer): import the Airbnb listing in Beds24
(CHANNEL MANAGER > AIRBNB > View listings > Import — pictures come without
captions), set SETTINGS > PROPERTIES > LINK > propKey (16+ chars), store it in
`users.beds24_prop_key`. Uploaded pictures are ~3 MB PNGs; the public site
(phase 6) must serve resized copies.

Security: `propertyId`/`room_id` come from the session only; a room requested by
the client is honored only if it is in the user's `room_id` field; non-numeric
ids never reach Beds24; demo users get `DEMO_PROPERTY`.

Not done (by choice): no cache table — import is one read-only Beds24 call per
click. Add `property_content_cache` if this becomes hot or rate-limited.

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
Done:
- Table `landing_builder_drafts` (migration 010; `user_id` PK, `draft jsonb`,
  `updated_at`, service-role only). `page.tsx` loads it into
  `BuilderProvider initialDraft`; a draft that no longer validates is ignored.
- Manual save (footer button: שמירה / שומר… / נשמר, last-save time in the
  tooltip) and a `beforeunload` warning while there are unsaved changes.
  "Dirty" = `draftFingerprint(draft)` differs from the last saved one.
- Uploads: on save, every `blob:` image is uploaded straight to bucket
  `landing-images` at `{userId}/site-builder/{uuid}.{ext}` through a signed
  upload URL (no function body limit), then `images/persisted` swaps the URL.
  Types: JPG/PNG/WebP/GIF/AVIF, up to 10 MB; the server picks the path.
- `saveDraftAction` validates with `storedDraftSchema` (https images only, ≤ 60),
  rejects a draft for another property, and is disabled for demo users.
- Full-screen preview ("תצוגה מקדימה") of the unsaved draft at real browser
  width, desktop/mobile, Esc to close. Portaled to `<body>` because the sticky
  preview column is its own stacking context.

Todo (full plan: [site-publishing.md](./site-publishing.md)):
1. Publish — blocked on phase 7: the booking widget is still a mock, so a public
   page would take fake bookings. Then: subdomain picker, `published_at` /
   published snapshot, `/sites/[site]` renders `TemplateRenderer` (with the CSS
   reset), serve resized images.
2. Optional autosave (debounced) once saving is proven.
3. Clean up Storage files of images removed from a saved draft.
4. Decide the fate of the old `/dashboard/landing` editor (migrate or remove).

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
- Remove the feature flag (`featureFlag.ts`; the nav item in `dashboardNav.ts`
  is filtered by `isDashboardNavPageVisible`).
- a11y pass (keyboard nav in the calendar, focus management between steps).

## Open questions

- One site per user, or one per property/room? (`landing_pages.user_id` is
  `UNIQUE` today.)
- Which AI provider/model, and who pays for usage (plan tier)?
- Custom domains in addition to `*.hostly.co.il`?
