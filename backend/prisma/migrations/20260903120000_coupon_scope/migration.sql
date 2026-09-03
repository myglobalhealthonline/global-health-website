-- Coupon scoping: restrict a code to GP consultations, specialist
-- consultations, or either. Additive only; every existing coupon keeps the
-- pre-scoping behaviour via the ANY default.
--
-- Apply through `prisma migrate deploy`. Idempotent, like every migration here.

DO $$ BEGIN
  CREATE TYPE "CouponScope" AS ENUM (
    'ANY',
    'GENERAL_CONSULTATION',
    'SPECIALIST_CONSULTATION',
    'CONSULTATIONS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "scope" "CouponScope" NOT NULL DEFAULT 'ANY';
