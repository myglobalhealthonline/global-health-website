-- Website self-serve checkout gets its own pre-payment flow: 15-minute pay
-- window, one abandonment message, then cancel.
--
-- ADD VALUE only. Postgres forbids using a newly added enum value in the same
-- transaction that adds it, so this migration must not reference WEB_CHECKOUT
-- anywhere else. No backfill either: in-flight orders keep the flow they were
-- started on and finish on the old ladder.
ALTER TYPE "PrePaymentFlow" ADD VALUE IF NOT EXISTS 'WEB_CHECKOUT';
