# Admin UI Plan (Phase 2 + 2.1 + 3.1 + 3.2 + 3.3 + 3.4 + 3.5 + 3.7 + 4)

## Account Scope

Aligned with backend admin/product docs — **this** frontend application only.

### Patient / User

Future **`PATIENT`** accounts on this site (not built yet): register/login, profile, booking-request status, payment history, online pay, invoices/receipts later.

### Admin

Future **`ADMIN`** accounts: manage countries, services, **doctor profiles as public content**, pricing, assets, blog/FAQ/legal (timeline TBD), review booking requests and statuses — surfaced starting under `/admin`.

### Doctor public profiles

Public routes such as doctor/team pages render **`Doctor` database rows as marketing content**. Editing those rows is **admin CMS work**, not “giving doctors an account” on this website.

### Doctor portal (deferred)

No doctor login, doctor dashboard, or doctor portal routes in this repo — **separate portal** later.

### Payments (deferred)

Patient-facing payments and receipts are **not** implemented yet. When added: track payment status; admin can see booking + payment context; **payment ≠ appointment confirmed**.

---

## Product / auth boundary (UI)

This frontend hosts:

- **Public marketing site** (no login): browse, country selection, services, doctor **profile pages as content**, pricing, blog, legal, **booking request** form.
- **Internal admin UI** (`/admin/...`): staff (**ADMIN** role when auth lands); today env-token server fetch only.

**Roles for authenticated UX on this site:** `PATIENT` | `ADMIN` only.

---

## Scope Delivered

Internal-only admin scaffold routes:

- `/admin`
- `/admin/appointments`
- `/admin/appointments/[id]`
- `/admin/countries` — list (name, code, default locale, supported locales, currency, active, key routes, view/edit)
- `/admin/countries/new` — create form + server action (`POST /api/admin/countries`)
- `/admin/countries/[id]` — read-only detail + soft-deactivate (`DELETE` → `isActive: false`)
- `/admin/countries/[id]/edit` — full edit form (`PATCH /api/admin/countries/:id`)
- `/admin/services` — list with filters (country, specialty when country chosen, active, search), pagination, view/edit links
- `/admin/services/new` — pick country then create form (`POST /api/admin/services`); specialties loaded from `GET /api/admin/specialties?countryId=`
- `/admin/services/[id]` — detail + soft-deactivate (`DELETE` → `isActive: false`)
- `/admin/services/[id]/edit` — edit (`PATCH`); country locked to preserve **`countryId + slug`** uniqueness semantics
- `/admin/doctors` — list (filters, pagination, public path column, inactive styling)
- `/admin/doctors/new` — country picker then create (`POST /api/admin/doctors`)
- `/admin/doctors/[id]` — detail + deactivate (`DELETE` → **`active: false`**)
- `/admin/doctors/[id]/edit` — edit (`PATCH`); **country locked** (backend also rejects `countryId` change)
- `/admin/pricing` … `/admin/pricing/[id]/edit` — pricing plans (Phase 3.4)
- `/admin/assets` … `/admin/assets/[id]/edit` — asset metadata (Phase 3.5); uploads deferred
- `/admin/blog-posts`, `/admin/blog-posts/new`, `/admin/blog-posts/[id]`, `/admin/blog-posts/[id]/edit` — blog CMS foundation (Phase 3.7)
- `/admin/faqs`, `/admin/faqs/new`, `/admin/faqs/[id]`, `/admin/faqs/[id]/edit` — FAQ CMS foundation (Phase 3.7)
- `/admin/content-pages`, `/admin/content-pages/new`, `/admin/content-pages/[id]`, `/admin/content-pages/[id]/edit` — legal/static page CMS foundation (Phase 3.7)

No public nav links point to these routes.

### Phase 3.2 notes (services)

- **Title** field in the UI maps to Prisma **`Service.name`**.
- **Category/type** is **`Specialty`** (`specialtyId`); required for validation when the product treats services as categorized — form encourages selection after country is chosen.
- No separate **description** field in schema — UI shows summary only until a migration adds `description`.
- **`consultationSetting` / `bookingSetting`** JSON are not edited in admin UI in this phase.
- Public marketing pages **continue** to use existing **fallback adapters** if the API is down; admin CRUD does not switch public routes to hard-require CMS data.

