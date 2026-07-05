-- Subscription benefit-unlock policy (D25) + per-country tier uniqueness (B9).
-- Additive; deploy with `prisma migrate deploy` (this repo does not run
-- `migrate dev` — see docs/plans notes on the shadow-DB workaround).

-- D25: all plan benefits (GP credits + specialist discounts) unlock from the
-- 2nd paid month. Default 2 backfills every existing plan row. Existing
-- subscribers keep their current snapshot (no field) until their next renewal
-- re-snapshots, which then carries this value — grandfathering is automatic.
ALTER TABLE "PricingPlan"
  ADD COLUMN "benefitsUnlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 2;

-- B9: at most one ACTIVE plan per (country, tier). Partial unique so
-- deactivated (superseded) plans don't count. Kept as raw SQL in the migration
-- only (Prisma's schema DSL can't express a WHERE-filtered unique) — same
-- pattern as the Wave-0 partial uniques. Pre-check before deploy if unsure:
--   SELECT "countryId","planType",COUNT(*) FROM "PricingPlan"
--   WHERE "isActive" GROUP BY 1,2 HAVING COUNT(*) > 1;  -- deactivate dupes first
CREATE UNIQUE INDEX IF NOT EXISTS "PricingPlan_country_tier_active_key"
  ON "PricingPlan"("countryId", "planType")
  WHERE "isActive";
