# Railway Backend Split Plan

## Goal

Run the platform as separate Railway resources:

- `frontend`: Next.js public site and admin UI.
- `backend`: standalone API service that owns database, auth, admin writes, and media.
- `database`: Railway Postgres.
- `bucket`: Railway S3-compatible object storage.

The frontend must stop importing backend code directly at runtime. It should call the backend over HTTP through `API_BASE_URL` or `NEXT_PUBLIC_API_URL`.

## Current Issue

The repository is a pnpm workspace with `frontend` and `backend`, but the runtime boundary is not clean yet.

- `frontend/package.json` depends on `backend: workspace:*`.
- Admin pages and server actions import `prisma` from the backend package.
- Upload presign logic is imported into a Next route handler.
- The backend package currently exposes Prisma/helpers, but it is not a complete standalone HTTP API service.

This means the frontend service needs backend code, database env, and bucket env to perform some admin operations. That blocks clean independent scaling.

## Target Contract

Frontend owns:

- rendering pages
- admin UI forms
- server-side fetch wrappers
- public fallback content when backend is unavailable

Backend owns:

- Prisma client and all database reads/writes
- auth/session validation
- role/permission checks
- admin CRUD endpoints
- public content endpoints
- appointment state transitions
- audit logging
- media presign and media serving
- bucket credentials

## Railway Service Layout

### Frontend Service

Root directory: `frontend`

Required env:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS`

Must not contain:

- `DATABASE_URL`
- bucket secret/access key
- JWT/session signing secrets

### Backend Service

Root directory: `backend`

Required env:

- `DATABASE_URL`
- `PORT`
- `FRONTEND_ORIGIN`
- auth/session secret env
- `RAILWAY_S3_ENDPOINT`
- `RAILWAY_S3_REGION`
- `RAILWAY_S3_BUCKET`
- `RAILWAY_S3_ACCESS_KEY`
- `RAILWAY_S3_SECRET_KEY`
- `RAILWAY_S3_PUBLIC_URL` if the bucket needs a public CDN/base URL

Start command:

```bash
pnpm start
```

Deploy command:

```bash
pnpm db:deploy && pnpm start
```

### Database

Use Railway Postgres.

Backend service gets `DATABASE_URL`.

Frontend service should not connect to the database directly after the split is complete.

### Bucket

Use Railway object storage/S3-compatible bucket.

Backend service gets bucket credentials.

Frontend uploads through backend presign endpoint only.

## Implementation Phases

### Phase 1 - Make backend deployable

- Add a backend HTTP server entrypoint.
- Add `/health`.
- Add CORS for the frontend Railway domain and local dev.
- Add build/start scripts for backend.
- Ensure Prisma migrations deploy from backend service only.

Acceptance:

- Backend runs locally on `http://localhost:4000`.
- `GET /health` returns 200.
- Railway backend deploy starts without Next.js.

### Phase 2 - Move upload/media to backend API

- Move `POST /api/admin/upload/presign` behavior into backend.
- Keep frontend route temporarily as a proxy only if needed.
- Confirm bucket env is present on backend service.
- Add bucket probe command for Railway shell.

Acceptance:

- Admin upload gets a presigned URL from backend.
- Frontend has no bucket secrets.
- Uploaded object appears in Railway bucket.

### Phase 3 - Move admin reads/writes to backend API

- Replace admin `prisma.*` calls in frontend pages/actions with backend fetch calls.
- Add backend routes for countries, categories, services, doctors, users, appointments, and audit.
- Preserve existing Zod validation and appointment transition rules.

Acceptance:

- Admin pages work with only `API_BASE_URL` set.
- Frontend service does not need `DATABASE_URL`.

### Phase 4 - Remove workspace runtime dependency

- Remove `backend: workspace:*` from `frontend/package.json`.
- Keep shared types in a small `shared` package or generated API client.
- Run repo-wide search for `from "backend"` and `from 'backend'`.

Acceptance:

- No frontend runtime imports from backend.
- Frontend can build from `frontend` root without backend source as a package dependency.

### Phase 5 - Scale safely

- Add DB pooling if connection count becomes a limit.
- Add background worker service for email, notifications, and future integrations.
- Add rate limiting and structured request logs.
- Add health/readiness endpoints for database and bucket.

## Verification Checklist

- `pnpm --filter backend typecheck`
- `pnpm --filter backend test`
- `pnpm --filter frontend typecheck`
- `pnpm --filter frontend build`
- `GET /health` on Railway backend returns 200.
- Frontend public pages render with backend online.
- Frontend public pages still render if backend is unavailable.
- Admin login works.
- Admin CRUD works.
- Media upload writes to Railway bucket.
- Frontend Railway env has no database or bucket secrets.

## Immediate Railway Actions

1. Link local repo to Railway project `88985164-c7fa-4d5e-ac9b-2b8a88ec65eb`.
2. Inspect services and variables in environment `dcc67b47-fc5b-47df-a68c-fbf30cf06e57`.
3. Identify frontend service, backend service, Postgres, and bucket.
4. Add missing backend bucket variables from Railway bucket reference variables if available.
5. Set frontend `NEXT_PUBLIC_API_URL` and `API_BASE_URL` to backend service URL.
6. Set backend `FRONTEND_ORIGIN` to frontend service URL.
7. Deploy backend first, then frontend.
