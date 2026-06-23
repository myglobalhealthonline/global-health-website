-- Patient subscription/plan in-app notifications (§30).
-- Extend the (previously frozen) NotificationType enum with patient-facing
-- subscription values. ADD VALUE IF NOT EXISTS is idempotent and safe to
-- re-run; PostgreSQL 12+ permits ADD VALUE inside the migration transaction
-- (the new values are not USED in this same transaction).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_RENEWED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CANCELED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_RENEWAL_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_PERK_UNLOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WELLNESS_CREDITS_EARNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'KIT_REDEMPTION_CONFIRMED';
