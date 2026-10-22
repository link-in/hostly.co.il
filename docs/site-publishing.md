# Publishing the booking site (subdomain + custom domain)

Status: plan (not implemented). Part of phase 6 in
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

The booking widget is still a mock (fake availability, fake checkout). A public
page must not take fake bookings. Two ways forward:
- **A. Wait for phase 7** (availability_cache + Cardcom) and publish with real booking.
- **B. Publish earlier in "inquiry mode"**: the widget shows real prices/dates
  but the CTA sends a WhatsApp/phone/email inquiry instead of checkout; switch
  to checkout when phase 7 lands.

## Data model (migration 011)

Reuse `landing_pages` (already one-per-user with a unique subdomain) so the old
and new systems share one address space:

```sql
ALTER TABLE landing_pages
  ADD COLUMN published_draft  JSONB,        -- snapshot of the wizard draft (storedDraftSchema)
  ADD COLUMN published_at     TIMESTAMPTZ,
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
2. **Pre-publish checks** (pure, unit-tested `getPublishBlockers(draft)`):
   template chosen, title, at least one hosted image, nightly price, property
   connected, no `blob:` images (save first), booking mode ready (A or B above).
3. **`publishSiteAction`**: session + flag, not demo, validate with
   `storedDraftSchema`, property ownership, upsert `landing_pages`
   (`subdomain`, `published_draft`, `published_at`), then
   `revalidatePath` for the site.
4. **Public renderer**: `/sites/[site]` reads `published_draft` with the anon
   client (only published columns), renders `TemplateRenderer`, applies the
   Tailwind-vs-Bootstrap reset (public layout must not load Bootstrap/globals at
   all — cleaner than the `revert-layer` workaround).
5. **SEO/sharing**: `generateMetadata` (title, description, OG image = cover),
   `robots`/`sitemap` per site, canonical URL.
6. **Images**: serve resized copies (Beds24 PNGs are ~3 MB) — `next/image` with
   `remotePatterns` for `media.xmlcal.com` and the Supabase bucket.
7. **Dashboard**: after publishing show the live URL, "copy link", "view site",
   "unpublish", and "unpublished changes" when the draft differs from the snapshot.

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
