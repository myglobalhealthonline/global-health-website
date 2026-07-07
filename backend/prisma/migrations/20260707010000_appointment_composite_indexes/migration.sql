-- CreateIndex
CREATE INDEX "Appointment_doctorId_scheduledAt_idx" ON "Appointment"("doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_countryCode_status_createdAt_idx" ON "Appointment"("countryCode", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_paymentStatus_createdAt_idx" ON "Appointment"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_userId_status_createdAt_idx" ON "Appointment"("userId", "status", "createdAt");
