# `pending-migrations/`

Migrations that are written and reviewed but **must not** ship until a
gating condition is satisfied. Prisma does not scan this folder
(`migrate dev`, `migrate deploy`, `migrate diff` all read
`backend/prisma/migrations/` only), so a file living here can't
accidentally be applied by a normal deploy.

## How to graduate a pending migration

1. Verify every condition listed in the header banner of the migration.
2. Move the folder into `backend/prisma/migrations/` with a fresh
   timestamp on the prefix (e.g. `20260601090000_drop_legacy_*`).
3. Open the follow-up PR. Reviewer should re-read the gating banner and
   confirm each condition is met before merging.
4. Standard deploy applies it via `prisma migrate deploy`.

## Current pending items

- **`20260523_drop_legacy_imcRegistration`** — drops
  `Doctor.imcRegistration` after the per-country
  `DoctorCountry.registrationNumber` rollout (Phase 1, T1–T26) is
  verified in prod via the backfill drift-check.
