-- CreateIndex
CREATE INDEX IF NOT EXISTS "Doctor_slug_idx" ON "Doctor"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_email_idx" ON "Appointment"("doctorId", "email");
