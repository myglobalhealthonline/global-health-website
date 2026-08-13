-- Bring `MemedBooking` into schema history WITHOUT touching production's copy.
--
-- Production already has this table, created 2026-08-07 by migration
-- `20260808120000_memed_booking`, which exists in no git ref and cannot be
-- reconstructed: Prisma checksums applied migrations, so hand-written SQL that
-- produces an identical schema still fails every later `migrate deploy` on a
-- checksum mismatch. See docs/guides/orphan-migration-memed-booking.md.
--
-- So this migration is deliberately a no-op there and real everywhere else
-- (dev, test, any fresh database). Every statement is idempotent, and none of
-- them is DDL that would rewrite an existing table. `prisma migrate diff` then
-- stops emitting `DROP TABLE "MemedBooking"` — a line that reads as legitimate
-- cleanup to anyone who does not recognise the name, and which would be the
-- one way this becomes data loss rather than untidiness.
--
-- Prisma does not wrap a migration file in a transaction, so nothing here may
-- depend on an earlier statement having rolled back.

CREATE TABLE IF NOT EXISTS "MemedBooking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "memedReferenceId" TEXT,
    "responseSnapshot" JSONB,
    "error" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemedBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemedBooking_orderId_key" ON "MemedBooking"("orderId");

CREATE INDEX IF NOT EXISTS "MemedBooking_status_createdAt_idx" ON "MemedBooking"("status", "createdAt");

-- `ADD CONSTRAINT` has no IF NOT EXISTS, hence the guard.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MemedBooking_orderId_fkey'
    ) THEN
        ALTER TABLE "MemedBooking"
            ADD CONSTRAINT "MemedBooking_orderId_fkey"
            FOREIGN KEY ("orderId") REFERENCES "Order"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
