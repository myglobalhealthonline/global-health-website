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

## Actual Results

- migration `20260505170031_phase1_booking_persistence` created and applied successfully
- seed completed successfully against the reachable database host
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

## Known Gaps

- no email notification
- no payment workflow
- no scheduling workflow
- no admin review queue yet
- no patient-facing appointment confirmation
- frontend booking UI states were verified by integration code path and backend API behavior, not by browser automation in this pass

## Deployment Notes

- set `DATABASE_URL` to a database reachable from the runtime environment
- for local development outside the host network, use the public database URL for migration and seed commands
- set frontend `NEXT_PUBLIC_API_URL` to the backend base URL for end-to-end booking QA
- Prisma 7 runtime in this project uses `@prisma/adapter-pg` with `pg`
