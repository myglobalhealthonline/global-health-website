-- Per-consultation-line benefit choice + Premium family-member targeting
-- (§ appointment-claim). Additive only: a new enum, two nullable/defaulted
-- columns on CartItem + OrderItem, and two SetNull FKs to FamilyMember.
-- Backfill-free — every new column is nullable or has a default.
--
-- NOTE: `prisma migrate diff` against the live DB also emitted two
-- DropForeignKey statements for PlanConsultationRule's composite FKs. Those
-- are pre-existing schema/DB drift unrelated to this feature and were
-- deliberately omitted (per the plan's "reject anything that drops/rewrites").

-- CreateEnum
CREATE TYPE "BenefitSelection" AS ENUM ('PAY_NORMAL', 'USE_PLAN_CREDIT', 'USE_PLAN_DISCOUNT');

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "benefitSelection" "BenefitSelection" NOT NULL DEFAULT 'PAY_NORMAL',
ADD COLUMN     "familyMemberId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "benefitSelection" "BenefitSelection" NOT NULL DEFAULT 'PAY_NORMAL',
ADD COLUMN     "familyMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
