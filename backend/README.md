# Backend API

Stack:
- Fastify
- TypeScript
- Prisma
- Zod

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
- process payments
- expose admin CRUD yet

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
