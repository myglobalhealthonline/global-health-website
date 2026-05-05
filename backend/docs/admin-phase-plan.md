# Admin Phase Plan

## Product and auth context (this repository)

**Who logs into this website (planned):**

1. **Patients / users** (`USER` / `PATIENT`) — register, account area, booking history, payments (later), appointment-request status (later).
2. **Admins** (`ADMIN`) — manage public-site content (countries, services, doctors **as displayed on the marketing site**, pricing, assets, blog/FAQ/legal), and review **booking / appointment requests** (current Phase 2.x queue).

**Who does not use this app’s dashboard:**

- **Doctors / clinical staff** — deferred to a **separate doctor portal** (future, **outside this repo and outside `/admin`**). Do **not** implement doctor login, doctor routes, or doctor-facing appointment management UI here.

**Roles in scope for this codebase:** `PATIENT`, `ADMIN` only for authenticated areas of this site. Public visitors browse without logging in.

### Future booking and payment (design intent — not implemented yet)

End state this documentation assumes:

1. Patient submits a booking **request** (already: intake only; not medical confirmation).
2. Patient may **pay online later** (not built yet).
3. **Payment status** is tracked when payments exist.
4. **Admin** can review combined **booking + payment** state.
5. **No payment does not imply medical confirmation** — clinical/admin confirmation remains explicit and separate from “checkout succeeded.”

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

## Phase 2.1 (this hardening pass)

Goal: safer queue operations before broader admin CRUD.

Implemented:

- **Status transition rules** in `appointment-status-transitions.ts` + service enforcement; `400` on invalid move; terminal: `CANCELLED`, `COMPLETED`
- **Pagination** on `GET /api/admin/appointments`: `page` (default 1), `pageSize` (default 20, max 100), response includes `pagination`
- **Filters**: `status`, `countryCode`, `consultationType`, `search` (substring on name, email, phone)
- **Frontend queue**: filters + pagination + empty state; token remains server-only
- **Frontend detail**: only valid next statuses; closed message for terminal; server action re-checks rules
- **Tests**: `pnpm --filter backend test` runs transition unit tests

## Security Model (Phase 2 / 2.1)

- backend admin endpoints require header: `Authorization: Bearer <ADMIN_API_TOKEN>`
- if `ADMIN_API_TOKEN` not configured, admin API returns `503` (`Admin auth is not configured`)
- invalid/missing bearer token returns `401`
- token stays in server env only (`backend/.env`, server runtime env for Next admin pages)
- token is not exposed through `NEXT_PUBLIC_*` vars
- list endpoint supports search: treat admin token as sensitive; do not log full URLs with tokens

## Explicitly Deferred

- full user login/session auth (JWT, RBAC, refresh flow) for **PATIENT** and **ADMIN** only (this site)
- admin user table + role management
- audit logs and immutable history
- **patient** dashboard features (profile, history, payments, request status) — later on this site
- **doctor portal** (login, schedules, clinical workflows) — **separate product/repo**, not `/admin` here
- payment gateway, payment status persistence, and patient payment UX
- email/calendar workflows
- broad content CRUD admin (beyond current appointment queue hardening)

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

## Next Phase Recommendation

Phase 3 should replace env-token gate with real **ADMIN** identity on this site:

- admin login with hashed password/session
- role checks per action (`ADMIN` vs `PATIENT` — still no doctor role in this app)
- audit trail for status changes
- optional: richer queue UX (saved views, exports) on top of existing pagination/filters
- prepare data model hooks for **payment status** on booking requests (when payments ship)

Doctor-facing features belong in the **separate doctor portal**, not in this phase plan.
