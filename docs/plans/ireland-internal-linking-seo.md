> **Partially stale.** Current SEO status, priorities and the indexation watchlist live in [`docs/plans/seo-control-state.md`](seo-control-state.md). Treat the plan below as background, not as a live task list.

# Ireland Internal Linking & SEO — Implementation Plan

> Translates the internal doc **GlobalHealth_InternalLinking_Ireland** into concrete
> work against this codebase. Country/market: **Ireland**. Hard deadline: **launch day**
> (all `HIGH` items live; `MEDIUM` can follow post-launch).

## Context

The spec asks for three things our site does **not** have yet:
1. **Contextual "callout box" internal links** between service pages (GP → specialist
   upgrade paths, specialist → GP entry paths, referral/complementary cross-links) — with
   placement rules, a 4-per-page cap, and descriptive anchor text.
2. **SEO landing pages** (`/ireland/hypertension`, `/diabetes`, `/migraine`,
   `/arabic-speaking-doctor`, etc.) — indexed in the sitemap, but kept out of the nav and
   the service-listing page.
3. **301 redirects** from old slugs to new slugs on launch day (no slug may 404).

### What already exists (reuse, don't rebuild)
- **Routing**: `frontend/app/(site)/[country]/[lang]/…`. `[country]` is a **slug**
  (`ireland`, not `ie`); `[lang]` is a locale code (`en`). Service detail renders at
  `frontend/app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx`; the GP/specialist
  hubs are `general-consultation`/`specialist-consultation` (Ads-safe public slugs
  `gp-appointment`/`see-a-specialist` via rewrites).
- **Redirects + rewrites**: [`frontend/next.config.ts`](../../frontend/next.config.ts)
  `redirects()` (~L154) and `rewrites()` (~L78) already do country-scoped
  `/:country/:lang/<slug>` mapping. **This is the exact pattern for Rule 7.**
- **Sitemap**: [`frontend/app/sitemap.ts`](../../frontend/app/sitemap.ts) — emits country
  homes, `gp-appointment`, `see-a-specialist`, `book`, doctor profiles. Landing pages are
  NOT emitted yet.
- **Robots/nav**: [`frontend/app/robots.ts`](../../frontend/app/robots.ts),
  `frontend/components/layout/SiteHeader.tsx` + `SectionNav.tsx` (nav is built dynamically
  per country from enabled features).
- **Service model**: `Service` (+ `ServiceTranslation`, `ServiceFaq`) — page body is a
  **single `detailBody` HTML blob** rendered via `dangerouslySetInnerHTML` + a sanitizer
  that allows only `p a h2 h3 img ul ol li span style` (no `div`). So **styled callout
  boxes cannot live inside `detailBody`** — they need a structured field + a real component.

### Gap summary
| Spec need | Status | Work |
|---|---|---|
| 301 redirects (Rule 7) | pattern exists | add 9 Ireland entries |
| Descriptive anchor text (Rule 5) | content rule | author copy; lint |
| Callout boxes (Rules 1–4) | **no component, no data model** | build |
| SEO landing pages (Rule 6) | **no concept** | build |

---

## Phase 1 — Redirects + clean slugs (HIGH, launch-critical, ~½ day)

All in [`frontend/next.config.ts`](../../frontend/next.config.ts). Country-scoped; query
strings are preserved automatically; `[lang]` segment is always present.

### 1a. 301 redirects (Rule 7)
Add to `redirects()` (mirror the existing legacy→Ads-safe block):
```ts
// Ireland internal-linking slug migration (per spec) — country/lang preserved.
{ source: "/:country/:lang/medical-consultation",            destination: "/:country/:lang/acute-medical-consultation",     permanent: true },
{ source: "/:country/:lang/family-medicine-consultation",    destination: "/:country/:lang/chronic-disease-consultation",   permanent: true },
{ source: "/:country/:lang/pain-management-consultation",    destination: "/:country/:lang/musculoskeletal-pain-assessment",permanent: true },
{ source: "/:country/:lang/erectyle-dysfunction-consultation", destination: "/:country/:lang/mens-health-consultation",     permanent: true },
{ source: "/:country/:lang/treatment-refill",                destination: "/:country/:lang/treatment-review",              permanent: true },
{ source: "/:country/:lang/referral-consultation",           destination: "/:country/:lang/referral-and-investigations",   permanent: true },
{ source: "/:country/:lang/self-referral",                   destination: "/:country/:lang/referral-and-investigations",   permanent: true },
{ source: "/:country/:lang/respiractory-infections",         destination: "/:country/:lang/respiratory-infections",        permanent: true },
{ source: "/:country/:lang/sick-leave",                      destination: "/:country/:lang/sick-certificate-ireland",      permanent: true },
```
> ⚠️ Two **source** slugs in the spec are typos (`erectyle`, `respiractory`) — kept verbatim
> on the FROM side on purpose (that's what's indexed/bookmarked). Confirm with content team.

