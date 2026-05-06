# Admin Phase Plan

## Account Scope

Canonical account model for **this** website and backend (before Admin Phase 3 CRUD).

### Patient / User

Website accounts (future): role **`PATIENT`** — end users of this marketing/booking site.

Planned capabilities (not fully implemented):

- Register / login
- Manage profile and contact details
- View **booking request** status
- View payment history, pay online, invoices/receipts (**payments deferred** — see below)

### Admin

Website accounts (future): role **`ADMIN`** — staff who operate **this** site.

Planned capabilities:

- Manage countries, services, **pricing**, **assets/images**
- Manage **`Doctor` rows as public profile/content** (what appears on marketing pages — **not** “doctor admins” logging into `/admin` as clinicians)
- Manage blog / FAQ / legal / country-specific content (may trail core CRUD)
- Review booking requests and update appointment-request statuses (Phase 2.x queue today)

### Doctor public profiles

In data and product language, **Doctor** here means **public directory content**:

- Profiles shown on the website (name, title, specialties, bio, imagery, country association, linked services/specialties as surfaced publicly)
- **`Doctor` Prisma model = CMS-style record**, not a login identity

### Doctor portal (deferred)

**Do not** implement in this repo:

- Doctor login, doctor dashboard, doctor portal routes, doctor-facing appointment management

Clinical workflows and doctor identities for **practice use** belong to a **separate doctor portal** (future, outside this application scope).

### Payments (deferred)

**Do not** build payment flows yet. Planned alignment when implemented:

1. Patient submits booking **request**
2. Patient may be asked to **pay online** later
3. **Payment status** is tracked
4. **Admin** can review **booking + payment** state together
5. **Payment does not automatically confirm an appointment** — clinic/admin confirmation remains explicit and separate

---

## Phase 1 (done)

- public content APIs (`/api/countries`, `/api/services`, `/api/doctors`, `/api/pricing`, `/api/assets`)
- booking request API (`POST /api/appointments`)
- Zod validation + Prisma-backed data layer
- safe `503` behavior when database unavailable

## Phase 2 (done)

Goal: minimum safe admin foundation for appointment review.

Implemented:

- env-based admin guardrail via `ADMIN_API_TOKEN`
- protected admin backend routes (list, detail, patch status)
- status labels: `REQUEST_RECEIVED` … `COMPLETED`
- appointment service: list, get by id, update status
- thin route handlers with Zod param/body checks
- internal frontend scaffold + server-only admin client (`frontend/lib/admin/admin-api.ts`)

## Phase 2.1 (done)

Goal: safer queue operations before broader admin CRUD.

Implemented:

- **Status transition rules** in `appointment-status-transitions.ts` + service enforcement; `400` on invalid move; terminal: `CANCELLED`, `COMPLETED`
- **Pagination** on `GET /api/admin/appointments`: `page` (default 1), `pageSize` (default 20, max 100), response includes `pagination`
- **Filters**: `status`, `countryCode`, `consultationType`, `search` (substring on name, email, phone)
- **Frontend queue**: filters + pagination + empty state; token remains server-only
- **Frontend detail**: only valid next statuses; closed message for terminal; server action re-checks rules
- **Tests**: `pnpm --filter backend test` runs transition unit tests

## Phase 3.1 — Countries CRUD (done)

Delivered:

- **Backend:** `GET/POST/PATCH/DELETE /api/admin/countries`, `GET /api/admin/currencies` (form helper), shared `verifyAdminToken` (`backend/src/utils/admin-auth.ts`), Zod `admin-countries.schema.ts`, Prisma-backed `countries.service.ts` (`listAdminCountries`, `getAdminCountryById`, `createAdminCountry`, `updateAdminCountry`, `disableAdminCountry`, `listAdminCurrencies`)
- **Soft-disable:** `DELETE /api/admin/countries/:id` sets `isActive: false` only (no row hard-delete)
- **Frontend:** `/admin/countries`, `/admin/countries/new`, `/admin/countries/[id]`, `/admin/countries/[id]/edit` using server-only `admin-api.ts` + server actions
- **Tests:** `admin-countries.schema.test.ts` (defaultLocale vs locales, paths, duplicate locales, domains primary, PATCH alignment)
- **Public safety:** public read APIs and adapters unchanged; inactive countries hidden from existing `GET /api/countries` (`isActive: true` filter preserved)

## Phase 3.2 — Services CRUD (done)

Delivered:

