# Public content integration (Phase 3.6)

## Principles

1. **Backend preferred** — When `NEXT_PUBLIC_API_URL` is set and a public read (`GET /api/...`) succeeds within the timeout, normalized backend rows drive labels and overlays on top of static templates.
2. **Fallback always available** — Static seed data in `frontend/data/*` and builders in `frontend/lib/content/*` remain the source of truth when the API is missing, errors, times out, or returns partial rows.
3. **No hard dependency** — Public routes must render without a running backend. Missing env or failed fetch paths return fallback-only content; pages must not throw solely because the API is down.
4. **Legacy routing safety** — Country **navigation paths** (`legacyHomePath`, `teamPath`, general/specialist listing paths) are taken from the backend **only when all four** paths are present and valid (`/...`). Otherwise seed routes from `frontend/data/countries.ts` win so legacy URLs stay stable.
5. **Incomplete rows** — Missing optional fields (e.g. service summary, doctor bio) keep template defaults or seeds; backend never strips required UX sections by omission alone.
6. **Assets** — Only **active** backend assets with **safe same-site relative paths** (`/...`, no `..`, no protocol-relative URLs) are used. Doctor profile images resolve via doctor-linked `IMAGE` assets; otherwise local placeholders stay in place.

## Implementation map

| Concern | Normalization | Merge / wiring |
|--------|----------------|----------------|
| Countries | `get-public-countries.ts` | `get-site-context.ts` (navigation + `activeCountries`), uses `merge-public-content.ts` |
| Services | `get-public-services.ts` | `template-page-data.ts` (IE listings, cards, `buildServiceDetailCopyAsync`) |
| Doctors | `get-public-doctors.ts` | `template-page-data.ts` (team listings), `doctor-profile-data.ts` (`resolveDoctorProfilePageData`) |
| Pricing | `get-public-pricing.ts` | `mergePricingPlansIntoMarketingPage` for `/plans-pricing` and `/pricing-plans/list` |
| Assets | `get-public-assets.ts` | Doctor profile image URL when safe |

## Observability

In **development** only, failed API reads log once per entity via `[public-content] ... — using fallback`. Production builds stay quiet.

## Request deduplication

Per-request caching uses React `cache()` on normalized getters so `getSiteContext` and `getTemplatePageData` share one backend round-trip where possible.

## Related docs

- `frontend/README.md` — env and integration overview  
- `frontend/docs/public-website-qa.md` — manual QA scenarios  

## Phase 3.6.1 QA notes (browser, 2026-05-05)

Manual verification used the embedded browser against **`http://localhost:3000`** (Next dev) with **`NEXT_PUBLIC_API_URL=http://localhost:4000`** per `frontend/.env.example`.

**API health during QA:** `GET http://localhost:4000/api/countries` returned **503** (database unavailable in this environment). That means **Scenario A** (live JSON merges from a seeded DB) was **not exercised** here; observed UI matched **fallback / degraded API** behavior (same merge paths as Scenario B/C).

**Routes exercised (accessibility snapshot):** `/`, `/home`, `/home-pt`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/ireland-doctors/dr-mirza-aun-mohammad`, `/plans-pricing`.

**Viewports:** `320×568`, `390×844`, `768×1024`, `1024×768`, `1440×900` — primary headings, country selector, listings, footers, and booking form remained present; no blank shells.

**Follow-up for Scenario A:** Run the same route matrix with backend **`GET /api/*` returning 200** and seeded rows to confirm CMS titles/summaries/prices appear on Ireland listings, service detail, team, doctor profile, and pricing pages.
