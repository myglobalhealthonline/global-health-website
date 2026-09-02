-- Coupons: percentage discount codes (personal + general).
-- Additive only. Apply through `prisma migrate deploy`; never `migrate dev` and
-- never against backend/.env from development — it points at production.
--
-- Every statement is idempotent because the live database carries drift: this
-- file has to be safe to re-run against a database that already has some of it.

DO $$ BEGIN
  CREATE TYPE "CouponKind" AS ENUM ('PERSONAL', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_EMAILS_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_REDEEMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUPON_REDEMPTION_RELEASED';

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "personalEmail" TEXT,
    "personalName" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxRedemptions" INTEGER NOT NULL,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "internalNote" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "discountPercent" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponRecipient" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "locale" "LocaleCode",
    "patientProfileId" TEXT,
    "status" "CouponRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_active_validUntil_idx" ON "Coupon"("active", "validUntil");
CREATE INDEX IF NOT EXISTS "Coupon_kind_idx" ON "Coupon"("kind");
CREATE INDEX IF NOT EXISTS "Coupon_personalEmail_idx" ON "Coupon"("personalEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_status_idx" ON "CouponRedemption"("couponId", "status");
CREATE INDEX IF NOT EXISTS "CouponRedemption_email_idx" ON "CouponRedemption"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRecipient_couponId_email_key" ON "CouponRecipient"("couponId", "email");
CREATE INDEX IF NOT EXISTS "CouponRecipient_couponId_status_idx" ON "CouponRecipient"("couponId", "status");

ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "couponId" TEXT;
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "couponDiscountPercent" INTEGER;
ALTER TABLE "Order"     ADD COLUMN IF NOT EXISTS "couponDiscountCents" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "couponDiscountCents" INTEGER;

CREATE INDEX IF NOT EXISTS "Order_couponId_idx" ON "Order"("couponId");

DO $$ BEGIN
  ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponRecipient" ADD CONSTRAINT "CouponRecipient_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Money-safety CHECKs. Prisma cannot model these, so they are invisible to
-- `migrate diff` — do not drop them when regenerating migrations.
--
--  * code_upper: a lower-cased row would be permanently unredeemable, because
--    every lookup uppercases the input first.
--  * percent:    a 0% or 101% coupon is a bug, not a promotion.
--  * cap:        the DATABASE refuses an over-redemption even if the
--    application logic were wrong. Consequence: lowering `maxRedemptions`
--    below `redeemedCount` must be rejected in the route with a clear 422,
--    or Postgres raises this constraint instead.
DO $$ BEGIN
  ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_code_upper_chk" CHECK ("code" = upper("code"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_percent_chk" CHECK ("discountPercent" BETWEEN 1 AND 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_cap_chk"
    CHECK ("redeemedCount" >= 0 AND "redeemedCount" <= "maxRedemptions");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
