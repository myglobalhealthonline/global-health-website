-- Doctor CPF + date of birth — required by Memed's real prescriber-
-- registration API (cpf, data_nascimento), discovered once real production
-- credentials + docs were available. See modules/memed/prescription-widget.service.ts
-- ensurePrescriber.
--
-- Hand-written and fully idempotent — this project applies migrations with
-- `prisma migrate deploy` against a live Railway database; `migrate dev` is
-- never run.

-- ─── Doctor ──────────────────────────────────────────────────────────────────
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- ─── DoctorCountry ───────────────────────────────────────────────────────────
-- cpfEncrypted mirrors DoctorBankAccount.ibanEncrypted (phi:v1: envelope via
-- encryptPhi); cpfLast4 mirrors ibanLast4 (masked display, no decrypt).
ALTER TABLE "DoctorCountry" ADD COLUMN IF NOT EXISTS "cpfEncrypted" TEXT;
ALTER TABLE "DoctorCountry" ADD COLUMN IF NOT EXISTS "cpfLast4" TEXT;
