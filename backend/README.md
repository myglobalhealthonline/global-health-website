# Backend API

Stack:
- Fastify
- TypeScript
- Prisma
- Zod

## Identity and roles (product intent)

Authenticated users of **this** backend/site are modeled as **`PATIENT`** (website user) and **`ADMIN`** (staff). **Doctors do not authenticate here** for clinical workflows — a **separate doctor portal** is deferred outside this repository.

Public endpoints (`/api/countries`, `/api/services`, `/api/doctors`, etc.) expose **marketing directory data** (e.g. doctor profiles on the public site), not a doctor dashboard API.

## Future booking + payment (design only)

Not implemented yet, but planned alignment:

1. Patient submits booking **request** (current `POST /api/appointments` remains intake-oriented).
2. Patient may pay online later; persist **payment status** when introduced.
3. **Admin** can review booking together with payment state.
4. **Successful payment must not imply medical confirmation** — admin/clinic confirmation stays explicit.

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