- **Backend:** `GET/POST/PATCH/DELETE /api/admin/services`, `GET /api/admin/services/:id`, helper `GET /api/admin/specialties?countryId=` for specialty (category) dropdowns; Zod `admin-services.schema.ts`; `services.service.ts` admin methods (`listAdminServices`, `getAdminServiceById`, `createAdminService`, `updateAdminService`, `disableAdminService`, `listSpecialtiesForAdminCountry`); thin `admin-services.route.ts`; duplicate **`countryId + slug`** → `409` (`P2002`).
- **Soft-disable:** `DELETE` sets `isActive: false` only.
- **Filters/pagination:** `countryId`, `countryCode`, `specialtyId`, `isActive`, `search`, `page`, `pageSize` on list.
- **Frontend:** `/admin/services`, `/admin/services/new`, `/admin/services/[id]`, `/admin/services/[id]/edit` — server-only `admin-api.ts`; country select + specialty select; form maps **title** UI label to Prisma **`name`**; summary/duration/price/currency/active; no JSON `consultationSetting`/`bookingSetting` editing.
- **Tests:** `admin-services.schema.test.ts` (slug, negative price, duration, valid payload, query parsing).
- **Public safety:** public routes and fallback adapters unchanged; `GET /api/services` still filters `isActive: true` only — no requirement that public pages load admin data first.

**Schema follow-ups documented** in `admin-api.md`: optional `description`, `sortOrder`, asset linkage, admin editing of JSON settings.

## Phase 3.3 — Doctor public profiles CRUD (done)

Delivered:

- **Backend:** `GET/POST/PATCH/DELETE /api/admin/doctors`, `GET /api/admin/doctors/:id`; Zod `admin-doctors.schema.ts`; `doctors.service.ts` admin methods alongside existing public `listDoctors`; thin `admin-doctors.route.ts`; **`countryId + slug`** duplicate → **`409`** (`P2002`); **`PATCH`** rejects **`countryId`** changes (specialties are country-scoped — create a new profile for another country).
- **Soft-disable:** `DELETE` sets **`active: false`** only (Prisma field name **`active`** — not a user account).
- **Filters/pagination:** `countryId`, `countryCode`, `specialtyId`, `isActive` (maps to **`active`**), `search`, `page`, `pageSize`.
- **Profile image:** optional **`profileImagePath`** stored as one **`Asset`** (`IMAGE`, key `doctor-{id}-profile`); validated https or `/` path.
- **Frontend:** `/admin/doctors`, `/admin/doctors/new`, `/admin/doctors/[id]`, `/admin/doctors/[id]/edit` — copy states **public profiles only**, **no doctor login** in this app.
- **Tests:** `admin-doctors.schema.test.ts`.
- **Public safety:** `GET /api/doctors` still **`active: true`** only; marketing pages keep fallback adapters — not forced to CMS data.

**Schema gaps documented** in `admin-api.md`: languages, qualifications, no `imageUrl` on `Doctor` (use `Asset`).

## Phase 3.4 — Pricing CRUD (done)

Delivered:

- **Backend:** `GET/POST/PATCH/DELETE /api/admin/pricing`, `GET /api/admin/pricing/:id`; Zod `admin-pricing.schema.ts`; `pricing.service.ts` admin methods alongside public `listPricing`; `admin-pricing.route.ts`; **`countryId + slug`** duplicate → **`409`**; **`currencyCode`** must exist in **`Currency`**; **`PATCH`** rejects **`countryId`** changes.
- **Soft-disable:** `DELETE` sets **`isActive: false`** only.
- **Filters/pagination:** `countryId`, `countryCode`, `isActive`, `search`, `page`, `pageSize` (no **`serviceId`** filter until schema links plans to services).
- **Payments boundary:** no Stripe/sessions/card/checkout — **displayed pricing rows only**; documented for future payment awareness.
- **Frontend:** `/admin/pricing`, `/admin/pricing/new`, `/admin/pricing/[id]`, `/admin/pricing/[id]/edit`; currencies from `GET /api/admin/currencies`; UI disclaimer about payments not implemented.
- **Tests:** `admin-pricing.schema.test.ts`.
- **Public safety:** `GET /api/pricing` unchanged (`isActive: true`); fallback adapters preserved.

**Schema gaps:** no **`serviceId`**, **`features`**, **`sortOrder`** on **`PricingPlan`**.

## Phase 3.5 — Assets CRUD (done)

Delivered:

- **Migration:** `backend/prisma/migrations/20260505203000_asset_usage_note_and_active` — adds **`usageNote`**, **`isActive`** (default **`true`**).
- **Backend:** `GET/POST/PATCH/DELETE /api/admin/assets`, `GET /api/admin/assets/:id`; Zod **`admin-assets.schema.ts`** (safe **`path`**, **`altText`** rules by kind); **`assets.service.ts`** admin helpers + public **`listAssets`** filters **`isActive: true`**; **`admin-assets.route.ts`**; duplicate **`kind + key`** → **`409`**.
- **Doctor/country:** optional **`doctorId`**; service resolves **`countryId`** from doctor when needed and validates consistency.
- **Frontend:** `/admin/assets`, `/admin/assets/new` (country vs global scope), `/admin/assets/[id]`, `/admin/assets/[id]/edit`; disclaimer about **metadata only** / uploads deferred (S3, R2, Vercel Blob, etc. documented as future).
- **Tests:** `admin-assets.schema.test.ts`.
- **Public safety:** **`GET /api/assets`** active-only; fallback local assets unchanged.

