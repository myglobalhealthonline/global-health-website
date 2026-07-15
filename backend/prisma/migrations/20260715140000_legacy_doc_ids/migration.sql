-- Legacy import: idempotency key for re-routing migrated patient documents into
-- the doctor-visible tables (GeneratedDocument / AppointmentDocument). Additive +
-- nullable -> safe to re-run against the live Railway DB (`migrate deploy`).

ALTER TABLE "GeneratedDocument"   ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "AppointmentDocument" ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDocument_legacyMongoId_key"   ON "GeneratedDocument"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentDocument_legacyMongoId_key" ON "AppointmentDocument"("legacyMongoId");
