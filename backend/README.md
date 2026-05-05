# Backend API

Stack:
- Fastify
- TypeScript
- Prisma
- Zod

## Account Scope

- **`PATIENT`** — future website user: booking-request visibility, profile, payments/receipts later (**payments not implemented**).
- **`ADMIN`** — future staff user for this site: content CRUD (countries, services, **doctor profiles as public records**, pricing, assets), booking-queue ops, country-specific content as scoped.
- **`Doctor` model** — **public directory / CMS data only** (profiles on marketing pages). Not a login principal here.
- **Doctor portal** — clinical login and doctor-side workflows **deferred**; separate system outside this app.
- **Payments** — **deferred**; planned flow: optional patient pay after request → payment status → admin sees booking+payment → **pay does not auto-confirm** clinically.

There is **no `User` / `UserRole` enum in Prisma yet**; when introduced for this app, roles should remain **`PATIENT` | `ADMIN`** only for website accounts. Any legacy or alternate schema that adds **`DOCTOR` as a user role** should be treated as **deferred / wrong portal** — simplify toward PATIENT+ADMIN for **this** codebase when safe migration-wise.

## Identity and roles (implementation note)

Authenticated users of **this** backend/site will be **`PATIENT`** and **`ADMIN`** only. **Doctors do not authenticate here** for clinical work — **separate doctor portal**.

Public endpoints (`/api/countries`, `/api/services`, `/api/doctors`, etc.) expose **marketing directory data** (including doctor profiles), not doctor-portal APIs.

## Future booking + payment (design only)

Not implemented yet:

1. Patient submits booking **request** (`POST /api/appointments` stays intake-oriented).
2. Patient may pay online later; persist **payment status** when introduced.
3. **Admin** can review booking together with payment state.
4. **Successful payment must not imply medical confirmation** — clinic/admin confirmation stays explicit.

## Phase 1 Scope

Implemented:
- `GET /health`
- `GET /api/countries`
- `GET /api/services`
- `GET /api/doctors`
- `GET /api/pricing`
- `GET /api/assets`
- `POST /api/appointments`

Booking requests are request-intake only.

The API does **not**:
- confirm appointments
- send emails
- process payments (or expose doctor-portal APIs)

Doctor-facing APIs and **`DOCTOR` auth role** are **out of scope** for this service until/unless product explicitly merges portals (not current plan).

## Environment

Required:

```env
DATABASE_URL=postgresql://...
PORT=4000
```

Optional when local development cannot reach the platform internal host:

```env
DATABASE_PUBLIC_URL=postgresql://...
```

If your platform provides both an internal and public database URL:
- keep the internal URL for in-platform runtime
- use the public URL as `DATABASE_URL` for local migration and seed commands

## Local Commands

```bash
pnpm --filter backend dev
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

## Safety

- If the database is unavailable, read APIs return safe `503` responses.
- Booking submission returns a request-intake response only after validation and persistence succeed.
- Successful booking means request received only. It does **not** confirm an appointment.
- Frontend is expected to keep static fallback content when this API is unavailable.
