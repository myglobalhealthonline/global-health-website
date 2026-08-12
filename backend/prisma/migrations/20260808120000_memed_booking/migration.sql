-- Memed (doc.memed.com.br) integration — HEALTH_TEST kit auto-booking.
--
-- One row per paid Order carrying a HEALTH_TEST kit, tracking the
-- corresponding booking in Memed. No credentials exist yet (partner
-- onboarding in progress); this only adds the tracking table + notification
-- type so the fulfilment hook and admin alert have somewhere to write.
--
-- Hand-written and fully idempotent — this project applies migrations with
-- `prisma migrate deploy` against a live Railway database with pre-existing
-- drift; `migrate dev` is never run.

-- New notification type. `ADD VALUE IF NOT EXISTS` is safe inside the
-- transaction migrate deploy wraps this file in, because the value is only
-- declared here, not used.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HEALTH_TEST_BOOKED';

-- ─── MemedBooking ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MemedBooking" (
  "id"               TEXT NOT NULL,
  "orderId"          TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "memedReferenceId" TEXT,
  "responseSnapshot" JSONB,
  "error"            TEXT,
  "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"      TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemedBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemedBooking_orderId_key"
  ON "MemedBooking"("orderId");
CREATE INDEX IF NOT EXISTS "MemedBooking_status_createdAt_idx"
  ON "MemedBooking"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemedBooking_orderId_fkey') THEN
    ALTER TABLE "MemedBooking" ADD CONSTRAINT "MemedBooking_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