## Phase 3.6 — Public frontend read integration (done)

Delivered:

- **Frontend:** `frontend/lib/content/public-content-source.ts` (timeouts, dev-only fallback logs), `merge-public-content.ts`, `get-public-{countries,services,doctors,pricing,assets}.ts`; React `cache()` dedupes reads per request; `apiRequest` supports `timeoutMs`.
- **Wiring:** `get-site-context.ts` refreshes navigation after merging `/api/countries`; context lists prefer API rows when non-empty; `template-page-data.ts` overlays Ireland services/doctors on static route inventory; `buildServiceDetailCopyAsync` for Ireland service detail routes; `resolveDoctorProfilePageData` + safe doctor `IMAGE` paths; `mergePricingPlansIntoMarketingPage` for `/plans-pricing` and `/pricing-plans/list`.
- **Safety:** legacy country paths use backend values only when all four routing fields are complete and valid; assets require safe relative `/` paths; no payments/patient/doctor-portal scope expansion.
- **Docs:** `frontend/docs/public-content-integration.md`.

## Phase 3.7 — Blog / FAQ / Legal content CRUD foundation (done)

Delivered:

- **Schema + migration:** added `PublishStatus` enum and models `BlogPost`, `Faq`, `ContentPage` with optional country scoping and active flags.
- **Backend admin endpoints:** protected (`ADMIN_API_TOKEN`) CRUD routes for:
  - `/api/admin/blog-posts`
  - `/api/admin/faqs`
  - `/api/admin/content-pages`
- **Soft-disable behavior:** `DELETE` deactivates rows (`isActive: false`) rather than hard-deleting.
- **Validation:** dedicated Zod schemas enforce safe slug/page keys, locale enum, published body requirement, SEO bounds, and numeric FAQ sort order.
- **Service layer:** `modules/blog`, `modules/faqs`, `modules/content-pages` keep route handlers thin and enforce country/asset FK checks.
- **Tests:** added schema tests for blog, FAQ, content-page validation and draft/published rules.

Safety constraints preserved:

- No payment processing changes.
- No patient dashboard work.
- No doctor portal work.
- Public routes/navigation unchanged.
- Public fallback adapters remain in place.
- Legal copy warning documented: editing is supported, but public legal content should stay fallback-safe until approved copy is available.

## Phase 4 — Patient/User auth foundation + account shell (foundation)

Delivered foundation:

