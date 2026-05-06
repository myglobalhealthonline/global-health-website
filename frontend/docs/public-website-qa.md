# Public Website QA

Audit date: 2026-05-05

## Phase 4.1 — Auth QA + account protection (2026-05-06)

**Local runtime**

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

**Backend auth endpoint QA**

- `POST /api/auth/register`:
  - valid register -> `200`
  - duplicate email -> `409`
  - weak password -> `400`
- `POST /api/auth/login`:
  - valid login -> `200`
  - wrong password -> `401`
- `GET /api/auth/me`:
  - logged in -> `200` with user
  - logged out -> `401`
- `POST /api/auth/logout` -> `200` and subsequent `/api/auth/me` -> `401`
- `POST /api/auth/forgot-password` -> `200` placeholder-safe accepted
- `POST /api/auth/reset-password` -> `200` placeholder-safe accepted

**Browser QA**

- `/register`: account creation succeeds and routes to account context.
- `/login`: successful login redirects to `next` (or `/account`) and keeps session via httpOnly cookie.
- `/forgot-password`: accepted response shown with non-enumerating placeholder copy.
- `/account`: authenticated patient summary renders (name/email/role).
- `/account` and `/account/bookings`: unauthenticated access redirects server-side to `/login?next=...`.
- `/account/bookings`: authenticated access allowed; page remains booking-history shell.
- No doctor portal/dashboard links were introduced.

**Guest booking preservation**

- `/book-online` remains accessible while logged out.
- No login wall is introduced before booking request input.
- Guest-first booking behavior remains unchanged; future `userId` linkage is optional.

**Deferred behavior (intentional)**

- Password reset email delivery and reset-token lifecycle remain placeholder-safe.
- Payments remain deferred.
- Doctor portal and doctor dashboard remain excluded.

## Phase 4.2 — Booking ownership + patient booking history (2026-05-06)

**Backend behavior verified**

- `POST /api/appointments` keeps guest booking supported.
- Valid auth session on booking request links `Appointment.userId`.
- Missing/invalid auth does not block booking request intake.
- Success copy remains safe: `Request received. Our team will follow up.`

**Patient account APIs**

- `GET /api/account/appointments` returns account-linked request history for authenticated users.
- `GET /api/account/appointments/:id` returns only appointments owned by the requesting patient (or support-targeted admin view).
- Unauthenticated requests return `401`.
- Data returned is account-safe (status/timestamps/consultation/country/contact fields).

**Frontend QA**

- `/account/bookings` now renders server-fetched booking history cards.
- Empty history shows CTA to `/book-online`.
- API-unavailable state shows safe fallback messaging.
- `/book-online` remains accessible while logged out (no login wall).
- Logged-in booking flow supports editable prefilled identity fields and success hint to check account history.

**Scope kept out**

- No payments implementation.
- No doctor portal/dashboard work.
- No public-route or navigation changes.

## Phase 3.6.1 / 3.6.2 final local Scenario A verification (2026-05-06)

**Local runtime**

- Backend running at `http://localhost:4000`
- Frontend running at `http://localhost:3000`

**API verification**

- `GET /health?db=1` → `200` with `database.connected: true`
- `GET /api/countries` → `200`
- `GET /api/services` → `200`
- `GET /api/doctors` → `200`
- `GET /api/pricing` → `200`
- `GET /api/assets` → `200`

**Representative public pages checked (`200`)**

- `/`
- `/general-consultation-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/ireland-doctors/dr-mirza-aun-mohammad`
- `/plans-pricing`

**Backend-data mapping spot checks**

- `/ireland/medical-consultation` contains backend service `name` for the Ireland `medical-consultation` row.
- `/ireland-doctors/dr-mirza-aun-mohammad` contains backend doctor `fullName`.
- `/plans-pricing` contains backend pricing plan `name`.

**Fallback mode (backend offline)**

Fallback behavior remains documented and expected: when backend reads are unavailable, public pages still render from static/template sources with no hard backend dependency.

**Validation run (2026-05-06)**

- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm build` — pass
- `pnpm --filter backend test` — pass (`49` tests)

## Book-online — browser QA with backend API (2026-05-05)

Cross-reference: `backend/docs/booking-persistence-qa.md` (API matrix, CORS, DB caveats).

**Environment**

- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000` (gitignored; see `frontend/.env.example`).
- Backend `http://localhost:4000` with `DATABASE_URL` from `backend/.env` (loaded via `dotenv` in dev).

**Screenshots** (`frontend/docs/qa-screenshots/`)

- `book-online-viewport-320.png`, `book-online-viewport-390.png`
- `book-online-viewport-768-form.png`, `book-online-viewport-1024-form.png`, `book-online-viewport-1440-form.png`

**Results**

- **Client validation:** Empty submit shows inline errors + **Please review the highlighted fields before submitting.** No API call until fields pass.
- **Consent:** Unchecked consent surfaces consent copy under the checkbox + summary status; no POST.
- **Invalid email:** Blocked client-side (**Enter a valid email address.**); no POST.
- **Happy-path messaging:** Success uses backend message **Request received. Our team will follow up.** — no wording that claims a confirmed appointment. (This session could not reach success locally because `DATABASE_URL` used an internal Railway hostname; the UI exercised loading state then the safe **Booking service is temporarily unavailable…** banner for `503`.)
- **CORS:** Required `@fastify/cors`; without it the browser showed the same safe unavailable banner because `fetch` failed before JSON.
- **Mobile usability:** Form controls use shared `gh-*` input styles; consent remains readable; booking card uses `overflow-x-hidden` + `min-w-0` grids to limit horizontal bleed at narrow widths.
- **Hydration:** `HeroSection` hero copy wrapper uses `suppressHydrationWarning` to reduce dev-only mismatch noise.

**Fixes in this pass (frontend)**

- `lib/api/client.ts`: surface first Zod `fieldErrors` string on `400` responses.
- `BookingFormTemplate.tsx`: `min-w-0` / `overflow-x-hidden` layout hardening; unavailable mapping covers DB-down and network paths.
- `HeroSection.tsx`: `suppressHydrationWarning` on hero content wrappers.

## Phase 3.6 — public content read integration (2026-05-05)

**Merge strategy:** Prefer backend `GET /api/*` when `NEXT_PUBLIC_API_URL` is set and the response succeeds within ~4s; otherwise keep static seeds and template builders. Country routing paths use DB values only when all four legacy paths are present (see `frontend/docs/public-content-integration.md`).

**Automated validation (this workspace):** `pnpm lint`, `pnpm typecheck`, `pnpm build` (frontend root); `pnpm --filter backend typecheck`, `pnpm --filter backend build`, `pnpm --filter backend test` — all passing after integration.

**Manual spot-check (recommended)**

| Scenario | Expectation |
| -------- | ----------- |
| A — Backend up, seeded DB | Ireland listings/details, team pages, pricing pages, and doctor profile show merged CMS names/copy where rows exist; static inventory routes unchanged. |
| B — Backend offline / no `NEXT_PUBLIC_API_URL` | Same URLs render fallback-only content; no crashes; optional dev console fallback warnings only in development. |
| C — Incomplete rows | Missing summaries/bios fall back to template defaults; legacy URLs preserved when paths incomplete in DB. |

**Backend-offline smoke:** With `NEXT_PUBLIC_API_URL` unset or backend stopped, loading `/`, `/home`, `/home-pt`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/ireland-doctors/dr-mirza-aun-mohammad`, `/plans-pricing` should return **200** with fallback content (verified via code paths + build; live browser optional).

## Phase 3.6.1 — Public content integration QA (browser, 2026-05-05)

**Environment**

- Dev server: `http://localhost:3000`
- `NEXT_PUBLIC_API_URL` pointed at `http://localhost:4000` (see `frontend/.env.example`)
- **`GET /api/countries` on port 4000 returned HTTP 503** during this session (DB/service unavailable). Public reads therefore behaved like **failed/unavailable API** — suitable for **B** and **incomplete-data** style checks, not for confirming live CMS field overlays (**A** needs `200` JSON from seeded DB).

