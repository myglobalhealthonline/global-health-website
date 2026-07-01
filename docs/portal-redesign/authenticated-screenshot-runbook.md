# Authenticated Screenshot Runbook

This is the next phase after the source-level portal redesign audit.

The first screenshot attempt proved that protected portal routes redirect to `/login?next=...` without a valid `gh_auth` cookie. The authenticated pass must log in as each role, capture every checklist route at the required widths, and update the screenshot checklist from evidence.

## Prerequisites

- Frontend running at `http://localhost:3000`.
- Backend running at `http://127.0.0.1:4000`.
- Chrome binary available. The current local path is:
  `C:\Users\kingh\Downloads\chrome-win\chrome.exe`
- Valid test credentials for each role being captured.

Do not hardcode credentials in the repository. Pass them through environment variables:

```powershell
$env:PORTAL_SCREENSHOT_CHROME="C:\Users\kingh\Downloads\chrome-win\chrome.exe"
$env:PORTAL_SCREENSHOT_SITE_URL="http://localhost:3000"
$env:PORTAL_SCREENSHOT_API_URL="http://127.0.0.1:4000"
$env:PORTAL_SCREENSHOT_COOKIE_NAME="gh_auth"

$env:PORTAL_SCREENSHOT_ADMIN_EMAIL="..."
$env:PORTAL_SCREENSHOT_ADMIN_PASSWORD="..."

$env:PORTAL_SCREENSHOT_DOCTOR_EMAIL="..."
$env:PORTAL_SCREENSHOT_DOCTOR_PASSWORD="..."

$env:PORTAL_SCREENSHOT_PATIENT_EMAIL="..."
$env:PORTAL_SCREENSHOT_PATIENT_PASSWORD="..."
```

## Commands

Run all static admin routes at the required screenshot widths:

```powershell
node scripts/portal-authenticated-screenshots.mjs --portal admin
```

Run one smoke route:

```powershell
node scripts/portal-authenticated-screenshots.mjs --portal admin --route /admin --widths 390,1280
```

Run the checklist in smaller batches:

```powershell
node scripts/portal-authenticated-screenshots.mjs --portal admin --route-offset 0 --route-limit 10
node scripts/portal-authenticated-screenshots.mjs --portal admin --route-offset 10 --route-limit 10
```

Run all available portals:

```powershell
node scripts/portal-authenticated-screenshots.mjs
```

## Dynamic Routes

Routes containing `[id]`, `[email]`, `[country]`, or similar placeholders are skipped unless a concrete route map is supplied:

```powershell
$env:PORTAL_SCREENSHOT_ROUTE_MAP_JSON='{
  "/admin/doctors/[id]": "/admin/doctors/REAL_DOCTOR_ID",
  "/doctor/appointments/[id]": "/doctor/appointments/REAL_APPOINTMENT_ID",
  "/account/orders/[id]": "/account/orders/REAL_ORDER_ID"
}'
```

Use live IDs from the seeded local database or a disposable test database.

## Output

Each run writes:

- `docs/portal-redesign/authenticated-screenshots/<timestamp>/results.json`
- `docs/portal-redesign/authenticated-screenshots/<timestamp>/images/**`

The `results.json` file records route, width, final path, HTTP status, login redirects, skipped dynamic routes, and screenshot paths.

The runner writes `results.json` incrementally after each result, so partial evidence survives long-running batches or timeouts.

## Authentication Method

The runner logs in directly against `PORTAL_SCREENSHOT_API_URL` and injects the returned auth cookie into the browser context for `PORTAL_SCREENSHOT_SITE_URL`.

This avoids depending on the Next.js same-origin auth proxy during visual review. The protected portal layouts still validate the cookie through the backend `/api/auth/me` call.

## Safety Notes

- `backend/.env` currently points at a Railway database host. Do not run seed scripts against it unless the database is intentionally disposable.
- `backend/scripts/seed-test-accounts.ts` creates doctor and patient test accounts but refuses production-looking database hosts unless `FORCE_SEED=true`; do not bypass that guard for production data.
- Complete checklist closure still requires admin, doctor, and patient credentials plus concrete dynamic route IDs.
