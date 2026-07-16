-- CreateTable
CREATE TABLE "DoctorCountryTranslation" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "division" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorCountryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorCountryTranslation_doctorCountryId_idx" ON "DoctorCountryTranslation"("doctorCountryId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorCountryTranslation_doctorCountryId_locale_key" ON "DoctorCountryTranslation"("doctorCountryId", "locale");

-- AddForeignKey
ALTER TABLE "DoctorCountryTranslation" ADD CONSTRAINT "DoctorCountryTranslation_doctorCountryId_fkey" FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
