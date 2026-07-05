-- SF6 (code review 2026-07-05): Payment.appointment was ON DELETE CASCADE —
-- the only Appointment relation with that behaviour (every other relation is
-- SetNull). A Payment row is a financial/audit record and must survive
-- deletion of the Appointment it's attached to.
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_appointmentId_fkey";

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