### A — Backend available + seeded DB (CMS merges)

| Check | Result |
| ----- | ------ |
| Country-driven nav / hub | **Not verified** — API did not return `200`; pages used seed/fallback labels (e.g. Ireland/Czechia/Portugal/Spain/Romania on `/`). |
| `/general-consultation-ie` service cards from DB | **Not verified** — cards showed static inventory titles/descriptions (generic pathway copy when no merge). |
| `/ireland/medical-consultation` title/summary/key facts from DB | **Not verified** — hero showed slug-derived **Medical Consultation** + fallback description body. |
| `/ireland-team` doctors from DB | **Not verified** — Ireland team showed **seed** profiles (Dr. Khoiamul Islam, Ireland Clinic Team). |
| `/ireland-doctors/dr-mirza-aun-mohammad` CMS profile | **Not verified** — template fallback bio/title (**Clinic Doctor Profile**) when no matching doctor row. |
| `/plans-pricing` backend plan cards | **Not verified** — only static marketing feature blocks visible (no extra pricing rows prepended). |
| Broken images | No broken-image indicators in accessibility snapshot; doctor profile uses illustration path when no asset. |
| Route breakage | **Pass** — all representative URLs loaded with expected headings and footer chrome. |

**Retry A when:** PostgreSQL reachable from backend, migrations applied, seed data loaded, `GET /api/countries` returns **200**.

### B — Backend offline / no public API

| Check | Result |
| ----- | ------ |
| Representative pages render | **Pass** — same session effectively matched degraded API (`503`); pages rendered full sections (hero, listings, FAQ/footer). |
| Fallback content | **Pass** — seeded copy and builders used where merges unavailable. |
| Crashes / blank regions | **Pass** — no empty document shell on tested routes. |
| Navigation | **Pass** — footer country links and CTAs present in snapshots. |

**Note:** A dedicated run with **`NEXT_PUBLIC_API_URL` removed** (restart dev after env change) was **not** executed — Next inlines `NEXT_PUBLIC_*` at dev compile; parity with **503** read failure was assumed for content reads.

### C — Incomplete backend data

| Case | Observed |
| ---- | -------- |
| Country paths incomplete | Merge logic keeps seed paths when all four DB paths are not valid — **not separately simulated**; documented behavior only. |
| Service missing price/duration | Listing cards keep template duration/price lines (e.g. **20-30 min**, **From EUR 45**) when merge fields absent. |
| Doctor missing image | Profile uses default **`/images/ireland/doctor-spotlight-ai.svg`** when no safe CMS asset. |
| Pricing empty | `/plans-pricing` showed static intro + three feature cards only (no duplicate blank grid). |

### Console / hygiene

- **React hydration mismatch** warnings appeared in dev console on several navigations (known Next/React dev noise; often extensions or benign SSR/client attribute drift). **Not treated as Phase 3.6 integration defects** without a reproducible production-only failure.

### Validation (2026-05-05)

- `pnpm lint` — pass  
- `pnpm typecheck` — pass (frontend + backend)  
- `pnpm build` — pass (root: frontend + backend build)  
- `pnpm --filter backend test` — pass (45 tests)

### Issues fixed this QA pass

- **None** — no integration regressions requiring code changes.

### Remaining gaps

- Execute **Scenario A** against a backend returning **200** for all public list endpoints with seeded Ireland rows (services with `legacyPath` / slug alignment, doctors, pricing plans, assets).
- Optional: screenshot archive under `frontend/docs/qa-screenshots/` for 3.6.1 viewports (not captured in this pass).

## Phase 3.6.2 — Backend API availability + Scenario A prep (2026-05-05)

### Root cause of `/api/countries` **503**

Prisma queries failed because **`DATABASE_URL`** did not resolve to a reachable Postgres instance (or migrations were missing). The route handler maps DB connectivity/schema errors to **`503`** via **`DatabaseUnavailableError`**.

### Backend fixes / tooling

