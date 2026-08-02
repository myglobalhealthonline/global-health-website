-- The 20260726120000_doctor_cross_border_rx_country migration created this
-- table without FK constraints, even though schema.prisma's `doctor`/`country`
-- relations (with onDelete: Cascade) require them. `prisma migrate dev`
-- against a fresh database picks up the gap as drift. This migration adds
-- only the two missing FKs so the schema and migration history agree; no
-- other changes.
--
-- If either FK fails to apply because of orphaned doctorId/countryId values,
-- do NOT drop the offending rows silently — investigate how they were
-- orphaned (e.g. Doctor/Country purge without cascading cleanup) first.

DO $$ BEGIN
  ALTER TABLE "DoctorCrossBorderRxCountry"
    ADD CONSTRAINT "DoctorCrossBorderRxCountry_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DoctorCrossBorderRxCountry"
    ADD CONSTRAINT "DoctorCrossBorderRxCountry_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
