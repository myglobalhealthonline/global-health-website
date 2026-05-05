# Admin Phase Plan

## Phase 1 (done)

- public content APIs (`/api/countries`, `/api/services`, `/api/doctors`, `/api/pricing`, `/api/assets`)
- booking request API (`POST /api/appointments`)
- Zod validation + Prisma-backed data layer
- safe `503` behavior when database unavailable

## Phase 2 (this pass)

Goal: minimum safe admin foundation for appointment review.

Implemented:

- env-based admin guardrail via `ADMIN_API_TOKEN`
- protected admin backend routes:
  - `GET /api/admin/appointments`
  - `GET /api/admin/appointments/:id`
  - `PATCH /api/admin/appointments/:id/status`
- status workflow allowed in Phase 2:
  - `REQUEST_RECEIVED`
  - `UNDER_REVIEW`
  - `CONTACTED`
  - `CANCELLED`
  - `COMPLETED`
- appointment service functions:
  - `listAppointments`
  - `getAppointmentById`
  - `updateAppointmentStatus`
- thin route handlers with Zod param/body checks
- internal frontend scaffold:
  - `/admin`
  - `/admin/appointments`
  - `/admin/appointments/[id]`
- server-only frontend admin fetch layer (`frontend/lib/admin/admin-api.ts`) that never exposes token to browser JavaScript

## Security Model (Phase 2)

- backend admin endpoints require header: `Authorization: Bearer <ADMIN_API_TOKEN>`
- if `ADMIN_API_TOKEN` not configured, admin API returns `503` (`Admin auth is not configured`)
- invalid/missing bearer token returns `401`
- token stays in server env only (`backend/.env`, server runtime env for Next admin pages)
- token is not exposed through `NEXT_PUBLIC_*` vars

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
4. Verify API directly:
   - `GET /api/admin/appointments` with bearer token.
5. Verify UI:
   - open `/admin/appointments`
   - open detail page
   - update status

## Next Phase Recommendation

Phase 3 should replace env-token gate with real admin identity:

- admin login with hashed password/session
- role checks per action
- audit trail for status changes
- pagination/filtering/search for queue
