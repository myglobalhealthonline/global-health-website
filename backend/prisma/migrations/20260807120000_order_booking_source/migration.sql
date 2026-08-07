-- Order.bookingSource — provenance icon in the admin orders table / dashboard
-- feed (WEBSITE self-service checkout, MANUAL admin console, AI_CALL partner
-- API / AI phone agent).
--
-- Hand-written and fully idempotent on purpose. This project applies
-- migrations with `prisma migrate deploy` against a live Railway database
-- that carries pre-existing drift; `migrate dev` is never run, so every
-- statement here must be safe to re-apply and must not depend on a shadow
-- database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingSource') THEN
    CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'MANUAL', 'AI_CALL');
  END IF;
END
$$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "bookingSource" "BookingSource" NOT NULL DEFAULT 'WEBSITE';