| Item | Notes |
|------|--------|
| **`docker-compose.yml`** (repo root) | Postgres 16 + `global_health` DB + documented URL |
| **`GET /health?db=1`** | Optional DB probe; returns **`database.connected`** and **`database.code`** (`UNREACHABLE`, `ECONNREFUSED`, …) — no secrets |
| **Seed (Ireland)** | **`dr-mirza-aun-mohammad`**: `bio`; **`medical-consultation`**: `summary`, **`durationMinutes: 25`** (aligned with `/ireland/medical-consultation`) |
| **`backend/README.md`**, **`backend/.env.example`** | Troubleshooting for **503**, Docker URL |

### Public APIs — expected after DB up + migrate + seed

| Endpoint | Expected |
|----------|----------|
| `GET /health` | **200** `{ ok: true }` |
| `GET /health?db=1` | **200** with **`database.connected: true`** when Postgres is reachable |
| `GET /api/countries` … **`/api/assets`** | **200** with seeded rows |

**Automated session:** Docker Desktop was **not** running here → Postgres could not be started → **`GET /health?db=1`** returned **`503`** with **`database.code: UNREACHABLE`** — Scenario **A** browser QA **still pending** until migrate/seed runs against a live DB.

### Hydration warnings

**Status:** Still classified as **dev noise** (Strict Mode, extensions, hero wrappers already use **`suppressHydrationWarning`**). **Production smoke:** run **`pnpm --filter frontend build`** then **`pnpm --filter frontend start`** and spot-check navigation once if warnings must be eliminated.

### Validation (Phase 3.6.2 workspace run)

- `pnpm lint` — pass  
- `pnpm typecheck` — pass  
- `pnpm build` — pass  
- `pnpm --filter backend db:generate` — pass  
- `pnpm --filter backend test` — pass (**49** tests, incl. DB error classifier)

### Scenario A browser QA (CMS overlays)

**Pending** until local Postgres is running (`docker compose up -d`), **`pnpm --filter backend db:migrate`**, **`pnpm --filter backend db:seed`**, backend restarted, then repeat Phase 3.6.1 route matrix — expect Ireland **Medical Consultation** summary/duration/price, doctor **bio**, pricing cards on **`/plans-pricing`**, team listing from **`GET /api/doctors`**.

## Pages Reviewed
- `/`
- `/home`
- `/home-pt`
- `/home-sp`
- `/home-cz`
- `/home-rm`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland/diabetes-consultation`
- `/ireland-specialist-consultations/cardiology-consultation`
- `/ireland-team`
- `/ireland-doctors/dr-mirza-aun-mohammad`
- `/plans-pricing`
- `/online-prescription`
- `/home-delivery`
- `/home-health-test`
- `/blog`
- `/post/how-online-medical-consultations-work`
- `/privacy`

## Viewport Notes
- `320`: verify no horizontal scroll, menu readability, stacked cards, clear booking CTA
- `390`: verify mobile balance for hero, service cards, booking form, footer CTA
- `768`: verify tablet wrapping and section spacing
- `1024`: verify header/nav density and two-column template balance
- `1280`: verify card rhythm, hero hierarchy, footer spacing
- `1440`: verify max-width discipline and restrained whitespace

## UI/UX Issues Found
- Some shared pages still used the earlier Wix-derived palette rather than the approved healthcare palette.
- Shared templates were structurally sound but too generic in hierarchy, making key pages feel like scaffolds instead of guided patient journeys.
- Booking form fields were readable but not yet unified under a consistent input/label system.
- Header and mobile navigation had small polish issues:
  - touch-target consistency
  - CTA emphasis
  - dropdown sizing
  - encoding glitch in mobile accordion icon
- Footer copy had an encoding issue in the copyright row and needed calmer panel treatment.
- Doctor/profile cards felt too placeholder-heavy and not credible enough in presentation.

## Fixes Applied
- Normalized global tokens in `frontend/app/globals.css` to the approved palette:
  - dark green primary
  - soft green accent
  - white background
  - neutral borders
  - `#333333` body text
  - `#666666` muted text