- Added `UserRole` enum with **`PATIENT`** and **`ADMIN`** only (no `DOCTOR` role).
- Added `User` model and `PasswordResetToken` model.
- Added optional `Appointment.userId` for future account-linked bookings, while preserving current guest booking flow.
- Auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/forgot-password` (placeholder-safe)
  - `POST /api/auth/reset-password` (placeholder-safe)
- Session strategy: httpOnly cookie with JWT token, signed with `AUTH_JWT_SECRET`.

Scope constraints retained:

- No doctor login/dashboard/portal in this app.
- Doctors remain public profile/content records only.
- No payment implementation in this phase.
- `ADMIN_API_TOKEN` guard remains for `/api/admin/*` as temporary control until full admin session migration.

Planned migration path:

1. Keep `ADMIN_API_TOKEN` for current internal admin surface.
2. Add admin session guards based on `User.role === ADMIN`.
3. Migrate `/admin` pages and `/api/admin/*` authorization to role session checks.
4. Remove env-token-only guard after role-session parity and rollout validation.

## Phase 4.1 — Auth QA + account protection (done)

Delivered:

- Backend auth endpoints exercised for register/login/me/logout/forgot-password/reset-password placeholder behavior.
- Frontend account protection moved to server-side guard in `frontend/proxy.ts` for `/account/*`.
- Unauthenticated account requests now redirect to `/login?next=<path>`.
- Authenticated `PATIENT` and `ADMIN` sessions can access account routes.
- Guest booking flow on `/book-online` remains open without login requirements.
- Auth UI polish: clearer error/loading states and success redirects after login/register/logout.

Still intentionally excluded:

- No doctor portal/login/dashboard work.
- No `DOCTOR` role addition.
- No payment flow implementation.
- No removal of `ADMIN_API_TOKEN` guard yet.

## Phase 4.2 — Booking ownership + patient booking history (done)

Delivered:

- `POST /api/appointments` now attaches `userId` when a valid patient/admin auth cookie is present.
- Guest booking remains fully supported when auth is missing or invalid.
- Added account-protected patient endpoints:
  - `GET /api/account/appointments`
  - `GET /api/account/appointments/:id`
- Ownership boundaries enforced:
  - `PATIENT` reads only their own account-linked appointments.
  - `ADMIN` support/debug access is allowed without replacing admin queue endpoints.
- Frontend `/account/bookings` now shows server-fetched booking/request history.

Still unchanged by design:

- Admin queue remains under `/api/admin/*` with `ADMIN_API_TOKEN` guard.
- No doctor portal or doctor role additions.
- No payments implementation.

## Phase 6 — Admin session guard migration (done)

Delivered:

- `/api/admin/*` guard now supports real `ADMIN` session auth as the primary path.
- Optional token fallback remains available via `ADMIN_API_TOKEN` when `ADMIN_TOKEN_FALLBACK_ENABLED=true`.
- `PATIENT` sessions are rejected for admin APIs.
- Added guard evaluation tests for no auth, patient/admin session role outcomes, valid/invalid token fallback, and fallback-disabled behavior.
- Seed flow supports optional admin bootstrap through `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FULL_NAME`.

Production recommendation:

- Use real admin session auth for `/api/admin/*`.
- Disable token fallback (`ADMIN_TOKEN_FALLBACK_ENABLED=false`) unless a temporary break-glass path is required.

## Phase 3 (planned): remaining content + ops CRUD (before patient dashboard depth)

Goal: replace env-token gate with real **`ADMIN`** sessions where appropriate, and ship **protected admin APIs + UI** for database-backed **marketing content** this site already reads publicly.

**In scope for Phase 3 CRUD (subject to sequencing):**

1. ~~**Countries**~~ — **done (Phase 3.1)**
2. ~~**Services**~~ — **done (Phase 3.2)**
3. ~~**Doctors**~~ — **done (Phase 3.3)** — public profile records only (directory/CMS; **not** login identities)
4. ~~**Pricing**~~ — **done (Phase 3.4)** — plans as **`PricingPlan`** rows (display-only admin; payments still deferred)
5. ~~**Assets**~~ — **done (Phase 3.5)** — metadata rows (`path`/URL pointers; uploads deferred)

**Explicitly later or parallel tracks (still no doctor portal here):**

- **Blog / FAQ / Legal** content management — plan after or alongside core entities depending on where copy lives (DB vs files)
- ~~**Blog / FAQ / Legal** content management~~ — **done (Phase 3.7 foundation)** with fallback-safe public behavior retained
- **Payment status** fields and admin views — design hooks only until payments are scheduled; **do not** ship payment processing as part of “Phase 3 CRUD” unless explicitly scoped

**Still deferred:**

- Full **patient** dashboard (profile, payments UX, receipts) — separate milestones after Phase 3 content CRUD unless minimally overlapping
- **Doctor portal** — unchanged; separate product
- **Payments** — integration deferred; documentation-only expectations above

**Auth:**

- Phase 3 introduces real **`ADMIN`** identity for `/admin` (sessions/JWT per stack choice); **`PATIENT`** auth remains its own track
- Role checks: **`ADMIN`** vs **`PATIENT`** on this site only — **no `DOCTOR` website role**

## Security Model (Phase 2 / 2.1)

- backend admin endpoints require header: `Authorization: Bearer <ADMIN_API_TOKEN>`
- if `ADMIN_API_TOKEN` not configured, admin API returns `503` (`Admin auth is not configured`)
- invalid/missing bearer token returns `401`
- token stays in server env only (`backend/.env`, server runtime env for Next admin pages)
- token is not exposed through `NEXT_PUBLIC_*` vars
- list endpoint supports search: treat admin token as sensitive; do not log full URLs with tokens

## Explicitly Deferred (cross-phase)

- **Patient** login/session UX and full account dashboard
- **Payment** gateway, persistence, and patient pay flows
- **Doctor portal** (any clinical login or appointment management for doctors)
- audit logs and immutable history (optional incremental adds)
- email/calendar workflows

## Local Setup / Test

1. Set backend env:
   - `DATABASE_URL=...`
   - `ADMIN_API_TOKEN=<strong-random-token>`
2. Set frontend server env for admin pages:
   - `ADMIN_API_TOKEN=<same-token>`
   - optional `ADMIN_API_BASE_URL=http://localhost:4000`
3. Start backend and frontend dev servers.
4. Run `pnpm --filter backend test` (transition rules).
5. Verify API: `GET /api/admin/appointments?page=1&pageSize=20&search=test` with bearer token.
6. Verify UI: `/admin/appointments` filters/pagination; detail transitions respect terminal rules.

Doctor-facing features belong only in the **separate doctor portal**, not in subsequent phases of this plan unless product scope changes.
