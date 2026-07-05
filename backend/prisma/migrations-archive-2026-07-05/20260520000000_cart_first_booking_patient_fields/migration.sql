-- Cart-first booking: snapshot patient details on the cart/order line
-- so consultations carry full intake data from the slot picker page
-- through Stripe webhook into the Appointment row. Each ALTER is
-- `ADD COLUMN IF NOT EXISTS` because this database has prior
-- `prisma db push` drift; the `ensure-schema` hook already creates
-- some of these on boot, but real migrations make them part of the
-- formal migration history too.

-- User.dateOfBirth — canonical patient DOB. Lives on the account so
-- signed-in patients only enter it once. (Already created by the
-- ensure-schema hook on existing databases; this migration is the
-- belt to that braces.)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- CartItem patient fields — populated by the new consult-page form.
-- All nullable so product items (HEALTH_TEST, PRESCRIPTION_SERVICE)
-- never need to fill them. Consultation kinds (GENERAL_CONSULTATION,
-- SPECIALIST_CONSULTATION) require them at cart-add time (enforced
-- in cart.route.ts).
ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "patientFullName"          TEXT,
  ADD COLUMN IF NOT EXISTS "patientEmail"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientPhone"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientDateOfBirth"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "patientNotes"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientConsentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bookingForOther"          BOOLEAN NOT NULL DEFAULT FALSE;

-- OrderItem mirror — checkout copies CartItem patient* into OrderItem
-- so the payment webhook can mint the Appointment with the right
-- patient details without re-reading the (cleared) cart.
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "patientFullName"          TEXT,
  ADD COLUMN IF NOT EXISTS "patientEmail"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientPhone"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientDateOfBirth"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "patientNotes"             TEXT,
  ADD COLUMN IF NOT EXISTS "patientConsentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bookingForOther"          BOOLEAN NOT NULL DEFAULT FALSE;
