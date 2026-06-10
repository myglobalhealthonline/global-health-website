-- C8: Baseline migration — brings Prisma migration history in sync with production.
--
-- Background: the production DB accumulated schema changes through two paths:
--   1. `prisma db push` (early development) — not tracked in migration files
--   2. `ensure-schema.ts` — idempotent DDL patches applied at boot
--
-- This migration represents the delta between what Prisma migrations recorded
-- and what the production DB actually contains. It is safe to run on a fresh DB
-- (after all prior migrations) and was marked as applied on production via
-- `prisma migrate resolve --applied`.
--
-- When applying to production for the first time after this file is created:
--   pnpm prisma migrate deploy   (applies only this new migration)

-- ─── 1. AuditAction: add ENTITY_PURGED ───────────────────────────────────────
-- The ensure-schema.ts patch ran inside a DO $$...EXCEPTION block which creates
-- a PL/pgSQL subtransaction. ALTER TYPE ADD VALUE cannot run inside a
-- subtransaction (PG restriction), so ENTITY_PURGED was silently skipped while
-- the other four values in the same patch succeeded.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ENTITY_PURGED';

-- ─── 2. CountryDomain: drop orphaned unique index ────────────────────────────
-- ensure-schema.ts patch "CountryDomain.one-primary-per-country-2026-06" called
-- DROP CONSTRAINT IF EXISTS "CountryDomain_countryId_isPrimary_key". That removed
-- the table constraint but left the backing index behind (PG does not auto-drop
-- the index when you drop a constraint that was backed by an existing index vs
-- one created implicitly). The partial unique CountryDomain_one_primary_per_country
-- supersedes it.
DROP INDEX IF EXISTS "CountryDomain_countryId_isPrimary_key";

-- ─── 3. Remove redundant CURRENT_TIMESTAMP defaults ─────────────────────────
-- ensure-schema.ts created these tables with `DEFAULT CURRENT_TIMESTAMP` on
-- updatedAt. Prisma's @updatedAt manages this column at the application layer and
-- does not expect a DB-level default. Removing the default keeps the schema in
-- sync with what Prisma generates for @updatedAt columns.
ALTER TABLE "ServiceFaq" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PatientNationalityDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "MedicalDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;
