-- CreateTable
CREATE TABLE "HealthTestFaqTranslation" (
    "id" TEXT NOT NULL,
    "healthTestFaqId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestFaqTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthTestFaqTranslation_healthTestFaqId_idx" ON "HealthTestFaqTranslation"("healthTestFaqId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTestFaqTranslation_healthTestFaqId_locale_key" ON "HealthTestFaqTranslation"("healthTestFaqId", "locale");

-- AddForeignKey
ALTER TABLE "HealthTestFaqTranslation" ADD CONSTRAINT "HealthTestFaqTranslation_healthTestFaqId_fkey" FOREIGN KEY ("healthTestFaqId") REFERENCES "HealthTestFaq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