- Added shared field classes:
  - `gh-input`
  - `gh-select`
  - `gh-textarea`
  - `gh-field-label`
- Strengthened global focus visibility and tap-target sizing.
- Refined shared header/navigation:
  - cleaner CTA sizing
  - better desktop nav padding
  - calmer hover states
  - clearer dropdown width and padding
  - mobile menu icon/fixed CTA polish
- Refined footer:
  - softer background panel
  - better content width balance
  - corrected copyright rendering
  - improved CTA/footer transition block
- Improved shared content sections and cards:
  - hero trust badges
  - clearer country selector chips
  - stronger step markers
  - softer trust icon treatment
  - improved service metadata chips
  - more credible doctor placeholder panels
  - clearer pricing/blog/home-test card hierarchy
- Improved high-intent templates:
  - booking flow
  - consultation listings
  - service detail
  - doctor team/profile
  - blog index/article
  - legal pages
  - static marketing pages

## Remaining Gaps
- Exact visual parity with the live Wix site is still blocked by missing real brand assets:
  - final logo
  - final hero imagery
  - doctor photos
  - trust badges/illustrations
  - footer CTA art
- Some service, doctor, blog, and legal pages still use safe generalized content rather than final editorial or clinical copy.
- Country-specific pages inherit the improved system correctly, but final parity still depends on approved local assets and content review.

## Final Frontend Polish Pass

### Representative Pages Checked
- `/`
- `/home`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/plans-pricing`
- `/blog`
- `/privacy`

### Viewports Checked
- `320`
- `390`
- `768`
- `1024`
- `1280`
- `1440`

### Final Polish Fixes Applied
- Footer legal row encoding issue corrected and footer spacing tightened.
- Header/footer shell kept intact while improving production polish:
  - steadier logo sizing
  - clear CTA emphasis
  - calmer footer panel treatment
- Booking page UX clarified:
  - required field indicators added
  - frontend-preview notice when `NEXT_PUBLIC_API_URL` is missing; live request path when configured
  - helper text and consent block kept visible
  - submit action reflects backend outcome (success, validation error, or unavailable) without claiming a confirmed appointment

### Remaining Frontend Gaps
- Launch readiness is still blocked by final approved brand assets, especially the logo and footer CTA art.
- Core page UX, responsiveness, navigation, and template structure are ready for backend/admin integration.

## AI-Generated Asset Replacement Summary

- Replaced visible placeholder logo with temporary wordmark asset.
- Replaced visible homepage and country-home illustration placeholders with branded healthcare illustration assets.
- Replaced visible Ireland about, delivery, doctor spotlight, and footer CTA placeholder artwork.
- Removed visible “image placeholder” treatment from shared doctor cards and doctor profile pages.

### Pages Checked After Asset Swap
- `/`
- `/home`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/home-delivery`
- `/home-health-test`
- `/blog`

### Remaining Asset Gaps
- official final logo
- officially approved footer CTA art
- approved real doctor/team imagery if desired
- optional branded icon pack rollout into more components

## `/book-online` — browser QA with backend API (2026-05-05)

- **Setup:** `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env.local`; backend `http://localhost:4000/health` returned `200`.
- **Integration:** Valid submissions issue `POST` to `/api/appointments` from the browser (no CORS failure observed). Loading state: submit label **Submitting request...** and disabled button.
- **Success copy:** When the API returns `200`, the UI shows the API message (request received / team follow-up) and does not claim a confirmed appointment (see in-page notice and adapter copy).
- **This run:** Backend responded **`503`** with `Appointments are temporarily unavailable`, so **no database row** was created. The UI shows **Booking service is temporarily unavailable. Please try again later or contact the clinic team directly.** after mapping 503 to the same copy as a dead network (see `BookingFormTemplate` update).
- **Validation:** Missing fields, missing consent, and invalid email are blocked client-side with readable errors; no `POST` until the client validation passes.
- **Mobile / widths:** Checked at `320`, `390`, `768`, `1024`, `1440` (resize + form snapshots). Representative screenshots: `frontend/docs/qa-screenshots/book-online-viewport-320.png`, `frontend/docs/qa-screenshots/book-online-form-1440.png`.
- **Dev-only note:** Cursor IDE browser automation adds `data-cursor-ref` attributes and can trigger a **hydration mismatch** warning in React dev overlay; treat as tooling noise unless reproduced in a normal browser without automation.

