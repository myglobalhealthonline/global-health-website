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
- `GET /health` — optional **`?db=1`** runs a trivial Prisma query and reports **`database.connected`** (safe codes only; use for local diagnostics).
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

## Database setup

Prisma 7 reads `DATABASE_URL` from **`prisma.config.ts`** via `env("DATABASE_URL")`. That file **loads `backend/.env` automatically** (paths are resolved from the config file location), so `pnpm prisma …` works whether your shell cwd is the **repo root**, **`backend/`**, or you use **`pnpm --filter backend`** — as long as **`backend/.env`** exists with a valid `DATABASE_URL`.

### Local development

From **`backend/`**:

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL, ADMIN_API_TOKEN, PORT as needed
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

From **repository root**:

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
```

Or use the root shortcuts (same as above):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Production / CI deploy

Apply migrations without prompts:

```bash
pnpm --filter backend db:deploy
```

(Run with `DATABASE_URL` pointing at the production database — typically via CI secrets, not committed `.env`.)

### Scripts reference (`backend/package.json`)

| Script | Purpose |
| --- | --- |
| `db:generate` | `prisma generate` — refreshes the Prisma Client after schema changes |
| `db:migrate` | `prisma migrate dev` — creates/applies migrations in development |
| `db:deploy` | `prisma migrate deploy` — applies pending migrations in staging/production |
| `db:seed` | Runs `prisma/seed.ts` |
| `db:studio` | Opens Prisma Studio (needs `DATABASE_URL`) |

### Windows PowerShell (no `.env` file yet)

You can pass the URL for a single command:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_health"
pnpm --filter backend db:generate
```

### Environment variables

See **`backend/.env.example`**. Summary:

- **`DATABASE_URL`** — required for API runtime, Prisma CLI, and seed.
- **`ADMIN_API_TOKEN`** — optional for server start in some setups; required to call **`/api/admin/*`** (including Assets admin after Phase 3.5).
- **`PORT`** — defaults to `4000` in **`src/config/env.ts`** if unset.

Optional **`DATABASE_PUBLIC_URL`** in comments in `.env.example`: some platforms use an internal URL for the deployed app and a **public** URL for tools running on your laptop; use whichever host your machine can reach as **`DATABASE_URL`** when running migrations/seeds locally.

### Troubleshooting

| Issue | What to do |
| --- | --- |
| **`GET /api/countries` (or other public reads) returns `503`** | The handler catches Prisma/database errors and maps them to **`DatabaseUnavailableError`**. Typical causes: **`DATABASE_URL` points at an unreachable host** (e.g. cloud internal hostname from your laptop), Postgres not running, wrong password, database name missing, or **migrations not applied** (`relation ... does not exist`). Fix connectivity, then **`pnpm --filter backend db:migrate`** (or **`db:deploy`**) and **`pnpm --filter backend db:seed`**. |
| **`GET /health?db=1` shows `database.connected: false`** | Same as above — use the returned **`database.code`** (`ECONNREFUSED`, `ENOTFOUND`, `AUTH_FAILED`, `SCHEMA_NOT_MIGRATED`, etc.) as a hint. No secrets are returned. |
| Local Postgres quickly | From **repository root**: **`docker compose up -d`** (see root **`docker-compose.yml`**), then set **`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/global_health`** in **`backend/.env`**, migrate, and seed. |
| `Cannot resolve environment variable: DATABASE_URL` | Ensure **`backend/.env`** exists (copy from **`.env.example`**) **or** export **`DATABASE_URL`** in the shell (see PowerShell above). |
| Internal vs public DB host | Hosted DBs often give a private URL for the app and a public URL for developers — use the URL your environment can reach for **`pnpm db:migrate`** / **`db:seed`**. |
| Ran Prisma from wrong directory | Prefer **`pnpm --filter backend db:*`** from repo root, or **`cd backend`** then **`pnpm db:*`**. |
| Assets admin errors before migration | Apply migrations so **`Asset.usageNote`** and **`Asset.isActive`** exist — run **`db:migrate`** or **`db:deploy`**. |
| `migrate dev` asks for shadow DB | PostgreSQL + `migrate dev` may require a shadow database URL for drift detection; ensure your user can create DBs or set **`shadowDatabaseUrl`** in Prisma if your provider documents it. |

### API dev server

```bash
pnpm --filter backend dev
```

## Safety

- If the database is unavailable, read APIs return safe `503` responses.
- Booking submission returns a request-intake response only after validation and persistence succeed.
- Successful booking means request received only. It does **not** confirm an appointment.
- Frontend is expected to keep static fallback content when this API is unavailable.

## Auth foundation (Phase 4)

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` (placeholder-safe)
- `POST /api/auth/reset-password` (placeholder-safe)

Session strategy:

- Signed JWT stored in an **httpOnly** cookie (`AUTH_COOKIE_NAME`, default `gh_auth`)
- Cookie settings:
  - `httpOnly: true`
  - `sameSite: "lax"`
  - `secure: true` in production, `false` in local dev
  - `maxAge`: 7 days (default)
- JWT settings:
  - secret from `AUTH_JWT_SECRET`
  - expiry from `AUTH_JWT_EXPIRES_IN` (default `7d`)
  - issuer/audience checks enabled

Role model for this website:

- `PATIENT`
- `ADMIN`

No `DOCTOR` auth role is introduced here. Doctors remain public profile/content records in this codebase; doctor portal auth is separate/deferred.

Admin auth migration note:

- `/api/admin/*` continues to use `ADMIN_API_TOKEN` in this phase.
- Future migration should replace env-token-only authorization with `ADMIN` role session checks.

### Phase 4.1 QA notes (Auth + account protection)

Backend auth QA run against `http://localhost:4000` with DB migrated:

- `POST /api/auth/register`:
  - valid patient registration: `200` + auth cookie set
  - duplicate email: `409`
  - weak/invalid password: `400`
- `POST /api/auth/login`:
  - valid credentials: `200` + auth cookie set
  - wrong password: `401`
  - inactive-user path: not currently modeled in service logic
- `GET /api/auth/me`:
  - authenticated session returns user payload (`200`)
  - logged-out session returns `401`
- `POST /api/auth/logout`: returns `200` and clears session cookie
- `POST /api/auth/forgot-password`: placeholder-safe accepted response (`200`, no user enumeration)
- `POST /api/auth/reset-password`: placeholder-safe accepted response (`200`, delivery/consumption deferred)

Deferred behavior (intentional for this phase):

- Password reset email delivery and token lifecycle are placeholders only.
- No doctor login role/portal is introduced.
- Payments are not implemented.
