# Publishing the booking site (subdomain + custom domain)

Status: P1 implemented (subdomain publish in inquiry mode); P2 planned. Part of phase 6 in
[landing-builder-wizard.md](./landing-builder-wizard.md). Last updated 2026-10-22.

## Where each site lives — options

| Option | Example | Verdict |
|--------|---------|---------|
| Path on our domain | `hostly.co.il/dafna` | Not for guests. Same origin as the dashboard (session cookies, XSS blast radius), weak branding/SEO. Keep only as an internal fallback. |
| Subdomain of ours | `dafna.hostly.co.il` | **Default for every customer.** Free, instant, no DNS work for the customer. |
| Customer's own domain | `mountain-view-dafna.co.il` | **Optional upgrade** (paid add-on candidate). Customer adds a DNS record once; SSL is automatic. |

Recommendation: every published site gets a subdomain; a custom domain can be
attached on top. When a custom domain is active, the subdomain 301-redirects to
it and it is the canonical URL.

## What already exists (checked 2026-10-22)

- `hostly.co.il` uses Vercel DNS; `*.hostly.co.il` resolves to Vercel and a
  wildcard SSL certificate (`*.hostly.co.il`) is already issued. **But the
  wildcard is not attached to the project**: any subdomain (including the old
  `dalit`) returns Vercel's `DEPLOYMENT_NOT_FOUND`. One-time fix: Vercel ->
  project -> Settings -> Domains -> add `*.hostly.co.il`. No per-customer DNS
  records are ever needed after that. **Done 2026-10-22**: unknown subdomains
  now hit the app's `/[site]` 404 and `dalit.hostly.co.il` serves the old site.
- Todo: on customer subdomains, `/dashboard`, `/admin` and private `/api` routes
  are still reachable (the proxy skips them) — redirect them to `hostly.co.il`.
- `src/proxy.ts` rewrites `{sub}.hostly.co.il/*` -> `/{sub}/*` (reserved names:
  www, api, admin, dashboard, app, mail, ftp, webmail, test, dev, staging).
- Routes `/[site]` and `/sites/[site]` render the **old** landing system from
  `landing_pages` (`subdomain TEXT UNIQUE`, `^[a-z0-9-]+$`, one row per user).
- `mountain-view-dafna.co.il` (Cloudflare DNS) already points to Vercel — the
  custom-domain model works in practice, just not managed from Hostly yet.

## Prerequisite: real booking (phase 7)

Resolved with option B (see Decisions): sites are live in inquiry mode with
real availability and prices; checkout is the remaining part of phase 7.
Original options:
- **A. Wait for phase 7** (availability_cache + Cardcom) and publish with real booking.
- **B. Publish earlier in "inquiry mode"**: the widget shows real prices/dates
  but the CTA sends a WhatsApp/phone/email inquiry instead of checkout; switch
  to checkout when phase 7 lands.

## Data model

Reuse `landing_pages` (already one-per-user with a unique subdomain) so the old
and new systems share one address space. Migration 011 (P1, done) adds
`published_draft JSONB` (snapshot, `storedDraftSchema`) and `published_at`.
P2 will add, in its own migration:

```sql
ALTER TABLE landing_pages
  ADD COLUMN custom_domain    TEXT UNIQUE,  -- lowercase hostname, no scheme/path
  ADD COLUMN domain_status    TEXT NOT NULL DEFAULT 'none'
    CHECK (domain_status IN ('none', 'pending', 'active', 'error'));
```

- The wizard keeps editing `landing_builder_drafts`; **Publish copies** the draft
  into `published_draft`, so edits never go live until the next publish.
- Rendering: `published_draft` present -> new `TemplateRenderer`; otherwise the
  old `LandingPageClient` (existing customers keep working).
- Unpublish = `published_draft = NULL` (subdomain stays reserved).

## Phase P1 — Publish to a subdomain

