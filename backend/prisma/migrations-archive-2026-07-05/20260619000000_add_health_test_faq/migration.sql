-- CreateTable
CREATE TABLE "HealthTestFaq" (
    "id" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthTestFaq_healthTestId_isVisible_sortOrder_idx" ON "HealthTestFaq"("healthTestId", "isVisible", "sortOrder");

-- AddForeignKey
ALTER TABLE "HealthTestFaq" ADD CONSTRAINT "HealthTestFaq_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
