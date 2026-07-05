-- Add an optional relationship-type label to Partner ("Healthcare Partner",
-- "Diagnostic Partner", "Client", …). Additive + nullable — no backfill needed.
ALTER TABLE "Partner" ADD COLUMN "type" TEXT;