## Auth + Admin UI polish QA (2026-05-06)

### Routes checked

- Auth/patient:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/account`
  - `/account/bookings`
- Admin:
  - `/admin`
  - `/admin/appointments`
  - `/admin/countries`
  - `/admin/services`
  - `/admin/doctors`
  - `/admin/pricing`
  - `/admin/assets`
  - `/admin/blog-posts`
  - `/admin/faqs`
  - `/admin/content-pages`

### Responsive results

- Breakpoint matrix targeted:
  - `320`, `390`, `768`, `1024`, `1440`
- Outcomes:
  - auth forms remain single-column and readable on small screens
  - CTA buttons remain tap-safe
  - account and booking cards stack safely without layout breaks
  - admin dashboard cards stack cleanly at narrow widths
  - admin tables preserve usability via intended horizontal scroll containers
  - no route-level layout crash observed in this pass

### Copy/security checks

- Admin framing now clearly states website-content management scope.
- Doctors are explicitly framed as public profiles only.
- Payments explicitly marked as not enabled yet.
- No admin secrets surfaced in client UI.

## UI/UX Polish Pass — Token Compliance + Accessibility (2026-05-06)

### Scope
Polish-only pass: no route changes, no backend changes, no feature additions.

### Components updated
- `frontend/app/globals.css` — added status tokens, badge utilities, danger button, reduced motion support
- `frontend/components/layout/PageShell.tsx` — replaced hardcoded slate/teal/white with design tokens
- `frontend/components/layout/CTAFooter.tsx` — removed gradient, improved text contrast
- `frontend/components/layout/MobileNav.tsx` — added focus-visible ring to close button
- `frontend/components/sections/BookingCTA.tsx` — improved text contrast on dark background
- `frontend/components/sections/CountryHomeTemplate.tsx` — improved text contrast on dark background
- `frontend/components/cards/DoctorCard.tsx` — removed gradient, enabled `imageLabel` prop support
- `frontend/components/cards/BlogCard.tsx` — added spacing between eyebrow and heading
- `frontend/components/templates/DoctorProfileTemplate.tsx` — removed gradient
- `frontend/components/templates/BookingFormTemplate.tsx` — tokenized status colors, added `aria-invalid`/`aria-describedby`
- `frontend/app/(auth)/login/ui.tsx` — tokenized status colors
- `frontend/app/(auth)/register/ui.tsx` — tokenized status colors
- `frontend/app/(auth)/account/page.tsx` — changed disabled link to `<button disabled>`
- `frontend/app/(auth)/account/bookings/ui.tsx` — tokenized status badges
- `frontend/app/(admin)/admin/page.tsx` — replaced hardcoded `bg-white`
- `frontend/app/(admin)/admin/appointments/page.tsx` — tokenized badges, added `tabIndex={-1}` on disabled pagination
- `frontend/app/(admin)/admin/countries/page.tsx` — tokenized warning banner
- 17 additional admin pages — bulk-replaced hardcoded amber/emerald/rose/sky colors with token utilities

### Accessibility improvements
- All form inputs with validation errors now use `aria-invalid` and `aria-describedby`
- Disabled pagination links removed from tab order
- Mobile nav close button has visible focus ring
- Account "coming soon" control is a proper disabled button
- Added `prefers-reduced-motion` support in globals.css
- Improved text contrast on dark green backgrounds (white/90 instead of white/72)

### Validation results
- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm build` — pass (113 pages)
- `pnpm --filter backend test` — pass (79 tests)

### Remaining visual gaps
- Official final logo still pending approval
- Approved footer CTA art still pending
- Real doctor/team imagery optional pending approval
- Some service/doctor/blog pages use safe generalized fallback copy until CMS content is finalized


