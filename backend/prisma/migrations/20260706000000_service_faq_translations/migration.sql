-- CreateTable
CREATE TABLE "ServiceFaqTranslation" (
    "id" TEXT NOT NULL,
    "serviceFaqId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFaqTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceFaqTranslation_serviceFaqId_idx" ON "ServiceFaqTranslation"("serviceFaqId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFaqTranslation_serviceFaqId_locale_key" ON "ServiceFaqTranslation"("serviceFaqId", "locale");

-- AddForeignKey
ALTER TABLE "ServiceFaqTranslation" ADD CONSTRAINT "ServiceFaqTranslation_serviceFaqId_fkey" FOREIGN KEY ("serviceFaqId") REFERENCES "ServiceFaq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
