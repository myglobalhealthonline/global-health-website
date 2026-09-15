# sitemap.ts rules (A1 note, 2026-09-15)

Source: `frontend/app/sitemap.ts` (`export const dynamic = "force-dynamic"` —
rendered per-request, not at build time, because build-time can't reach the
backend API).

Entity families emitted: service detail (`/{slug}` under `/services`),
lab-test detail (emitted at `/lab-tests/{slug}` and hub `/lab-tests` — see
note below), doctor profile, blog post, legal document, SEO landing page,
membership plan hub (`/pricing`), job/careers, plus the country home + fixed
section routes (from the live admin country list via
`getPublicCountriesMerged`, not a hardcoded five).

Explicitly excluded by the file's own comments: the global `/` entry (country
picker, not a content target), the bare country root `/{country}`
(redirects to the default-locale home), all auth/account routes, and every
legacy Wix slug (deliberately NOT in the sitemap, but also NOT disallowed in
robots.txt — see file header comment, ranking-equity rationale).

Eligibility gates applied per entity, read straight from the sitemap code:
- Services: `isPublicServiceRecordIndexable(record, lang, defaultLocale)`,
  evaluated **per locale** (not on the merged/default-locale record) —
  deliberately, per an inline comment describing a past incident where the
  merged read hid an empty-content locale and shipped `<p><br/></p>` bodies
  into the sitemap.
- Doctors: `isPublicDoctorRecordIndexable`, same predicate the profile page
  uses for its own `noindex` decision (`publication-validation.ts`), which
  in turn reads `readyToIndex` (boolean field, or
  `editorialChecklist.readyToIndex === true`).
- Legal documents: locale membership from `exactLocalesForLegalType`
  (`get-country-legal.ts`) — a document must have a real per-locale
  translation row, not `resolveTranslation`'s fallback.
- Landing pages / plans / jobs / press: existence in the country's list
  response is the only gate visible in `sitemap.ts` itself; no separate
  indexability predicate is called for these families here.
- lastModified per hub page (country home, `/doctors`, `/blog`, ...) is the
  newest child timestamp of that country's own content, deliberately never
  build time (comment: a lastModified that moves every deploy gets discounted
  as a noise signal sitewide, "including for the detail pages where it IS
  accurate").

**Finding — route/sitemap path mismatch (verify live in A2):** `sitemap.ts`
pushes lab-test URLs at `/lab-tests/{slug}` and hub `/lab-tests`
(lines ~197, ~529), but there is no `/lab-tests` route anywhere under
`frontend/app` — the actual page is
`frontend/app/[country]/[lang]/tests/[testSlug]/page.tsx`, i.e. `/tests/{slug}`
and `/tests`. Every submitted `/lab-tests*` URL across all six markets appears
to have no matching frontend route. These rows are carried in
`page_inventory.csv` with `inventory_state=unknown` and a note; A2 should
confirm live status (expected: 404, or caught by some redirect/rewrite not
visible in `sitemap.ts`/`next.config.ts`/`proxy.ts` at a first read).
