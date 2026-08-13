-- Private membership plans, phase 4 (§3.7) — the cart/order side of the
-- feature: which benefit engine prices a cart, and the per-line audit trail
-- the membership engine writes at checkout.
--
-- HAND-EDITED after `prisma migrate diff`, per §3.8's drift guard. Two classes
-- of generated DDL were cut:
--
--   1. `DROP CONSTRAINT` on the three raw-SQL composite FKs added in
--      20260807120100_membership_plans — MembershipLevel_plan_country_fkey,
--      MembershipBenefit_service_country_fkey and
--      MembershipEnrollment_level_country_fkey. Prisma cannot express a
--      composite FK, so every future `migrate diff` reads them as drift and
--      proposes dropping them. They are what make a level, benefit or
--      enrollment structurally incapable of pointing at another country's
--      data, so they stay. Cut these lines again next time.
--
--   2. Pre-existing drift between the dev baseline and this schema that has
--      nothing to do with memberships: BrazilConsentLink / OrderAccessCapability
--      / OrderAccessSession table drops, the pg_trgm index rebuilds on
--      PatientProfile and Appointment, `updatedAt` default drops on
--      SupportThread and DoctorCrossBorderRxCountry, and two index renames.
--      A feature migration must not carry any of that.
--
-- `Cart.benefitSource` is deliberately NOT backfilled here. The
-- `UNSET -> NONE` update runs at the PHASE 5 deploy (§3.8): a backfill now
-- would miss every cart created between the two phases, and §6.4's runtime
-- rule already makes a missed backfill non-fatal.

-- CreateEnum
CREATE TYPE "CartBenefitSource" AS ENUM ('NONE', 'UNSET', 'MEMBERSHIP', 'CORPORATE', 'PUBLIC_PLAN', 'INSURANCE');

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "benefitSource" "CartBenefitSource" NOT NULL DEFAULT 'UNSET',
ADD COLUMN     "membershipEnrollmentId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "membershipAllowanceUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membershipBenefitId" TEXT,
ADD COLUMN     "membershipDiscountCents" INTEGER,
ADD COLUMN     "membershipEnrollmentId" TEXT;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_membershipEnrollmentId_fkey" FOREIGN KEY ("membershipEnrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