## UI/UX Pro Max Visual Rescue Pass QA (2026-05-06)

### Routes checked

- Auth/patient:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/account`
  - `/account/bookings`
- Admin:
  - `/admin`
  - `/admin/appointments`
  - `/admin/countries`
  - `/admin/services`
  - `/admin/doctors`
  - `/admin/pricing`
  - `/admin/assets`
  - `/admin/blog-posts`
  - `/admin/faqs`
  - `/admin/content-pages`
- Public:
  - `/`
  - `/home`
  - `/book-online`

### Breakpoint matrix

- `320` — auth cards stack, admin sidebar collapses to top nav, patient cards stack
- `390` — auth trust panel readable, admin dashboard cards 1-col
- `768` — auth two-column begins, admin cards 2-col, tables scrollable
- `1024` — admin sidebar visible, full dashboard layout
- `1440` — max-width discipline, comfortable spacing

### Responsive outcomes

- Auth pages: single-column mobile, true two-column desktop. No overflow.
- Admin dashboard: cards stack 1→2→3 columns. Hero readable at all widths.
- Admin tables: intentional `overflow-x-auto` containers. No page-level scroll.
- Patient account: profile card stacks, action grid 1→3 columns. Booking cards readable.
- Public pages: existing responsive behavior preserved.

### Visual quality checks

- [x] Admin dashboard is not a button list
- [x] Auth pages have trust panels and premium form cards
- [x] Patient account feels like a dashboard, not a form dump
- [x] Cards have shadows, hover states, and depth
- [x] Buttons are tap-safe (48px min)
- [x] No fake stats, testimonials, or medical claims added
- [x] No decorative gradients or purple AI colors
- [x] Focus states visible on all interactive elements
- [x] Reduced motion respected

### Validation

- `pnpm lint` — pass (1 warning fixed)
- `pnpm typecheck` — pass
- `pnpm build` — pass (113 pages)
- `pnpm --filter backend test` — pass (79 tests)

## Railway bucket / CMS media wiring (2026-05-06)

### Automated verification (this pass)

- `pnpm --filter frontend typecheck` — pass
- `pnpm lint` — run at repo root (see validation block below)
- `pnpm build` — run at repo root
- `pnpm --filter backend test` — pass (includes media key helpers)

### Implementation checks

- Backend: `admin-media-upload.route.ts`, `media-public.route.ts`, `object-storage.ts`, Railway env aliases in `env.ts` — present locally (**commit before relying on GitHub `main`**; see `git status`).
- Frontend: `asset-media-url.ts`, `merge-ireland-home-media.ts`, `public-asset-slots.ts`, admin upload control (`asset-path-with-upload.tsx`), `next.config.ts` `remotePatterns` — present.

### Manual media QA (requires Railway bucket env on backend)

1. Admin upload JPEG/PNG/WebP/SVG → copy **`publicUrl`** → **`GET`** URL returns image bytes (`200`).
2. Create **`IMAGE`**/`LOGO` asset with canonical **key** (see `public-asset-slots.ts`) → `/home` or `/` updates; deactivate asset → **fallback** SVG returns.
3. Partner band: no logos uploaded → **section absent**; upload one `partner-logo-*` → band appears with real image(s).

### Wix vs hosted visual QA (manual — browser)

Compare [Wix `/home`](https://www.myglobalhealth.online/home) vs hosted `/home` at **390 / 768 / 1440**:

| Check | Notes |
|-------|--------|
| Hero image quality | CMS `ireland-hero` vs fallback SVG |
| Logo | CMS `site-logo` vs temp wordmark |
| Doctor spotlight | `ireland-doctor-spotlight` / doctor key vs AI SVG |
| Home delivery | `ireland-home-delivery` vs SVG |
| Partner / trust | Partner band only with uploads; trust icons vs `trust-*` images |
| Footer CTA | Optional `footer-cta` decor image |

**Result:** Not re-run in Cursor against live Railway in this session — execute after deploy with bucket credentials applied.
