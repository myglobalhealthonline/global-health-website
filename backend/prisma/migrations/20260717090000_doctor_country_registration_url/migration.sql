-- Per-country verify-registration link. The legacy doctor-level
-- Doctor.medicalRegistrationUrl stays as a fallback for doctors without a
-- per-country value.
ALTER TABLE "DoctorCountry" ADD COLUMN "registrationUrl" TEXT;
