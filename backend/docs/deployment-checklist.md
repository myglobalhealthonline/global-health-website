# Backend Deployment Checklist (Phase 7)

## Required Environment Variables

- [ ] `DATABASE_URL`
- [ ] `AUTH_JWT_SECRET` (32+ chars)
- [ ] `AUTH_COOKIE_NAME`
- [ ] `AUTH_JWT_EXPIRES_IN`
- [ ] `ADMIN_TOKEN_FALLBACK_ENABLED` (recommended `false` in production)
- [ ] `CORS_ALLOWED_ORIGINS` (comma-separated public/frontend origins)
- [ ] `PORT` (or platform-injected)

Optional:

- [ ] `ADMIN_API_TOKEN` (only if fallback enabled)
- [ ] `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FULL_NAME` (non-production/dev bootstrap only)

## Migration and Startup

- [ ] `pnpm --filter backend db:deploy` executed successfully.
- [ ] Application started with production env.
- [ ] `GET /health` returns `200`.
- [ ] `GET /health?db=1` returns `200` with `database.connected: true`.

## API Verification

Public endpoints:

- [ ] `/api/countries`
- [ ] `/api/services`
- [ ] `/api/doctors`
- [ ] `/api/pricing`
- [ ] `/api/assets`

Auth/account:

- [ ] `/api/auth/register`
- [ ] `/api/auth/login`
- [ ] `/api/auth/me`
- [ ] `/api/auth/logout`
- [ ] `/api/account/appointments`

Admin:

- [ ] `/api/admin/*` allows authenticated `ADMIN` session.
- [ ] `/api/admin/*` rejects unauthenticated requests.
- [ ] `/api/admin/*` rejects `PATIENT` session (`403`).
- [ ] Token fallback behavior matches `ADMIN_TOKEN_FALLBACK_ENABLED`.

## Security Checks

- [ ] Cookies are `httpOnly`, `sameSite=lax`, and `secure=true` in production.
- [ ] CORS allows only configured origins in production.
- [ ] No debug secrets emitted in logs/responses.
- [ ] Fallback token path disabled by default unless explicitly needed.

