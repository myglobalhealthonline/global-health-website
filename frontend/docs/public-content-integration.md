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

## Final local Scenario A verification (2026-05-06)

Scenario A was re-run locally with both dev servers reachable:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:3000`

API and health checks:

1. `GET /health?db=1` returned `200` with `database.connected: true`.
2. Public reads returned `200`: `/api/countries`, `/api/services`, `/api/doctors`, `/api/pricing`, `/api/assets`.

Representative page checks (`http://localhost:3000`) returned `200`:

- `/`
- `/general-consultation-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/ireland-doctors/dr-mirza-aun-mohammad`
- `/plans-pricing`

Backend-data mapping checks (Scenario A overlays):

- `/ireland/medical-consultation` contains the backend service name for `medical-consultation` (Ireland row).
- `/ireland-doctors/dr-mirza-aun-mohammad` contains backend `fullName`.
- `/plans-pricing` contains backend pricing plan `name`.

Fallback behavior remains documented and unchanged: when public API reads fail or are unavailable, static seeds/template defaults are still used and routes render without backend dependency.

## Phase 3.6.1 QA notes (browser, 2026-05-05)

Manual verification used the embedded browser against **`http://localhost:3000`** (Next dev) with **`NEXT_PUBLIC_API_URL=http://localhost:4000`** per `frontend/.env.example`.

**API health during QA:** `GET http://localhost:4000/api/countries` returned **503** (database unavailable in this environment). That means **Scenario A** (live JSON merges from a seeded DB) was **not exercised** here; observed UI matched **fallback / degraded API** behavior (same merge paths as Scenario B/C).

**Routes exercised (accessibility snapshot):** `/`, `/home`, `/home-pt`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/ireland-doctors/dr-mirza-aun-mohammad`, `/plans-pricing`.

**Viewports:** `320×568`, `390×844`, `768×1024`, `1024×768`, `1440×900` — primary headings, country selector, listings, footers, and booking form remained present; no blank shells.

**Follow-up for Scenario A:** Run the same route matrix with backend **`GET /api/*` returning 200** and seeded rows to confirm CMS titles/summaries/prices appear on Ireland listings, service detail, team, doctor profile, and pricing pages.

## Phase 3.6.2 — Backend availability / Scenario A enablement (2026-05-05)

### Root cause of `503` on `GET /api/countries`

Public routes catch Prisma failures and return **`503`** when the database is unavailable (`DatabaseUnavailableError`). In typical local setups this happens because:

1. **`DATABASE_URL` is unreachable** — e.g. cloud **internal** hostname used from a laptop, Postgres not running, wrong port/credentials, or DB name missing.
2. **Schema not migrated** — errors such as “relation does not exist” are mapped to the same safe failure path.

This is **not** a frontend integration defect; the API process can still return **`GET /health`** `200` while **`GET /api/countries`** returns `503` if Prisma cannot query.

### Fixes applied (backend / tooling)

- **`docker-compose.yml`** (repo root): Postgres 16 with **`global_health`** database and documented URL matching **`backend/.env.example`**.
- **`GET /health?db=1`**: runs **`SELECT 1`** via Prisma and returns **`database.connected`** plus a **safe `code`** (`ECONNREFUSED`, `UNREACHABLE`, `AUTH_FAILED`, `SCHEMA_NOT_MIGRATED`, etc.) — **no secrets**.
- **`classifyDatabaseConnectivityError`** in `backend/src/modules/shared/db-errors.ts` for stable diagnostics.
- **Seed alignment (Ireland):** **`dr-mirza-aun-mohammad`** now gets a **`bio`**; **`medical-consultation`** gets **`summary`** and **`durationMinutes`** for richer Scenario A checks against `/ireland/medical-consultation`, `/general-consultation-ie`, and `/ireland-doctors/dr-mirza-aun-mohammad`.

### Verification checklist (Scenario A)

After **`docker compose up -d`** (or any reachable Postgres), **`pnpm --filter backend db:migrate`** and **`pnpm --filter backend db:seed`**:

1. `GET /health?db=1` → **`database.connected: true`**
2. `GET /api/countries` … **`200`**
3. Same for **`/api/services`**, **`/api/doctors`**, **`/api/pricing`**, **`/api/assets`**
4. Re-run the browser matrix from Phase 3.6.1 — Ireland merges should show seeded names, summaries, bios, and pricing cards where mapped.

**This CI/workspace session:** Docker daemon was not running (`dockerDesktopLinuxEngine` pipe missing); Scenario A browser QA could not be completed against live `200` APIs. Follow the checklist locally once Docker Desktop / Postgres is up.

**Validation (workspace):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm --filter backend db:generate`, `pnpm --filter backend test` — pass (**49** tests).

### Hydration warnings (navigation / hero)

Repeated React **hydration mismatch** warnings in **development** often come from **Strict Mode**, **browser extensions** altering the DOM, or **already-suppressed** hero wrappers (`HeroSection` uses **`suppressHydrationWarning`** on copy wrappers). **Production `next build` + `next start`** should be used to confirm whether mismatches persist without the dev overlay. Treat lingering dev-only warnings as **noise** unless they reproduce in production.
