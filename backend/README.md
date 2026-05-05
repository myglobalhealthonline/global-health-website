# Backend API

Stack:
- Fastify
- TypeScript
- Prisma
- Zod

## Phase 1 Scope

Implemented:
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

## Run

```bash
pnpm dev
```

## DB

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Environment

Required:

```env
DATABASE_URL=postgresql://...
PORT=4000
```

## Safety

- If the database is unavailable, read APIs return safe `503` responses.
- Booking submission returns a request-intake response only after validation and persistence succeed.
- Frontend is expected to keep static fallback content when this API is unavailable.
