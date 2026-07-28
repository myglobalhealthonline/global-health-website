-- Address state / province / federative unit.
--
-- Brazil's booking form asks for the UF (Estado) next to the CEP; every other
-- market keeps the street/city/postal-code trio it already had. The column is
-- nullable with no default so existing rows and non-BR markets are untouched.
--
-- Written idempotently: this DB is live and drifted, so every statement is
-- IF NOT EXISTS / guarded and the migration is applied with `migrate deploy`.

-- Canonical "home" address on the patient record.
ALTER TABLE "PatientProfile"
  ADD COLUMN IF NOT EXISTS "addressState" TEXT;

-- Per-booking snapshot, so a later profile edit doesn't rewrite history.
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "addressState" TEXT;

-- Carried from add-to-cart through the payment webhook, which is what mints
-- the Appointment above.
ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "patientAddressState" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "patientAddressState" TEXT;
