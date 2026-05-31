-- CreateTable
CREATE TABLE "MedicalNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "consultationType" TEXT,
    "createdByDoctorId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalNote_patientEmail_createdAt_idx" ON "MedicalNote"("patientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalNote_appointmentId_idx" ON "MedicalNote"("appointmentId");

-- AddForeignKey
ALTER TABLE "MedicalNote" ADD CONSTRAINT "MedicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
