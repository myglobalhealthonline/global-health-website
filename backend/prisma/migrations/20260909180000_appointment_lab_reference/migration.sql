-- Lab reference + manual-confirmation stamp on a test-centre booking.
--
-- A test-centre booking is replicated by hand into the laboratory's own system
-- (Synlab WebLIMS and the like). Whatever reference that system gives back had
-- nowhere to live: `Order.trackingNumber` is a courier shipment for a posted
-- kit, and reusing it would put a "track your parcel" concept on an appointment
-- that ships nothing.
--
-- Both nullable. Plenty of providers hand back no code at all, and the
-- patient's confirmation goes out either way — with the reference when there is
-- one, without it when there isn't.
--
-- `labConfirmationSentAt` records the last ADMIN-triggered send only. The
-- automatic post-payment confirmation is a separate thing and still fires on
-- payment, so a null here never means "the patient was told nothing".
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "labReference" TEXT,
  ADD COLUMN IF NOT EXISTS "labConfirmationSentAt" TIMESTAMP(3);
