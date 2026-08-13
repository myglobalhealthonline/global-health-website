> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).** The counts, statuses and priorities below are a record of what was true when this document was written. Do not treat them as current.

# International-locale + internal-linking batch — `/health/*` locale integrity, doctor→service links

Date: 2026-08-09 · Data: production DB (read-only), tsc/vitest/node:test runs.

Approved fix plan for 3 findings from the earlier code audit (this session):
1. `/health/{slug}` pages could be indexed + hreflang'd from fallback-locale
   content when a real translation was missing for the route's own locale.
2. `app/sitemap.ts` submitted `landing page × every supported locale`
   regardless of whether that locale had a real translation.
3. Doctor profile pages sent every assigned service straight into the booking
   flow with no server-rendered `<a href>` a crawler could follow to that
   service's own `/services/{slug}` page.

## 1 & 2 — landing-page locale integrity

Root cause: `getPublicLandingPage`/`listPublishedLandingSlugs` resolve
content via `resolveTranslation`'s exact-locale → country-default-locale
fallback (`backend/src/modules/shared/resolve-translation.ts`), so a landing
page with only ONE real translation 200s for every locale the country
supports. Same class of bug `exactLocalesForLegalType` fixed for `/legal/*`
on 2026-08-09 (commit `0bd0637a`) — landing pages never got the equivalent
filter.

### Architecture (matches the approved plan, no heuristics)

- `backend/src/modules/seo-landing/seo-landing.service.ts`:
  - `listPublishedLandingSlugs` now returns `availableLocales: LocaleCode[]`
    per page — extracted as the pure, unit-tested `landingAvailableLocales()`,
    computed from the `translations` selection already fetched (zero extra
    queries, no per-locale API calls).
  - `getPublicLandingPage` now returns `resolvedLocale` — the locale that
    actually supplied the rendered content (already computed by
    `resolveTranslation`, just not previously surfaced).
- `frontend/lib/seo/landing-locale-eligibility.ts` (new): `eligibleLandingLocales(availableLocales, supportedLocales, defaultLocale)`
  — the single source of truth both consumers below call. A locale qualifies
  only when it has a real translation row AND is a currently-enabled
  `CountryLocale`.
- `app/[country]/[lang]/health/[slug]/page.tsx`: `isExactLocale = page.resolvedLocale === lang`.
  - Exact: `index,follow`, self-canonical (unchanged), hreflang built from
    `eligibleLandingLocales(...)`.
  - Fallback: `noindex,follow` (page still renders, no redirect — matches
    existing product behavior and the service-page precedent), **no**
    hreflang cluster emitted from this render at all (a noindexed page
    asserts nothing about its siblings).
  - The existing `/health/→/services/` canonical-alias branch
    (`resolveHealthCanonicalServiceSlug`) is untouched and still overrides
    `alternates.canonical` after this logic runs.
- `app/sitemap.ts`: the landing loop now calls the same
  `eligibleLandingLocales()` to build both the submitted URL set and its
  hreflang cluster — replacing the old unconditional
  `country.supportedLocales` loop. The pre-existing retired-slug and
  canonical-alias `continue`s run first, unchanged, so that exclusion logic
  cannot regress (locked by the existing `health-service-canonical.test.ts`,
  untouched).

Invariant now holds: `robots indexability == sitemap eligibility == hreflang eligibility` for `/health/*`, via one shared function.

### Before / after counts (read-only production DB query, `backend/scripts/audit-landing-locale-eligibility.mjs`)

| country | published pages | before (URLs submitted) | after | dropped (fallback-only) |
| --- | ---: | ---: | ---: | ---: |
| cz | 1 | 6 | 6 | 0 |
| ie | 9 | 54 | 54 | 0 |
| pt | 5 | 30 | 30 | 0 |
| br | 0 | 0 | 0 | 0 |
| ro | 0 | 0 | 0 | 0 |
| es | 0 | 0 | 0 | 0 |
| **total** | **15** | **90** | **90** | **0** |