### 1b. Clean top-level slugs → real service pages
The destinations above are **clean** URLs (`/ireland/en/acute-medical-consultation`), but
individual services render under `/services/[serviceSlug]`. So each destination slug needs a
**rewrite** (same trick as `gp-appointment`), pointing the clean URL at the real renderer:
```ts
// beforeFiles rewrites — clean slug → generic service template
{ source: "/:country/:lang/acute-medical-consultation",      destination: "/:country/:lang/services/acute-medical-consultation" },
{ source: "/:country/:lang/chronic-disease-consultation",    destination: "/:country/:lang/services/chronic-disease-consultation" },
// …one per new slug…
```
Then create/rename the matching `Service.slug` rows in admin for the Ireland country so the
template resolves. (Verify the actual live path of each service before wiring — if a service
is already top-level via an existing rewrite, skip its rewrite here.)

**Verify**: `curl -I` each old slug → expect `301` to the new clean URL; new URL → `200`.

---

## Phase 2 — Contextual internal-link callouts (Rules 1–5)

The heart of the spec. Callouts are **structured data + a component**, not free HTML.

### 2a. Data model — `ServiceLink` (backend)
New Prisma model in `backend/prisma/schema.prisma` (+ migration, apply via `migrate deploy`):
```prisma
enum ServiceLinkType { UPGRADE  ENTRY  REFERRAL  COMPLEMENTARY }

model ServiceLink {
  id              String          @id @default(cuid())
  sourceServiceId String                              // the page the box appears on
  targetServiceId String?                             // internal target (preferred)
  targetHref      String?                             // or an external/landing href
  type            ServiceLinkType
  priority        Int             @default(0)         // drives the 4-per-page cap order
  isActive        Boolean         @default(true)
  // optional placement marker token used inside detailBody, e.g. "upgrade-psych"
  anchorSlot      String?
  source          Service         @relation("SourceLinks", fields: [sourceServiceId], references: [id], onDelete: Cascade)
  target          Service?        @relation("TargetLinks", fields: [targetServiceId], references: [id])
  translations    ServiceLinkTranslation[]            // per-locale heading + body + CTA
  @@index([sourceServiceId, isActive, priority])
}

model ServiceLinkTranslation {
  id            String      @id @default(cuid())
  serviceLinkId String
  locale        LocaleCode
  heading       String                                // why this link is relevant here
  body          String?
  ctaLabel      String                                // descriptive anchor (Rule 5)
  serviceLink   ServiceLink @relation(fields: [serviceLinkId], references: [id], onDelete: Cascade)
  @@unique([serviceLinkId, locale])
}
```
Backend service + admin route: `GET/PUT /api/admin/services/:id/links` (replace-all per
service), reusing the patterns in `admin-doctor-faqs.route.ts` / the service-FAQ endpoints.
Public read: include resolved, locale-merged links in `CountryServiceDetail`
([`frontend/lib/content/get-country-collections.ts`](../../frontend/lib/content/get-country-collections.ts)).

### 2b. Component — `<LinkCallout>` (frontend)
New `frontend/components/sections/LinkCallout.tsx`: bordered box, subtle background, heading +
1–2 lines + a single CTA button to the target. Visual variants by `type`
(UPGRADE/ENTRY/REFERRAL/COMPLEMENTARY) per the spec's colour cues. Reuse existing tokens /
`gh2-btn-lime` button style already used on the service page.

