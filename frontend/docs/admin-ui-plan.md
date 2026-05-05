# Admin UI Plan (Phase 2 + 2.1)

## Product / auth boundary

This frontend hosts:

- **Public marketing site** (no login): browse, country selection, services, doctor **profile pages as content**, pricing, blog, legal, **booking request** form.
- **Internal admin UI** (`/admin/...`): staff who manage the site and review booking requests (today: env token; later: real **ADMIN** login).

**Main website login (future) is only for:**

1. **Patients / users** — accounts, profile, booking/payment history, appointment-request status, payments (when built).
2. **Admins** — content management and operational queues for **this** site.

**Not in this app:**

- **Doctor portal** (clinical dashboard, doctor login, doctor-side appointment management) — separate product later; **no doctor routes or dashboards** in this repo.

**Roles:** `PATIENT` | `ADMIN` for authenticated UX here. No `DOCTOR` web-app role in scope.

### Booking vs payment (future documentation alignment)

When payments exist: patient may pay after requesting a booking; **payment alone must not imply medical confirmation**; admins review booking + payment state; clinic/admin confirmation stays explicit.

---

## Scope Delivered

Internal-only admin scaffold routes:

- `/admin`
- `/admin/appointments`
- `/admin/appointments/[id]`

No public nav links point to these routes.

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

## Deferred UI Work

- login screen/session UX for **admins** (and separately **patients** — not doctor)
- **Doctor portal UI** — out of scope for this repository
- bulk actions
- optimistic updates/toasts
- audit timeline / status-change history
- page size selector (backend already supports `pageSize`)
