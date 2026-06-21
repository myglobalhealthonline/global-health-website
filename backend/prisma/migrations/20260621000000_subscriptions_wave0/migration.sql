-- ============================================================================
-- Subscriptions — Wave 0 schema
-- Plan: docs/plans/subscription-plan-implementation.md §20 (Wave 0 checklist)
-- Sprint: docs/plans/sprints/sprint-1-foundation-billing-backend.md Phase 0
--
-- Hand-authored (dev `migrate dev` is unusable in this repo — see
-- pending-migrations/README.md + the shadow-DB note). New-table DDL was
-- generated via `prisma migrate diff --from-empty --to-schema` and verified;
-- the PricingPlan rename + the raw composite-FK / partial-unique constraints
-- (which Prisma cannot express) are written by hand below.
-- ============================================================================

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY');
CREATE TYPE "VatMode" AS ENUM ('EXEMPT', 'STANDARD');
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');
CREATE TYPE "CreditKind" AS ENUM ('CONSULTATION', 'WELLNESS');
CREATE TYPE "PlanDiscountMode" AS ENUM ('NONE', 'PERCENT', 'FIXED');
CREATE TYPE "ConsultationLedgerReason" AS ENUM ('MONTHLY_GRANT', 'RESET_EXPIRE', 'RESERVED', 'CONSUMED', 'RELEASED', 'ADJUSTMENT', 'CLAWBACK');
CREATE TYPE "WellnessLedgerReason" AS ENUM ('MONTHLY_EARN', 'RESERVED', 'REDEEMED', 'RELEASED', 'ADJUSTMENT', 'CLAWBACK');
CREATE TYPE "PerkKey" AS ENUM ('SPECIALIST_DISCOUNT', 'FAMILY_USAGE', 'WELLNESS_REDEMPTION', 'TEST_KIT_REDEMPTION', 'HIGHER_DISCOUNT_TIER');
CREATE TYPE "PerkUnlockMode" AS ENUM ('MONTH_1', 'AFTER_PAID_MONTHS', 'MANUAL_APPROVAL', 'NOT_AVAILABLE');
CREATE TYPE "PerkGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'AUTO');
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'FULFILLED', 'CANCELED');

-- AlterEnum: AuditAction (§24 subscription actions)
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_CANCELED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBSCRIPTION_REFUNDED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_REORDERED';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_CONSULTATION_RULE_SET';
ALTER TYPE "AuditAction" ADD VALUE 'PERK_RULE_SET';
ALTER TYPE "AuditAction" ADD VALUE 'PERK_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'PERK_MANUALLY_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CONSULTATION_CREDIT_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'CONSULTATION_CREDIT_CONSUMED';
ALTER TYPE "AuditAction" ADD VALUE 'CONSULTATION_CREDIT_CLAWED_BACK';
ALTER TYPE "AuditAction" ADD VALUE 'WELLNESS_CREDIT_EARNED';
ALTER TYPE "AuditAction" ADD VALUE 'WELLNESS_CREDIT_REDEEMED';
ALTER TYPE "AuditAction" ADD VALUE 'WELLNESS_CREDIT_CLAWED_BACK';
ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_TEST_REDEEMED';

-- ----------------------------------------------------------------------------
-- AlterTable: PricingPlan — rename (preserve data) + extend (§20)
-- RENAME keeps existing rows' data; ADD/DROP for the type-changed column.
-- ----------------------------------------------------------------------------
ALTER TABLE "PricingPlan" RENAME COLUMN "priceCents" TO "monthlyPriceCents";
ALTER TABLE "PricingPlan" RENAME COLUMN "description" TO "longDescription";

-- interval (String) -> billingInterval (enum). Only "monthly" exists today;
-- the NOT NULL DEFAULT backfills every existing row to MONTHLY.
ALTER TABLE "PricingPlan" ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "PricingPlan" DROP COLUMN "interval";

ALTER TABLE "PricingPlan"
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "badgeLabel" TEXT,
  ADD COLUMN "notesTerms" TEXT,
  ADD COLUMN "monthlyConsultationCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wellnessCreditsPerMonth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "familyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "vatMode" "VatMode" NOT NULL DEFAULT 'EXEMPT',
  ADD COLUMN "vatRatePct" DOUBLE PRECISION,
  ADD COLUMN "stripeProductId" TEXT,
  ADD COLUMN "stripePriceId" TEXT;

