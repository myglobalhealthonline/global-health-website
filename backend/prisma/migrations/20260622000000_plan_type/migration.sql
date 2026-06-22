-- ============================================================================
-- Plan templates — add PlanType to PricingPlan + backfill the live plans.
-- Plan: ~/.claude/plans/my-global-health-harmonic-meadow.md
-- Each plan tier (Essential/Comprehensive/Premium) is a distinct admin template;
-- planType drives default GP credits + whether wellness/health-kit sections show.
-- Hand-authored (repo deploys via `migrate deploy`; never `migrate dev` on prod).
-- ============================================================================

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('ESSENTIAL', 'COMPREHENSIVE', 'PREMIUM');

-- AlterTable: new column with a safe default so existing rows stay valid.
ALTER TABLE "PricingPlan" ADD COLUMN "planType" "PlanType" NOT NULL DEFAULT 'COMPREHENSIVE';

-- Backfill the 3 live `ie` plans by slug (no-op if slugs/country differ —
-- verify post-deploy with: SELECT slug,"planType" FROM "PricingPlan").
UPDATE "PricingPlan" p SET "planType" = 'ESSENTIAL'
  FROM "Country" c WHERE p."countryId" = c.id AND c.code = 'ie' AND p.slug = 'essential-care';
UPDATE "PricingPlan" p SET "planType" = 'COMPREHENSIVE'
  FROM "Country" c WHERE p."countryId" = c.id AND c.code = 'ie' AND p.slug = 'comprehensive-care';
UPDATE "PricingPlan" p SET "planType" = 'PREMIUM'
  FROM "Country" c WHERE p."countryId" = c.id AND c.code = 'ie' AND p.slug = 'premium-wellness-care';
