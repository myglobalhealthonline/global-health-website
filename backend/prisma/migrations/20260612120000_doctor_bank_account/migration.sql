-- CreateTable
CREATE TABLE "DoctorBankAccount" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "accountHolder" TEXT,
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "bic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorBankAccount_doctorId_key" ON "DoctorBankAccount"("doctorId");

-- AddForeignKey
ALTER TABLE "DoctorBankAccount" ADD CONSTRAINT "DoctorBankAccount_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