-- Composite-unique FK targets (Prisma-managed; referenced by the raw
-- composite FKs on PlanConsultationRule below).
CREATE UNIQUE INDEX "PricingPlan_id_countryId_key" ON "PricingPlan"("id", "countryId");
CREATE UNIQUE INDEX "Service_id_countryId_key" ON "Service"("id", "countryId");

-- ----------------------------------------------------------------------------
-- CreateTable (verified from `prisma migrate diff --from-empty`)
-- ----------------------------------------------------------------------------
CREATE TABLE "PlanTranslation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "notesTerms" TEXT,
    CONSTRAINT "PlanTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanConsultationRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "isIncluded" BOOLEAN NOT NULL DEFAULT false,
    "usesCredits" BOOLEAN NOT NULL DEFAULT false,
    "creditsPerUse" INTEGER NOT NULL DEFAULT 1,
    "discountMode" "PlanDiscountMode" NOT NULL DEFAULT 'NONE',
    "discountPercent" DOUBLE PRECISION,
    "fixedPriceCents" INTEGER,
    "unlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 0,
    "familyUsable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanConsultationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanPerkRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "perkKey" "PerkKey" NOT NULL,
    "unlockMode" "PerkUnlockMode" NOT NULL DEFAULT 'MONTH_1',
    "unlockAfterPaidMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanPerkRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HealthTestKitRedemptionRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "requiredWellnessCredits" INTEGER NOT NULL,
    "unlockAfterPaidMonths" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HealthTestKitRedemptionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "planId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "paidMonthsCount" INTEGER NOT NULL DEFAULT 0,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlanId" TEXT,
    "pendingStripePriceId" TEXT,
    "pendingChangeEffectiveAt" TIMESTAMP(3),
    "stripeSubscriptionScheduleId" TEXT,
    "planSnapshot" JSONB,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionCreditBalance" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionCreditBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsultationCreditLedger" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaCredits" INTEGER NOT NULL,
    "reason" "ConsultationLedgerReason" NOT NULL,
    "balanceAfterHint" INTEGER,
    "reservationId" TEXT,
    "orderItemId" TEXT,
    "serviceId" TEXT,
    "appointmentId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "billingPeriodStart" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultationCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WellnessCreditLedger" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaCredits" INTEGER NOT NULL,
    "reason" "WellnessLedgerReason" NOT NULL,
    "balanceAfterHint" INTEGER,
    "reservationId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "healthTestId" TEXT,
    "redemptionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WellnessCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPerkGrant" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "perkKey" "PerkKey" NOT NULL,
    "status" "PerkGrantStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPerkGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HealthTestRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "orderId" TEXT,
    "wellnessCreditsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthTestRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "number" TEXT,
    "amountPaidCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "pdfUrl" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanStripePrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "PlanStripePrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "relationship" TEXT,
    "canUseCredits" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanTranslation_planId_locale_key" ON "PlanTranslation"("planId", "locale");
