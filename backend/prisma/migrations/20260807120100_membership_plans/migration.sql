-- Private membership plans, phase 1 — tables.
-- docs/plans/private-membership-plans-implementation.md §3
--
-- Generated with `prisma migrate diff --from-config-datasource --to-schema`
-- against the DEV database (backend/.env.dev), then reviewed line-by-line and
-- stripped of DDL that does not belong to this feature (§3.8 drift guard).
-- Removed from the generated script: dev-only leftovers from two abandoned
-- migrations (BrazilConsentLink / OrderAccessCapability / OrderAccessSession /
-- OrderAccessPurpose and two BrazilConsentSubmission columns), the recurring
-- trigram-index churn on PatientProfile / Appointment, the
-- Order_insuranceVerificationStatus_idx drop, two `updatedAt` DROP DEFAULTs and
-- two index renames. All of those are pre-existing repo-wide drift, unrelated
-- to memberships, and are deliberately left alone.
--
-- The raw-SQL section at the end carries what Prisma cannot express: the
-- country-pinning composite FKs, the §3.3 CHECK invariants and the three
-- partial / expression unique indexes.

-- CreateEnum
CREATE TYPE "MembershipEnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MembershipMemberType" AS ENUM ('PRIMARY', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "MembershipAllowancePool" AS ENUM ('SHARED', 'PER_PERSON');

-- CreateEnum
CREATE TYPE "MembershipBenefitType" AS ENUM ('ALLOWANCE', 'PERCENT', 'FIXED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "MembershipFallbackType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "MembershipLedgerReason" AS ENUM ('SPEND', 'REFUND', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "MembershipImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "payerName" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "payerAmountCents" INTEGER,
    "payerCurrency" TEXT,
    "payerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlanTranslation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MembershipPlanTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipLevel" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "familyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxDependents" INTEGER NOT NULL DEFAULT 0,
    "allowancePool" "MembershipAllowancePool" NOT NULL DEFAULT 'PER_PERSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipLevelTranslation" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MembershipLevelTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBenefit" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "serviceKind" "ServiceKind",
    "serviceId" TEXT,
    "benefitType" "MembershipBenefitType" NOT NULL,
    "allowanceCount" INTEGER,
    "percentOff" DOUBLE PRECISION,
    "fixedPriceCents" INTEGER,
    "fallbackType" "MembershipFallbackType" NOT NULL DEFAULT 'NONE',
    "fallbackPercent" DOUBLE PRECISION,
    "fallbackFixedCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipEnrollment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "userId" TEXT,
    "linkedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "memberType" "MembershipMemberType" NOT NULL DEFAULT 'PRIMARY',
    "primaryEnrollmentId" TEXT,
    "relationship" TEXT,
    "status" "MembershipEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "importBatchId" TEXT,
    "createdByAdminId" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipAllowanceBalance" (
    "id" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "holderEnrollmentId" TEXT NOT NULL,
    "allocated" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "termStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipAllowanceBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUsageLedger" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "MembershipLedgerReason" NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "appointmentId" TEXT,
    "actorAdminId" TEXT,
    "note" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipImportBatch" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedByAdminId" TEXT,
    "status" "MembershipImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "revivedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "previewData" JSONB NOT NULL,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipInviteLog" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sentByAdminId" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipInviteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipPlan_countryId_isActive_idx" ON "MembershipPlan"("countryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_countryId_slug_key" ON "MembershipPlan"("countryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_id_countryId_key" ON "MembershipPlan"("id", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlanTranslation_planId_locale_key" ON "MembershipPlanTranslation"("planId", "locale");

-- CreateIndex
CREATE INDEX "MembershipLevel_planId_isActive_idx" ON "MembershipLevel"("planId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLevel_planId_slug_key" ON "MembershipLevel"("planId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLevel_id_countryId_key" ON "MembershipLevel"("id", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLevelTranslation_levelId_locale_key" ON "MembershipLevelTranslation"("levelId", "locale");

-- CreateIndex
CREATE INDEX "MembershipBenefit_levelId_isActive_idx" ON "MembershipBenefit"("levelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipBenefit_levelId_serviceKind_key" ON "MembershipBenefit"("levelId", "serviceKind");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipBenefit_levelId_serviceId_key" ON "MembershipBenefit"("levelId", "serviceId");

-- CreateIndex
CREATE INDEX "MembershipEnrollment_email_idx" ON "MembershipEnrollment"("email");

-- CreateIndex
CREATE INDEX "MembershipEnrollment_userId_status_idx" ON "MembershipEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "MembershipEnrollment_planId_status_idx" ON "MembershipEnrollment"("planId", "status");

-- CreateIndex
CREATE INDEX "MembershipEnrollment_primaryEnrollmentId_idx" ON "MembershipEnrollment"("primaryEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipAllowanceBalance_benefitId_holderEnrollmentId_ter_key" ON "MembershipAllowanceBalance"("benefitId", "holderEnrollmentId", "termStart");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipUsageLedger_idempotencyKey_key" ON "MembershipUsageLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MembershipUsageLedger_balanceId_reason_idx" ON "MembershipUsageLedger"("balanceId", "reason");

-- CreateIndex
CREATE INDEX "MembershipUsageLedger_enrollmentId_idx" ON "MembershipUsageLedger"("enrollmentId");

-- CreateIndex
CREATE INDEX "MembershipUsageLedger_orderId_idx" ON "MembershipUsageLedger"("orderId");

-- CreateIndex
CREATE INDEX "MembershipImportBatch_planId_status_idx" ON "MembershipImportBatch"("planId", "status");

-- CreateIndex
CREATE INDEX "MembershipInviteLog_enrollmentId_idx" ON "MembershipInviteLog"("enrollmentId");

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlanTranslation" ADD CONSTRAINT "MembershipPlanTranslation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLevel" ADD CONSTRAINT "MembershipLevel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLevelTranslation" ADD CONSTRAINT "MembershipLevelTranslation_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MembershipLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefit" ADD CONSTRAINT "MembershipBenefit_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MembershipLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipBenefit" ADD CONSTRAINT "MembershipBenefit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment" ADD CONSTRAINT "MembershipEnrollment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment" ADD CONSTRAINT "MembershipEnrollment_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MembershipLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment" ADD CONSTRAINT "MembershipEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment" ADD CONSTRAINT "MembershipEnrollment_primaryEnrollmentId_fkey" FOREIGN KEY ("primaryEnrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment" ADD CONSTRAINT "MembershipEnrollment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "MembershipImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAllowanceBalance" ADD CONSTRAINT "MembershipAllowanceBalance_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "MembershipBenefit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAllowanceBalance" ADD CONSTRAINT "MembershipAllowanceBalance_holderEnrollmentId_fkey" FOREIGN KEY ("holderEnrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsageLedger" ADD CONSTRAINT "MembershipUsageLedger_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "MembershipAllowanceBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsageLedger" ADD CONSTRAINT "MembershipUsageLedger_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipImportBatch" ADD CONSTRAINT "MembershipImportBatch_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInviteLog" ADD CONSTRAINT "MembershipInviteLog_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Raw SQL Prisma cannot express (§3.8).
-- ---------------------------------------------------------------------------

-- Country pinning. A level belongs to its plan's country, a benefit's service
-- belongs to that same country, and an enrollment's level does too. Without
-- these a plan could hand out a benefit on another market's service.
-- Naming follows the existing PlanConsultationRule_plan_country_fkey precedent.

-- AddForeignKey
ALTER TABLE "MembershipLevel"
    ADD CONSTRAINT "MembershipLevel_plan_country_fkey"
    FOREIGN KEY ("planId", "countryId") REFERENCES "MembershipPlan"("id", "countryId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- `serviceId` is nullable and this is a MATCH SIMPLE composite FK, so the check
-- is skipped entirely for service-kind rows (serviceId IS NULL) and enforced
-- for every row that names a service. Exactly the behaviour wanted.
ALTER TABLE "MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_service_country_fkey"
    FOREIGN KEY ("serviceId", "countryId") REFERENCES "Service"("id", "countryId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEnrollment"
    ADD CONSTRAINT "MembershipEnrollment_level_country_fkey"
    FOREIGN KEY ("levelId", "countryId") REFERENCES "MembershipLevel"("id", "countryId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- §3.3 benefit invariants. Also validated at the API; kept here so a bad row
-- cannot reach the table through a script, a console session or a future
-- caller that forgets the service-layer check.

-- CreateCheckConstraint
-- Exactly one target: a service kind OR one specific service, never both,
-- never neither.
ALTER TABLE "MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_target_exactly_one"
    CHECK (("serviceKind" IS NOT NULL) <> ("serviceId" IS NOT NULL));

-- CreateCheckConstraint
-- Consultations only (§18) — the other ServiceKind values are out of scope.
ALTER TABLE "MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_kind_consultations_only"
    CHECK ("serviceKind" IS NULL OR "serviceKind" IN ('GENERAL', 'SPECIALIST'));

-- CreateCheckConstraint
-- Each benefit type carries its own value column, in range.
--
-- Written as a CASE with explicit IS NOT NULL tests, NOT as a chain of
-- `("benefitType" = 'X' AND "col" >= 1) OR …`. A CHECK only rejects a row when
-- the expression evaluates to FALSE — NULL passes. The OR-chain form evaluates
-- to NULL for an ALLOWANCE row whose allowanceCount is NULL (TRUE AND NULL =
-- NULL, and NULL OR FALSE = NULL), so exactly the row this is meant to stop
-- would be accepted. CASE picks one branch and each branch is NULL-safe.
ALTER TABLE "MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_value_matches_type"
    CHECK (
        CASE "benefitType"
            WHEN 'ALLOWANCE' THEN "allowanceCount" IS NOT NULL AND "allowanceCount" >= 1
            WHEN 'PERCENT'   THEN "percentOff" IS NOT NULL AND "percentOff" > 0 AND "percentOff" <= 100
            WHEN 'FIXED'     THEN "fixedPriceCents" IS NOT NULL AND "fixedPriceCents" >= 0
            WHEN 'EXCLUDED'  THEN true
            ELSE false
        END
    );

-- CreateCheckConstraint
-- A fallback only means something once an allowance runs out (§24), so it is
-- valid on ALLOWANCE rows only, and must carry the value its type needs.
-- Same NULL-safety reasoning as the constraint above.
ALTER TABLE "MembershipBenefit"
    ADD CONSTRAINT "MembershipBenefit_fallback_allowance_only"
    CHECK (
        CASE "fallbackType"
            WHEN 'NONE'    THEN true
            WHEN 'PERCENT' THEN "benefitType" = 'ALLOWANCE'
                                AND "fallbackPercent" IS NOT NULL
                                AND "fallbackPercent" > 0 AND "fallbackPercent" <= 100
            WHEN 'FIXED'   THEN "benefitType" = 'ALLOWANCE'
                                AND "fallbackFixedCents" IS NOT NULL
                                AND "fallbackFixedCents" >= 0
            ELSE false
        END
    );

-- CreateCheckConstraint
-- A dependent has a primary; a primary does not (§3.4).
ALTER TABLE "MembershipEnrollment"
    ADD CONSTRAINT "MembershipEnrollment_dependent_has_primary"
    CHECK (("memberType" = 'DEPENDENT') = ("primaryEnrollmentId" IS NOT NULL));

-- CreateCheckConstraint
-- §13.1 states endDate > startDate. Enforced here too so no import or script
-- can write a term that expired before it began.
ALTER TABLE "MembershipEnrollment"
    ADD CONSTRAINT "MembershipEnrollment_term_dates_ordered"
    CHECK ("endDate" IS NULL OR "endDate" > "startDate");

-- CreateIndex
-- Exactly one default level per plan (§3.2). Prisma cannot express a partial
-- unique index, so the `isDefault` rule lives only here.
CREATE UNIQUE INDEX "MembershipLevel_one_default_per_plan"
    ON "MembershipLevel"("planId")
    WHERE "isDefault";

-- CreateIndex
-- One enrollment per person per plan (§3.4) — case-insensitive, and scoped to
-- non-REMOVED rows so a soft-deleted enrollment does not block a re-add or a
-- re-import. This replaces the plain @@unique([planId, email]), which is
-- deliberately absent from schema.prisma.
CREATE UNIQUE INDEX "MembershipEnrollment_plan_email_active_key"
    ON "MembershipEnrollment"("planId", lower("email"))
    WHERE "status" <> 'REMOVED';

-- CreateIndex
-- Global uniqueness of the partner-supplied membership id (§5), compared the
-- same case-insensitive way every lookup does. A plain unique would let 'ABC1'
-- and 'abc1' coexist while the claim form treats them as one.
CREATE UNIQUE INDEX "MembershipEnrollment_membershipId_lower_key"
    ON "MembershipEnrollment"(lower("membershipId"));