### Phase 3.3 notes (doctor profiles)

- Routes: **`/admin/doctors`**, **`/admin/doctors/new`**, **`/admin/doctors/[id]`**, **`/admin/doctors/[id]/edit`** — server-only API client; banner copy explains **public directory content only** (no doctor login or portal in this repo).
- List shows derived **public path** as **`{country.teamPath}/{slug}`** (same-origin marketing URL segment — not a new public route).
- **Languages** column shows **—** until a schema migration adds languages.
- **Specialties**: multi-select via **`DoctorSpecialty`** / **`Specialty`** for the chosen country.
- **Profile image**: optional https or `/` path; backend syncs an **`Asset`** row — not a free-form “doctor login email” or credential field.

### Phase 3.5 notes (assets)

- Routes: **`/admin/assets`**, **`/admin/assets/new`** (country scope vs **global**), **`/admin/assets/[id]`**, **`/admin/assets/[id]/edit`**.
- **Preview** thumbnails only for **`IMAGE`** / **`LOGO`** with **`/`** or **`https://`** paths (same-origin or CDN URLs).
- Copy states **metadata only** — no file picker/upload; future storage may use S3, R2, Vercel Blob, etc.

### Phase 3.7 notes (blog / FAQ / legal)

- Admin pages are intentionally simple CRUD scaffolds (server components + server actions) to establish workflow and validation before richer editor UX.
- **Blog posts:** slug/title/excerpt/body/status/locale with optional country/category/author/cover asset/SEO/publish date.
- **FAQs:** question/answer/locale with optional country/category/placement and sort order.
- **Content pages:** page key/title/body/status/locale with optional country/SEO/last reviewed date.
- **Legal warning:** UI allows edits, but public legal pages should remain fallback-safe until approved business/legal copy exists.
- No public navigation changes, no forced backend dependency for public pages, and no replacement of fallback adapters in this phase.

### Phase 4 notes (patient auth/account foundation)

- Added auth pages: `/login`, `/register`, `/forgot-password`, `/account`, `/account/bookings`.
- Session foundation uses backend httpOnly cookie JWT; frontend calls auth endpoints with `credentials: include`.
- `/account` and `/account/bookings` are shell pages for patient profile/booking history progression.
- Guest booking flow remains available on `/book-online`; login is not forced for booking in this phase.
- Doctor login/dashboard/portal remains explicitly out of scope.
- Admin pages remain protected by server-side `ADMIN_API_TOKEN` workflow until role-based admin session migration is completed.

### Phase 6 notes (admin session guard migration)

- `/admin/*` now requires authenticated `ADMIN` role session.
- Unauthenticated users are redirected to `/login?next=/admin`.
- Authenticated `PATIENT` users are redirected to `/account`.
- Admin layout now shows current admin identity and a logout action.
- Admin API client stays `server-only` and forwards cookie/session to backend admin endpoints.
- Token fallback (`ADMIN_API_TOKEN`) may remain as temporary server-side escape hatch only when backend fallback is enabled.

### Phase 3.4 notes (pricing)

- Copy clarifies **displayed pricing only** — no checkout, Stripe, or patient payments in this phase.
- **Price** is edited as **minor units (cents)** to match **`priceCents`**.
- **Interval** is free text aligned with Prisma **`interval`** string (not an enum in schema).
- Feature lists / service linkage UI deferred until migrations add those fields.

## Data Flow / Security

- Admin UI uses server components + server actions only.
- `frontend/lib/admin/admin-api.ts` is marked `server-only`.
- Token source is server env var `ADMIN_API_TOKEN`.
- Requests go to backend admin endpoints with bearer token in server-side fetch.
- No token in client bundle, no token in browser local storage, no token in public env vars.
- Queue filters and pagination are implemented as HTML GET forms / links that only change URL search params; all API calls with the token stay in server-rendered code and server actions.

## Queue Page

`/admin/appointments` shows:

- patient name, email, phone, country, consultation type, status, created date, notes preview, detail link
- **filters** (GET form, resets to page 1): status, country, consultation type, search (name / email / phone)
- **pagination** when `totalPages > 1` (Previous / Next, preserves filter query string)
- **counts** and a clear **empty state** when no rows match

