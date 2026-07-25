-- Cross-jurisdiction prescription — SOAP disclosure consent gate (enum values).
--
-- Kept in its OWN migration (separate transaction) from the column/default
-- changes that USE these values: Postgres forbids using a newly-added enum
-- value in the same transaction that adds it. The next migration
-- (…_cross_border_rx_consent_fields) sets the column default to PENDING_CONSENT.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TYPE "CrossBorderRxStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONSENT';
ALTER TYPE "CrossBorderRxStatus" ADD VALUE IF NOT EXISTS 'CONSENT_DECLINED';