### 2c. Placement (Rules 1–3) — inline marker tokens
`detailBody` is one HTML blob, so to place boxes **contextually** (not a bottom dump):
- Author drops a plain-text token in `detailBody` where the box belongs, e.g.
  `{{link:upgrade-psych}}` (passes the sanitizer — it's just text).
- The service template (`services/[serviceSlug]/page.tsx`) splits `detailBody` on tokens and
  renders the matching `ServiceLink` (`anchorSlot`) inline between HTML fragments.
- **Default fallback**: any active links **without** a token render in a compact "Where to go
  next" strip placed after the relevant section — still scoped, not a generic footer widget.
- Rule 2 (GP→specialist after the section) and Rule 3 (specialist→GP in the intro) are then a
  matter of **where the author puts the token**.

### 2d. Caps + ordering (Rule 4) + anchor text (Rule 5)
- Render at most **4** callouts/page; order by `type` priority
  `UPGRADE > ENTRY > REFERRAL > COMPLEMENTARY` then `priority`. Extra links fall back to inline
  text links in `detailBody`.
- `ctaLabel` is required and free-text; add an admin hint + a soft lint rejecting
  `click here / find out more / book now / our service`.

### 2e. Admin UI
Add a "Internal links" panel to the service editor
(`frontend/app/(admin)/admin/services/_components/`) modeled on `service-faq-panel.tsx`:
rows of {type, target service (or href), priority, anchorSlot, per-locale heading/body/CTA},
add/remove/reorder, saved via the new endpoint.

### 2f. Seed the Ireland link map
From the spec's Sections 1–3, create the `ServiceLink` rows (GP→specialist upgrades,
specialist→GP entries, referral/complementary). Tag each `HIGH`/`MEDIUM`; only `HIGH` must be
active at launch (`isActive`).

---

## Phase 3 — SEO landing pages (Rule 6, mostly MEDIUM)

For condition/audience pages (`hypertension`, `diabetes`, `respiratory-infections`,
`migraine`, `arabic-speaking-doctor`, `international-students`, `expat-healthcare`).

- **Model**: `SeoLandingPage { id, countryId, slug, isPublished, + SeoLandingTranslation
  (locale, title, seoTitle, seoDescription, bodyHtml) }`; link out to bookable services via
  Phase-2 `targetHref`/callouts.
- **Route**: `frontend/app/(site)/[country]/[lang]/[landingSlug]/page.tsx` (or a `/c/` prefix
  to avoid collision with service rewrites — decide during impl). Renders sanitized `bodyHtml`
  + relevant service callouts.
- **Sitemap (Rule 6: indexed)**: extend [`frontend/app/sitemap.ts`](../../frontend/app/sitemap.ts)
  to emit published landing pages per country/locale (`priority ~0.6`).
- **Nav exclusion (Rule 6)**: do **not** add to `SiteHeader`/`SectionNav`; do **not** list on
  the service-listing hub. Link only from related service pages + blog.
- **Robots**: no change — already allows `/` and only the landing route is added.

---

## Rule → implementation map
| Spec rule | Where it lives |
|---|---|
| R1 contextual callout, not widget | `<LinkCallout>` + token placement (Phase 2b/2c) |
| R2 upgrade link after section | author token position; GP service `detailBody` |
| R3 entry link in intro | author token position; specialist `detailBody` |
| R4 max 4 boxes, priority order | template cap + `type`/`priority` sort (Phase 2d) |
| R5 descriptive anchor text | `ctaLabel` required + lint (Phase 2d) |
| R6 landing pages: index, no nav | Phase 3 (sitemap yes; nav/listing no) |
| R7 301 redirects | `next.config.ts` (Phase 1a) |

## Sequencing
1. **Phase 1** (redirects + clean slugs) — launch-blocking, do first.
2. **Phase 2 HIGH** links — callout system + seed the `HIGH` Ireland map.
3. **Phase 2 MEDIUM** + **Phase 3** — post-launch.

## Verification
- **Redirects**: `curl -I https://<host>/ireland/en/medical-consultation` → `301` →
  `/ireland/en/acute-medical-consultation` → `200`. Repeat for all 9. No old slug 404s.
- **Callouts**: backend `npm run typecheck` + `npm test`; frontend `npm run typecheck` +
  `npm run test` + `npm run build`. On a GP page, ≤4 boxes, correct order, target links resolve,
  anchor text is descriptive. Token placement renders inline, not as a bottom dump.
- **Landing pages**: page renders + indexable; appears in `/sitemap.xml`; absent from header nav
  and the service-listing hub.
- **Migrations**: `prisma migrate deploy` (idempotent SQL, per repo convention).
- Reuse the per-country admin patterns and the existing `next.config.ts` redirect block —
  no new architecture.