Data source: `GET /api/admin/appointments` with query params mirrored from the page URL.

## Detail Page

`/admin/appointments/[id]` shows:

- full request data, current status, full notes
- **terminal states** (`CANCELLED`, `COMPLETED`): message that the request is closed; **no** status form
- **non-terminal**: status control lists only **allowed next** statuses (aligned with backend transition rules)
- optional message when stored status is not recognized for workflow (no valid next steps)

Status updates submit through a server action that calls `PATCH /api/admin/appointments/:id/status`. The action re-fetches the appointment and checks allowed transitions before calling the API (defense in depth with backend validation).

### Transition hints (UI)

`frontend/lib/admin/appointment-status.ts` mirrors backend allowed-next lists. When changing workflow rules, update backend `appointment-status-transitions.ts`, frontend helper, and docs together.

## Local Test Steps

1. Set backend env:
   - `ADMIN_API_TOKEN=<same-value-used-by-frontend-server>`
2. Set frontend server env:
   - `ADMIN_API_TOKEN=<same-token>`
   - optional `ADMIN_API_BASE_URL=http://localhost:4000`
3. Run backend + frontend.
4. Open `/admin/appointments`, apply filters, paginate, open a row.
5. On detail, confirm only valid next statuses appear; terminal rows show closed state only.
6. Open `/admin/countries`: create a row, view detail, edit, deactivate; confirm inactive row disappears from public `GET /api/countries` only after backend refresh (public adapter fallback unchanged).
7. Open `/admin/services`: filter list, create a service (country → slug/title/specialty/summary/pricing), view detail, edit, deactivate; confirm public site still works via adapters without requiring these rows for every page load.
8. Open `/admin/doctors`: create a profile (country → slug, name, title, specialties, optional image URL/path), view, edit, deactivate; confirm UI messaging distinguishes **public profiles** from any future doctor portal.
9. Open `/admin/pricing`: create a plan (country → slug, name, cents, currency, interval), view, edit, deactivate; confirm disclaimer that **payments are not implemented**.
10. Open `/admin/assets`: create metadata (path/URL, kind, key, alt, usage note), confirm **no upload** and optional preview for raster-capable kinds.

## Deferred UI Work

- login screen/session UX for **admins** (and separately **patients** — not doctor)
- **Doctor portal UI** — out of scope for this repository
- rich text editor workflows (markdown/WYSIWYG), version history, approval workflow for legal content
- bulk actions
- optimistic updates/toasts
- audit timeline / status-change history
- page size selector (backend already supports `pageSize`)

## Auth + Admin UI Polish Pass (2026-05-06)

### Auth surface updates

- `/login` upgraded to a production-style two-column layout:
  - trust/brand panel
  - clear "Welcome back" headline
  - patient/admin-safe helper copy
  - polished success/error state blocks
- `/register` upgraded with patient-focused messaging, stronger helper copy, and consent-style guidance.
- `/forgot-password` upgraded with clear non-enumerating reset explanation and placeholder-safe messaging.
- `/account` upgraded to profile-summary cards with direct actions for bookings and booking CTA.
- `/account/bookings` upgraded with status badges, country/consultation metadata rows, and stronger empty-state CTA.

### Admin dashboard and shell updates

- `/admin` now presents section cards for:
  - Appointments
  - Countries
  - Services
  - Doctors
  - Pricing
  - Assets
  - Blog Posts
  - FAQs
  - Content Pages
- Each card includes icon, title, concise management scope copy, and direct action link.
- Admin shell now includes:
  - clear "Admin area" framing
  - logged-in admin identity
  - persistent logout action
  - left-side admin navigation links
  - scope-safe copy:
    - doctors are public profiles only
    - doctor portal is separate
    - payments not enabled yet

### CRUD visual consistency

- Shared admin table polish improved through shell-level styling:
  - clearer headers, spacing, and row rhythm
  - safer mobile/tablet overflow container behavior
  - consistent typography/readability in dense tables
- Appointment queue now displays clearer status badges for quick triage scanning.