1. **Subdomain picker** — done: wizard step 4 "כתובת ופרסום"
   (`SiteAddressField`), stored as `draft.siteAddress`.
   - Rules in `src/lib/landingBuilder/siteAddress.ts`: 3–30 chars,
     `[a-z0-9-]`, no leading/trailing hyphen, not in `RESERVED_SITE_ADDRESSES`
     (shared with `src/proxy.ts`). Input is normalized as you type
     (`Your_Domain` -> `your-domain`).
   - Default: the user's existing `landing_pages.subdomain`; otherwise on import
     `suggestSiteAddress` (English name > English city > transliterated Hebrew
     name). Beds24 has no Airbnb listing name for us (empty in V1 `airbnb.name`).
   - Live availability (`checkSiteAddressAction`, 400 ms debounce): available /
     yours / taken. The address is reserved only at publish time.
2. **Pre-publish checks** — done: `publishing/publishBlockers.ts`
   (`getPublishBlockers`): template, hero title, cover image, valid address,
   at least one contact detail, contact details well-formed, no `blob:` images.
   Shown as a checklist in step 4 and as the publish button's tooltip.
3. **Contact block (inquiry mode)** — done: `draft.contact` {whatsapp, phone,
   email} (`contact.ts`), edited in step 4, seeded from the old
   `meta_settings`. Stored leniently so half-typed values still save;
   `getInvalidContactFields` gates publishing. The booking widget no longer
   shows mock availability or mock checkout: after picking dates the guest gets
   "שליחת בקשה בוואטסאפ" (wa.me with the dates) or email, plus call/mail links
   (`InquiryActions`).
4. **`publishSiteAction`** — done (`draftActions.ts` -> `publishing/publishDraft.ts`,
   dependencies injected, unit-tested): session + flag, not demo,
   `storedDraftSchema`, property ownership, blockers, address availability,
   save the draft, upsert `landing_pages` on `user_id` (`subdomain`,
   `site_title`, `site_subtitle`, `published_draft`, `published_at`). A unique
   violation on `subdomain` (race) maps to "taken". The client saves first
   (uploads `blob:` images), then publishes the hosted draft
   (`state/SitePublishing.tsx`). Changing the address on an existing row moves
   the site: the old subdomain stops working.
5. **Public renderer** — done: `/[site]` and `/sites/[site]` render
   `PublishedSite` (TemplateRenderer in `.site-builder @container`) when
   `published_draft` exists, else the old `LandingPageClient`. Loading errors
   fall back to the old renderer (`findPublishedDraft`). Still on the root
   layout (Bootstrap + PWA banner) — a dedicated public layout is a todo.
6. **SEO/sharing** — partly done: `buildPublishedSiteMetadata` (title,
   description, canonical subdomain URL, OG image = cover). Todo: per-site
   `robots`/`sitemap`.
7. **Images** (todo): serve resized copies (Beds24 PNGs are ~3 MB) — `next/image` with
   `remotePatterns` for `media.xmlcal.com` and the Supabase bucket.
8. **Dashboard** — partly done: step 4 shows "האתר באוויר" with the live link,
   last publish time and "יש שינויים שעוד לא פורסמו"; the button reads
   פרסום האתר / עדכון האתר / האתר מעודכן. Todo: copy link, unpublish.

## Availability & price sync (done 2026-10-22)

The booking widget shows real Beds24 data (still inquiry mode, no checkout):
- Source: `availability_cache` (per user/room/date), horizon raised to
  `CACHE_HORIZON_MONTHS = 12`. Beds24 only returns nights that have a price —
  nights past the last priced date show as unavailable (Dafna: prices end
  2027-02-23, so prices must be extended in Beds24 for a full year).
- Public: `GET /api/sites/{address}/availability` -> `{ nights: [{date, price,
  available, minStay}] }`, edge-cached 5 min. Looks up `user_id` + `roomId`
  from `published_draft`.
- Wizard preview: `getPreviewAvailabilityAction(roomId)` (session user's cache /
  tokens only).
- Both go through `loadSiteAvailability`: fresh cache (< 30 min) -> else live
  Beds24 + re-warm via `after()` -> else stale cache. Client side:
  TanStack Query (`useNightlyRates`, `AvailabilitySourceProvider`); no source or
  a failed load = open inquiry mode (only past nights blocked).
