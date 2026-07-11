-- Insurance card manual-verification flow.
-- Adds admin-notify recipients on the company + verification state on the order.
-- Idempotent DDL (live Railway DB — migrate deploy, never migrate dev).

-- InsuranceCompany: admin-notify recipients (email + WhatsApp E.164 lists).
ALTER TABLE "InsuranceCompany" ADD COLUMN IF NOT EXISTS "notifyEmails"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "InsuranceCompany" ADD COLUMN IF NOT EXISTS "notifyWhatsappNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Order: manual insurance-verification state + selected company mirror.
-- "VerificationStatus" enum already exists (patient insurance doc verification).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "insuranceVerificationStatus" "VerificationStatus";
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "insuranceCompanyId" TEXT;

CREATE INDEX IF NOT EXISTS "Order_insuranceVerificationStatus_idx"
  ON "Order"("insuranceVerificationStatus");
