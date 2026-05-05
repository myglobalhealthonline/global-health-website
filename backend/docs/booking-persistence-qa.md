# Booking Persistence QA

## Test Cases

1. `GET /health`
2. `GET /api/countries`
3. `GET /api/services`
4. `GET /api/doctors`
5. `GET /api/pricing`
6. `GET /api/assets`
7. `POST /api/appointments` with valid payload
8. `POST /api/appointments` with missing consent
9. `POST /api/appointments` with invalid email
10. `POST /api/appointments` with unreachable database

## Expected Results

- health route returns backend alive response
- read APIs return structured JSON from database rows
- valid booking writes a request record and returns follow-up messaging only
- invalid booking returns readable validation error
- unreachable database returns safe `503`

## Actual Results (integrated API pass — reachable DB)

Recorded when the runtime could reach the configured PostgreSQL host:

- migration `20260505170031_phase1_booking_persistence` created and applied successfully
- seed completed successfully against that reachable database host
- `GET /health` returned `200`
- `GET /api/countries` returned `200` with 5 seeded countries
- `GET /api/services` returned `200` with seeded service rows per country
- `GET /api/doctors` returned `200` with seeded doctors, specialties, and doctor-linked assets
- `GET /api/pricing` returned `200` with seeded pricing plans
- `GET /api/assets` returned `200` with seeded logo, hero, doctor, and trust icon asset rows
- valid `POST /api/appointments` returned `200` and message `Request received. Our team will follow up.`
- direct database verification confirmed an `Appointment` row persisted with status `REQUEST_RECEIVED`
- invalid booking payload returned `400` with field errors for invalid email and missing consent
- backend started with an unreachable database still returned safe `503` for read and booking routes

## Browser QA — `/book-online` (2026-05-05)

**Setup**

- Frontend dev server at `http://localhost:3000` with `NEXT_PUBLIC_API_URL=http://localhost:4000` via `frontend/.env.local` (gitignored; mirror `frontend/.env.example`).
- Backend dev server at `http://localhost:4000` after loading `backend/.env` through `import "dotenv/config"` from `backend/src/app.ts`.
- Database from this developer machine: `DATABASE_URL` pointed at `postgres.railway.internal`, which resolves only inside Railway’s network (`getaddrinfo ENOTFOUND`). That explains **`503`** / `Appointments are temporarily unavailable` on booking and read routes during this browser session—**no `Appointment` row could be created locally** until `DATABASE_URL` uses a host reachable from the workstation (or a tunnel).

**CORS**

- Before fixes, the browser blocked `POST http://localhost:4000/api/appointments` from `http://localhost:3000` (`OPTIONS` returned `404`, no `Access-Control-Allow-Origin`).
- After registering `@fastify/cors` on the Fastify app, preflight returned **`204`** with `Access-Control-Allow-Origin` reflecting the requesting origin.

**Screenshots** (`frontend/docs/qa-screenshots/`)

- `book-online-viewport-320.png`
- `book-online-viewport-390.png`
- `book-online-viewport-768-form.png`
- `book-online-viewport-1024-form.png`
- `book-online-viewport-1440-form.png`

Viewport automation notes: for reliable accessibility snapshots with the in-IDE browser, use **viewport width ≥ ~768px** and navigate to `http://localhost:3000/book-online#booking-form`. Narrower widths still produced full-page screenshots for layout review.

### Test matrix

| Case | Result |
|------|--------|
| Valid submit (country, consultation, name, email, phone, notes, consent) | Submit showed **Submitting request...** (disabled). With DB unreachable here, API returned **`503`**; UI shows **Booking service is temporarily unavailable. Please try again later or contact the clinic team directly.** No false “appointment confirmed” copy. **No row persisted** while `503` is returned. With a reachable DB, expect **`200`** and message **Request received. Our team will follow up.** |
| Missing required fields | Inline field errors + summary **Please review the highlighted fields before submitting.** Client validation blocks `fetch`; **no POST**. |
| Missing consent | Blocked client-side; consent error + summary status. **No POST**. |
| Invalid email | Blocked client-side; **Enter a valid email address.** **No POST**. |
| Backend healthy but DB down (`503`) | Safe banner as above; **no crash**; form values retained. |
| Backend offline / network failure | `fetch` catches → same patient-facing **Booking service is temporarily unavailable** copy (covers both connection failure and `Appointments are temporarily unavailable`). Preview/fallback when `NEXT_PUBLIC_API_URL` is unset remains unchanged. |

**Sample `400` body** (missing consent, otherwise valid):

```json
{"ok":false,"message":"Invalid booking request","details":{"formErrors":[],"fieldErrors":{"consentAccepted":["Consent is required before submitting a booking request"]}}}
```

The frontend `apiRequest` helper surfaces the **first** `details.fieldErrors` message when present.

## Fixes applied during this QA pass

- **`backend`:** `dotenv` + `import "dotenv/config"` at top of `src/app.ts` so `DATABASE_URL` loads from `backend/.env` during `pnpm --filter backend dev`.
- **`backend`:** `@fastify/cors` + `await app.register(cors, …)` so browser `OPTIONS`/`POST` from the Next origin succeed.
- **`backend`:** `buildApp` is async; `server.ts` awaits it and awaits each route `register` call.
- **`frontend`:** `lib/api/client.ts` prefers the first Zod `fieldErrors` string when the API returns `400`.
- **`frontend`:** booking card uses `overflow-x-hidden` and labels/grids use `min-w-0` to reduce narrow-viewport overflow.
- **`frontend`:** `HeroSection` stacked/split hero wrappers use `suppressHydrationWarning` to quiet dev-only text mismatches tied to font/layout timing.
- **`frontend`:** `BookingFormTemplate` reads `hasPublicApiBaseUrl()` via `useState(() => …)` initializer.

## Known Gaps

- no email notification
- no payment workflow
- no scheduling workflow
- no admin review queue yet
- no patient-facing automated appointment confirmation (success path still says **request received / team will follow up** only)
- **Local dev:** ensure `DATABASE_URL` is not an internal-only hostname unless you run the backend inside that network

## Deployment Notes

- set `DATABASE_URL` to a database reachable from the runtime environment
- for local development outside the host network, use the public database URL for migration and seed commands
- set frontend `NEXT_PUBLIC_API_URL` to the backend base URL for end-to-end booking QA
- Prisma 7 runtime in this project uses `@prisma/adapter-pg` with `pg`
