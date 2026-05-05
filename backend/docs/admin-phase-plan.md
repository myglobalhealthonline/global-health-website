# Admin Phase Plan

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

- full user login/session auth (JWT, RBAC, refresh flow)
- admin user table + role management
- audit logs and immutable history
- patient dashboard / doctor dashboard
- payment/email/calendar workflows
- broad content CRUD admin

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

Phase 3 should replace env-token gate with real admin identity:

- admin login with hashed password/session
- role checks per action
- audit trail for status changes
- optional: richer queue UX (saved views, exports) on top of existing pagination/filters
