-- Passport number, collected as the alternative to patientHealthIdNumber /
-- patientNationalIdNumber (CPF/PPS/NIF) for target countries that require
-- one of the two (Brazil).
ALTER TABLE "CrossBorderPrescriptionRequest" ADD COLUMN IF NOT EXISTS "patientPassportNumber" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "patientPassportNumber" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "patientPassportNumber" TEXT;
