# Admin UI Plan (Phase 2)

## Scope Delivered

Internal-only admin scaffold routes:

- `/admin`
- `/admin/appointments`
- `/admin/appointments/[id]`

No public nav links point to these routes.

## Data Flow / Security

- Admin UI uses server components + server action only.
- `frontend/lib/admin/admin-api.ts` is marked `server-only`.
- Token source is server env var `ADMIN_API_TOKEN`.
- Requests go to backend admin endpoints with bearer token in server-side fetch.
- No token in client bundle, no token in browser local storage, no token in public env vars.

## Queue Page

`/admin/appointments` shows:

- patient name
- email
- phone
- country
- consultation type
- status
- created date
- notes preview
- detail link

## Detail Page

`/admin/appointments/[id]` shows:

- full request data
- current status
- full notes
- status update control

Status updates submit through a server action that calls backend `PATCH /api/admin/appointments/:id/status`.

## Local Test Steps

1. Set backend env:
   - `ADMIN_API_TOKEN=<same-value-used-by-frontend-server>`
2. Set frontend server env:
   - `ADMIN_API_TOKEN=<same-token>`
   - optional `ADMIN_API_BASE_URL=http://localhost:4000`
3. Run backend + frontend.
4. Open `/admin/appointments`.
5. Open one appointment detail page.
6. Change status and save.

## Deferred UI Work

- login screen/session UX for admins
- table filters (status/country/date/search)
- pagination and bulk actions
- optimistic updates/toasts
- audit timeline / status-change history