CREATE INDEX "PlanConsultationRule_countryId_idx" ON "PlanConsultationRule"("countryId");
CREATE UNIQUE INDEX "PlanConsultationRule_planId_serviceId_key" ON "PlanConsultationRule"("planId", "serviceId");
CREATE UNIQUE INDEX "PlanPerkRule_planId_perkKey_key" ON "PlanPerkRule"("planId", "perkKey");
CREATE UNIQUE INDEX "HealthTestKitRedemptionRule_planId_healthTestId_key" ON "HealthTestKitRedemptionRule"("planId", "healthTestId");
CREATE UNIQUE INDEX "UserSubscription_stripeSubscriptionId_key" ON "UserSubscription"("stripeSubscriptionId");
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");
CREATE UNIQUE INDEX "SubscriptionCreditBalance_userSubscriptionId_kind_key" ON "SubscriptionCreditBalance"("userSubscriptionId", "kind");
CREATE UNIQUE INDEX "ConsultationCreditLedger_idempotencyKey_key" ON "ConsultationCreditLedger"("idempotencyKey");
CREATE INDEX "ConsultationCreditLedger_userSubscriptionId_reason_idx" ON "ConsultationCreditLedger"("userSubscriptionId", "reason");
CREATE INDEX "ConsultationCreditLedger_reservationId_idx" ON "ConsultationCreditLedger"("reservationId");
CREATE UNIQUE INDEX "WellnessCreditLedger_idempotencyKey_key" ON "WellnessCreditLedger"("idempotencyKey");
CREATE INDEX "WellnessCreditLedger_userSubscriptionId_reason_idx" ON "WellnessCreditLedger"("userSubscriptionId", "reason");
CREATE INDEX "WellnessCreditLedger_reservationId_idx" ON "WellnessCreditLedger"("reservationId");
CREATE INDEX "SubscriptionPerkGrant_status_idx" ON "SubscriptionPerkGrant"("status");
CREATE UNIQUE INDEX "SubscriptionPerkGrant_userSubscriptionId_perkKey_key" ON "SubscriptionPerkGrant"("userSubscriptionId", "perkKey");
CREATE UNIQUE INDEX "HealthTestRedemption_orderId_key" ON "HealthTestRedemption"("orderId");
CREATE INDEX "HealthTestRedemption_userId_idx" ON "HealthTestRedemption"("userId");
CREATE INDEX "HealthTestRedemption_status_idx" ON "HealthTestRedemption"("status");
CREATE UNIQUE INDEX "SubscriptionInvoice_stripeInvoiceId_key" ON "SubscriptionInvoice"("stripeInvoiceId");
CREATE INDEX "SubscriptionInvoice_userSubscriptionId_idx" ON "SubscriptionInvoice"("userSubscriptionId");
CREATE UNIQUE INDEX "PlanStripePrice_stripePriceId_key" ON "PlanStripePrice"("stripePriceId");
CREATE INDEX "PlanStripePrice_planId_idx" ON "PlanStripePrice"("planId");
CREATE INDEX "FamilyMember_primaryUserId_idx" ON "FamilyMember"("primaryUserId");

-- AddForeignKey (Prisma-managed, single-field)
ALTER TABLE "PlanTranslation" ADD CONSTRAINT "PlanTranslation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanConsultationRule" ADD CONSTRAINT "PlanConsultationRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanConsultationRule" ADD CONSTRAINT "PlanConsultationRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanPerkRule" ADD CONSTRAINT "PlanPerkRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthTestKitRedemptionRule" ADD CONSTRAINT "HealthTestKitRedemptionRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthTestKitRedemptionRule" ADD CONSTRAINT "HealthTestKitRedemptionRule_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionCreditBalance" ADD CONSTRAINT "SubscriptionCreditBalance_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultationCreditLedger" ADD CONSTRAINT "ConsultationCreditLedger_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WellnessCreditLedger" ADD CONSTRAINT "WellnessCreditLedger_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPerkGrant" ADD CONSTRAINT "SubscriptionPerkGrant_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HealthTestRedemption" ADD CONSTRAINT "HealthTestRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanStripePrice" ADD CONSTRAINT "PlanStripePrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- RAW constraints Prisma cannot express (§36.10, §36.8, §36.3, §36.6).
-- These are NOT in schema.prisma — `prisma migrate dev` would report drift,
-- but this repo deploys via `migrate deploy` only. Keep names stable.
-- ----------------------------------------------------------------------------

-- Country-integrity composite FKs: prove plan.country == rule.country == service.country.
ALTER TABLE "PlanConsultationRule"
  ADD CONSTRAINT "PlanConsultationRule_service_country_fkey"
  FOREIGN KEY ("serviceId", "countryId") REFERENCES "Service"("id", "countryId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanConsultationRule"
  ADD CONSTRAINT "PlanConsultationRule_plan_country_fkey"
  FOREIGN KEY ("planId", "countryId") REFERENCES "PricingPlan"("id", "countryId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- One active subscription per user (§36.8).
CREATE UNIQUE INDEX "UserSubscription_userId_active_key"
  ON "UserSubscription"("userId")
  WHERE "status" IN ('ACTIVE', 'INCOMPLETE', 'PAST_DUE');

-- Reservation terminal uniqueness: a reservation commits OR releases at most
-- once, never both (§36.3 / §36.6).
CREATE UNIQUE INDEX "ConsultationCreditLedger_reservation_terminal_key"
  ON "ConsultationCreditLedger"("reservationId")
  WHERE "reason" IN ('CONSUMED', 'RELEASED');
CREATE UNIQUE INDEX "WellnessCreditLedger_reservation_terminal_key"
  ON "WellnessCreditLedger"("reservationId")
  WHERE "reason" IN ('REDEEMED', 'RELEASED');
