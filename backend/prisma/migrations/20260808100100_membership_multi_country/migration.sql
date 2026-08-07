-- Private membership plans, phase 7 — multi-country plans, generated ids, cards.
-- Spec: docs/plans/private-membership-plans-implementation.md §19–29.
--
-- ─── THIS FILE IS HAND-WRITTEN. DO NOT REGENERATE IT. ────────────────────────
--
-- `prisma migrate diff` produced a starting point and four things that would
-- have been wrong, every one of them silent:
--
--  1. It DROPPED all three raw-SQL composite FKs and never re-added them
--     (§3.8 — Prisma cannot express them, so every diff sees them as drift and
--     emits DROP CONSTRAINT forever). They are what make cross-country
--     corruption structurally impossible. Restored below, re-targeted.
--  2. It rendered `MembershipPlan.countryId → primaryCountryId` as
--     DROP COLUMN + ADD COLUMN NOT NULL. That discards every plan's country
--     and then fails on the not-null. §21.6 says RENAME, and this does.
--  3. It added `MembershipBenefit.planId` as NOT NULL with no backfill, which
--     cannot apply to a non-empty table. Split into add-nullable → backfill →
--     set not null.
--  4. It proposed dropping five indexes belonging to other features —
--     `Appointment_email_trgm_idx`, `Order_insuranceVerificationStatus_idx`,
--     `PatientProfile_{email,fullName,phone,globalHealthNumber}_trgm_idx`,
--     `PatientProfile_legacyMongoIds_idx` — plus two `updatedAt` DROP DEFAULTs
--     and two index renames. The trigram ones are the nasty half: it would
--     have dropped GIN trigram indexes and recreated plain btrees under the
--     same names, quietly gutting patient search. All cut.
--
-- Re-run `pnpm --filter backend membership:ddl-check` after applying. It is the
-- only thing that proves the composite FKs and CHECKs actually survived.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1. Drop the composite FKs that depend on uniques about to disappear ═════
--
-- `MembershipBenefit_service_country_fkey` is deliberately NOT dropped: it
-- constrains (serviceId, countryId) → Service(id, countryId) and neither
-- column changes shape here. The generated script dropped it purely because
-- Prisma cannot see it.

ALTER TABLE "MembershipEnrollment" DROP CONSTRAINT "MembershipEnrollment_level_country_fkey";
ALTER TABLE "MembershipLevel" DROP CONSTRAINT "MembershipLevel_plan_country_fkey";

-- ═══ 2. MembershipPlan: countryId → primaryCountryId (a RENAME) ══════════════
--
-- Renaming carries the data, the FK and the index definitions with it; only
-- the object NAMES need correcting afterwards so a future diff sees no drift.

ALTER TABLE "MembershipPlan" RENAME COLUMN "countryId" TO "primaryCountryId";

ALTER TABLE "MembershipPlan"
  RENAME CONSTRAINT "MembershipPlan_countryId_fkey" TO "MembershipPlan_primaryCountryId_fkey";

ALTER INDEX "MembershipPlan_countryId_slug_key" RENAME TO "MembershipPlan_primaryCountryId_slug_key";
ALTER INDEX "MembershipPlan_id_countryId_key" RENAME TO "MembershipPlan_id_primaryCountryId_key";
ALTER INDEX "MembershipPlan_countryId_isActive_idx" RENAME TO "MembershipPlan_primaryCountryId_isActive_idx";

-- ═══ 3. MembershipPlanCountry, and one row per existing plan ═════════════════
--
-- Every existing plan becomes a one-country multi-country plan. This backfill
-- must run BEFORE the benefit composite FK in step 4, which points at it.

CREATE TABLE "MembershipPlanCountry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlanCountry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipPlanCountry_countryId_idx" ON "MembershipPlanCountry"("countryId");
CREATE UNIQUE INDEX "MembershipPlanCountry_planId_countryId_key" ON "MembershipPlanCountry"("planId", "countryId");

ALTER TABLE "MembershipPlanCountry" ADD CONSTRAINT "MembershipPlanCountry_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipPlanCountry" ADD CONSTRAINT "MembershipPlanCountry_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MembershipPlanCountry" ("id", "planId", "countryId", "createdAt")
SELECT
  'mpc_' || replace(gen_random_uuid()::text, '-', ''),
  p."id",
  p."primaryCountryId",
  now()
FROM "MembershipPlan" p;

-- ═══ 4. MembershipBenefit: gains planId; countryId changes MEANING only ══════
--
-- `countryId` already exists and every live row holds the plan's (now primary)
-- country, so there is nothing to backfill there — it simply stops meaning
-- "the level's country" and starts meaning "which covered country this row
-- configures" (§21.3).

ALTER TABLE "MembershipBenefit" ADD COLUMN "planId" TEXT;

UPDATE "MembershipBenefit" b
   SET "planId" = l."planId"
  FROM "MembershipLevel" l
 WHERE l."id" = b."levelId";

ALTER TABLE "MembershipBenefit" ALTER COLUMN "planId" SET NOT NULL;

DROP INDEX "MembershipBenefit_levelId_serviceKind_key";
DROP INDEX "MembershipBenefit_levelId_serviceId_key";
DROP INDEX "MembershipBenefit_levelId_isActive_idx";

CREATE UNIQUE INDEX "MembershipBenefit_levelId_countryId_serviceKind_key" ON "MembershipBenefit"("levelId", "countryId", "serviceKind");
CREATE UNIQUE INDEX "MembershipBenefit_levelId_countryId_serviceId_key" ON "MembershipBenefit"("levelId", "countryId", "serviceId");
CREATE INDEX "MembershipBenefit_levelId_countryId_isActive_idx" ON "MembershipBenefit"("levelId", "countryId", "isActive");

