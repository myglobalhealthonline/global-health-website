# Frontend

## Account Scope

This Next.js app serves **public marketing pages** and **internal `/admin` tools** (token-auth today).

| Concept | In this app |
| --- | --- |
| **Patient / user** | Future **`PATIENT`** login: profile, booking-request status, payments/receipts (**payments deferred**). |
| **Admin** | Future **`ADMIN`** login: manage countries, services, **doctor public profiles** (content records), pricing, assets, blog/FAQ/legal as planned; booking queue (today partial). |
| **Doctor** | **Public profile pages only** (`Doctor` data from API/CMS). **Not** a dashboard user here. |
| **Doctor portal** | **Deferred** — separate product; no doctor routes or clinical UI in this repo. |
| **Payments** | **Deferred** — design: optional pay after request, tracked status, admin visibility; **pay ≠ confirmed appointment**. |

Do **not** remove or reroute existing **public doctor profile / team** pages — they remain SEO/marketing surfaces.

## Public Frontend Runtime

The public website remains fallback-safe.

Phase 1 behavior:
- static adapters remain the source of truth when backend is offline
- `NEXT_PUBLIC_API_URL` enables gradual backend reads
- booking form can submit booking requests to backend when configured

Phase 3.6 (gradual read integration): public navigation, country hubs, Ireland consultation listings/details, team/doctor profiles, pricing marketing pages, and optional doctor profile images prefer normalized data from `GET /api/*` when available; seeds and template builders fill gaps. See `frontend/docs/public-content-integration.md`.

## Required Environment

Optional for local fallback-only mode:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

If `NEXT_PUBLIC_API_URL` is missing:
- public pages continue rendering from fallback content
- booking form stays usable but does not send a live request

## Booking Integration

With `NEXT_PUBLIC_API_URL` configured:
- `/book-online` posts to `POST /api/appointments`
- success means request received only
- clinic team still needs to follow up manually

Expected frontend states:
- valid form shows loading then a success message
- missing required fields stay client-side and show readable errors
- missing consent blocks submit and shows a readable error
- backend validation failure shows a readable error state
- backend unavailable shows a readable unavailable message

## Booking UX

Frontend booking does:
- client-side required field checks
- loading state
- success state
- safe error state

Frontend booking does **not**:
- confirm an appointment
- imply payment
- bypass clinic follow-up

## Phase 4.1 Auth + Account Protection

Delivered in this phase:

- Server-side account route protection in `frontend/proxy.ts` for `/account` and `/account/*`.
- Unauthenticated users are redirected to `/login?next=<requested-account-path>`.
- Access remains allowed for authenticated `PATIENT` and `ADMIN` users.
- Public routes and navigation remain unchanged.
- Guest booking remains open on `/book-online` (no login wall).

Auth UX polish updates:

- Login and register forms now redirect to `next` or `/account` after success.
- Login form includes forgot-password shortcut.
- Register form includes password helper copy.
- Auth forms provide clearer loading and inline error/success status messaging.
- Logout now redirects to `/login?next=/account`.

Scope explicitly excluded:

- No doctor portal, no doctor dashboard, no `DOCTOR` auth role.
- No payment implementation.
- `ADMIN_API_TOKEN` guard remains in place for admin APIs.
