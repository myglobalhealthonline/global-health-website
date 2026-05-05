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