-- ═══ 5. MembershipLevel: loses countryId, gains the card colour ══════════════
--
-- A level now spans the plan's countries, so pinning it to one is exactly what
-- has to go. Its (id, countryId) unique goes with the column; the enrollment
-- FK re-targets (id, planId) in step 6.

DROP INDEX "MembershipLevel_id_countryId_key";
ALTER TABLE "MembershipLevel" DROP COLUMN "countryId";
ALTER TABLE "MembershipLevel" ADD COLUMN "cardBackgroundHex" TEXT;
CREATE UNIQUE INDEX "MembershipLevel_id_planId_key" ON "MembershipLevel"("id", "planId");

-- ═══ 6. MembershipEnrollment: generated-id support + card issue state ════════

ALTER TABLE "MembershipEnrollment"
  ADD COLUMN "partnerReference" TEXT,
  ADD COLUMN "cardIssuedAt" TIMESTAMP(3);

CREATE INDEX "MembershipEnrollment_planId_partnerReference_idx" ON "MembershipEnrollment"("planId", "partnerReference");

-- ═══ 7. Cart: decision 44's declined-unit choice ═════════════════════════════
--
-- Without a column the `:unit` / `:discount` choice dies between add-to-cart
-- and checkout, and checkout — which re-derives every price — would always
-- take the unit. Read as WHICH RULE, never as a price (§21.5b).

ALTER TABLE "Cart" ADD COLUMN "membershipDeclineUnit" BOOLEAN NOT NULL DEFAULT false;

-- ═══ 8. Composite foreign keys — the whole point of this file ════════════════
--
-- Prisma models none of these. Every future `migrate diff` will propose
-- dropping them; cut those lines by hand, every time.

-- A benefit row may only configure a country the plan actually COVERS. This is
-- what makes "benefits for an uncovered country" impossible rather than merely
-- discouraged, and it is why MembershipPlanCountry carries a (planId,
-- countryId) unique at all.
ALTER TABLE "MembershipBenefit"
  ADD CONSTRAINT "MembershipBenefit_plan_country_fkey"
  FOREIGN KEY ("planId", "countryId")
  REFERENCES "MembershipPlanCountry"("planId", "countryId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- An enrollment's level must belong to its plan. Replaces the phase-1
-- (levelId, countryId) → MembershipLevel(id, countryId) FK, whose target
-- column no longer exists.
ALTER TABLE "MembershipEnrollment"
  ADD CONSTRAINT "MembershipEnrollment_level_plan_fkey"
  FOREIGN KEY ("levelId", "planId")
  REFERENCES "MembershipLevel"("id", "planId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- …and its reporting country must be its plan's PRIMARY country (§21.5).
--
-- This one is easy to miss and was: dropping MembershipLevel.countryId
-- silently un-pins MembershipEnrollment.countryId, because the FK above says
-- nothing about country. §23 attributes every per-country reporting row
-- through that column, so without this it is app-enforced only.
ALTER TABLE "MembershipEnrollment"
  ADD CONSTRAINT "MembershipEnrollment_plan_country_fkey"
  FOREIGN KEY ("planId", "countryId")
  REFERENCES "MembershipPlan"("id", "primaryCountryId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══ 9. CHECK constraints ════════════════════════════════════════════════════

-- An allowance may only be defined on a service-KIND row, never a
-- service-specific one (§21.3). A service-scoped pool cannot be shared across
-- countries: `Service` rows are per-country and there is no reliable mapping
-- between a Czech service and its Irish counterpart. Slug matching is exactly
-- the silent-failure mode §9 rejected. Service rows may be PERCENT, FIXED or
-- EXCLUDED only.
--
-- Written as `<>` on the type rather than `= AND`, so it evaluates to FALSE
-- (not NULL) for the row it is meant to reject — the NULL hole that bit
-- `MembershipBenefit_value_matches_type` in phase 1.
--
-- Existing rows can violate this: it is a NEW rule, and the shape it forbids
-- was legal for all of phases 1-6. Rather than let Postgres emit a bare
-- `23514 ... is violated by some row`, fail with the ids and a usable
-- instruction. Deliberately NOT auto-converted: turning a service-scoped
-- allowance into a kind-scoped one silently WIDENS what every member of that
-- level gets, from one service to every consultation of that kind, and a
-- migration must not decide that on an admin's behalf.
DO $$
DECLARE
  offending text;
BEGIN
  SELECT string_agg(id, ', ') INTO offending
    FROM "MembershipBenefit"
   WHERE "benefitType" = 'ALLOWANCE' AND "serviceKind" IS NULL;

  IF offending IS NOT NULL THEN
    RAISE EXCEPTION
      'Phase 7 (spec 21.3) forbids an allowance on a service-specific benefit row: a shared pool cannot be pinned to one country''s Service. Offending MembershipBenefit ids: %. Fix each one in the level editor before deploying - either move the allowance to a GENERAL/SPECIALIST kind row, or change the service row to PERCENT/FIXED - then re-run this migration.',
      offending;
  END IF;
END $$;

ALTER TABLE "MembershipBenefit"
  ADD CONSTRAINT "MembershipBenefit_allowance_on_kind_rows_only"
  CHECK ("benefitType" <> 'ALLOWANCE' OR "serviceKind" IS NOT NULL);

-- The card colour is validated in the API (§24.2); this is the backstop, so a
-- malformed value cannot reach the renderer by any other write path. NULL is
-- allowed and means "the default card face".
ALTER TABLE "MembershipLevel"
  ADD CONSTRAINT "MembershipLevel_card_background_hex_format"
  CHECK ("cardBackgroundHex" IS NULL OR "cardBackgroundHex" ~ '^#[0-9a-fA-F]{6}$');