- Widget: booked / unpriced nights blocked, total = sum of nightly prices
  (direct booking, no 1.21 multiplier), check-in night's `minStay` enforced,
  "החל מ-" = lowest available nightly price, the WhatsApp/email inquiry includes
  the dates and the site price.
- Freshness: booking webhooks refresh the room; publishing re-warms it; cron
  `/api/cron/site-availability` (02:00 UTC) refreshes every published room to
  catch price / min-stay changes, which Beds24 sends no webhook for.
- Prices are `price1` (1-guest price) — per-guest pricing (`prices` column) is
  not migrated in this DB yet.

## Phase P2 — Customer's own domain

Flow for the customer (dashboard "דומיין אישי"):
1. Enters `mountain-view-dafna.co.il` (and optionally `www.`).
2. Hostly adds it to the Vercel project via the Vercel REST API
   (`POST /v10/projects/{project}/domains`), stores `custom_domain`,
   `domain_status = 'pending'`.
3. Dashboard shows the exact DNS records **as returned by Vercel** for that
   domain (apex: an `A` record; `www`: a `CNAME`) with copy buttons and a short
   guide per registrar (Cloudflare: set the record to "DNS only", not proxied).
4. "Check connection" button + a cron re-check: Vercel domain config/verify
   endpoints -> `active` or `error` with a Hebrew explanation. SSL is issued by
   Vercel automatically once DNS is correct.
5. Removing the domain removes it from the Vercel project too.

Routing changes in `src/proxy.ts`:
- Host is not `hostly.co.il`, `*.hostly.co.il`, `*.vercel.app` or localhost ->
  look up `custom_domain` -> rewrite to `/sites/{subdomain}`; unknown host -> 404.
- The lookup runs on every request: cache host -> subdomain (in-memory with a
  short TTL, or Vercel Edge Config) and keep the query to one indexed column.
- `{sub}.hostly.co.il` with an active custom domain -> 301 to the custom domain.

Server-side needs: `VERCEL_API_TOKEN` (scoped to the team), `VERCEL_PROJECT_ID`,
`VERCEL_TEAM_ID` — server-only env vars. Check the plan's domains-per-project
limit before selling this widely.

Things that must respect the site's host (both P1 and P2): Cardcom success/fail
redirect URLs, links in booking confirmation emails, canonical URLs.

## Security notes

- Public pages read only published columns; never the draft table, tokens or
  `beds24_prop_key`.
- Domain ownership is proven by DNS (Vercel verification) — never trust a
  domain string alone; one domain can belong to one site only (`UNIQUE`).
- Guest sites never share the dashboard's origin (that's why paths on
  `hostly.co.il` are not offered to guests).

## Tests

- Unit: subdomain rules + reserved names, `getPublishBlockers`, host -> site
  resolution in the proxy (pure function), domain status mapping.
- Server actions: ownership, demo users, taken subdomain, invalid draft.
- Playwright: publish -> open `{sub}.localhost`-style host header -> page shows
  the published title; unpublish -> 404.

## Decisions (2026-10-22)

- **Booking mode: B — publish now in inquiry mode**, switch to checkout in
  phase 7. Inquiry mode needs a contact block (WhatsApp / phone / email) in the
  templates and contact fields in the wizard; the old `meta_settings`
  (`whatsapp_number`, `phone`, `email`, `address`) are the import source.
- **Custom domain: paid add-on.** Every site gets a free subdomain; P2 is gated
  by plan/subscription (`subscriptions` table).
- **Old sites: migrate to the new templates.** As of today there is one old site
  (`dalit`, the Dafna property: hero, features, portfolio, contact, 6 images) —
  its images already flow into the wizard import. Migration = publish the
  wizard draft on the existing `landing_pages` row (same subdomain), mapping
  `meta_settings` into the new contact block; then the old renderer and
  `/dashboard/landing` editor can be removed.

Build order: P1 (subdomain + inquiry mode + contact block + migrate `dalit`)
-> phase 7 (real availability + Cardcom checkout) -> P2 (custom domain add-on).