**Every currently-published `/health/` page happens to have a complete
translation set today — 0 URLs are actually removed by this fix.** This is a
preventive/structural fix, not a live-defect cleanup: it closes the same gap
class that DID cause 46 real wrong-language `/legal/` URLs, before a landing
page ships with a partial translation set. Confirmed via direct DB read
(`SeoLandingPage.translations` vs `CountryLocale`), not a live-HTTP or
content-diffing heuristic.

## 3 — doctor → service crawlable link

`frontend/lib/content/doctor-profile-page.tsx`'s assigned-service cards now
use `ServiceCard`'s existing two-CTA mode (`detailHref` + `bookHref` — no new
component): a real server-rendered `<Link>` to
`/{country}/{lang}/services/{slug}` (label: new locale key
`doctorProfile.viewServiceDetails`, added to all 6 locales), alongside the
unchanged `bookHref` → the doctor+service preselection-pair booking flow,
which still renders as a client-side button via `BookCta`/`isPreselectionPairHref`
(the 2026-08-08 fix that keeps that cross-product out of crawlable HTML —
untouched and still applies here, since `bookHref` is unchanged).

`buildServiceDetailHref(country, lang, serviceSlug)` extracted to
`lib/routing/book-href.ts` alongside `buildBookHref` for testability.

## Tests added

- `frontend/lib/seo/landing-locale-eligibility.test.ts` — exact/missing/partial-cluster/stale-locale/case-insensitivity/empty-input cases for the shared eligibility function (covers both sitemap and page consumers, since both call it).
- `backend/src/modules/seo-landing/seo-landing.service.test.ts` — `landingAvailableLocales` exact/partial/empty cases (no DB — pure function on already-fetched shape), plus a `landingServiceSlugs` regression check that the unrelated slug-extraction logic wasn't disturbed.
- `frontend/lib/routing/book-href.test.ts` — `buildServiceDetailHref` produces the correct URL and is never mistaken for a preselection-pair href; the booking href for the same service remains a preselection pair; the two hrefs are distinct.
- Canonicalized `/health/→/services/` alias exclusion: no new test needed — `resolveHealthCanonicalServiceSlug`/`isRetiredHealthSlug` (locked by the pre-existing `health-service-canonical.test.ts`, untouched by this batch) still run as `continue`s **before** the new eligibility filter in `sitemap.ts`'s loop, so the skip cannot regress by construction.
- No component-render test was added for the doctor→service link's server-rendered HTML: this repo's `vitest.config.ts` runs `environment: "node"` and explicitly excludes `app/` (no RSC/jsdom harness wired up — "testing RSCs requires extra plumbing, defer until needed"). The href-level test above is the closest equivalent this test surface supports; flagging as a gap rather than silently skipping it.

## Verification

- `frontend`: `tsc --noEmit` clean. `vitest run`: 732 passed, 1 pre-existing failure (`tests/unit/portal-breadcrumb-routes.test.ts`, an admin-memberships route-tree check) — confirmed via `git stash` to fail identically on the pre-batch baseline, unrelated to this change, not touched.
- `backend`: `tsc --noEmit` clean. Targeted `node:test` run (`seo-landing.service.test.ts` + `resolve-translation.test.ts`): 8/8 pass.
- `eslint` clean on every file this batch touched (both packages).
- Landing-page locale-integrity counts above verified directly against the production database (read-only), not estimated.

## Not done in this batch (flagged, not fixed — out of scope per the approved plan)

- `components/sections/AlsoAvailableIn.tsx` (the visible "also available in"
  cross-locale link row rendered on `/health/`, `/legal/`, and elsewhere)
  still builds its target set from the unfiltered `hreflangAlternates()`, not
  `eligibleLandingLocales()`/`indexableHreflangCluster()`. So a fallback-locale
  `/health/` page's `<head>` now correctly advertises no hreflang cluster, but
  the visible in-page link row could still surface a link to a sibling locale
  that itself doesn't have a real translation. This is a pre-existing gap
  (present since `AlsoAvailableIn` was introduced, and also true today of
  `/legal/*` post-0bd0637a), not something introduced by this batch — worth a
  dedicated follow-up since the component is shared across route families.
