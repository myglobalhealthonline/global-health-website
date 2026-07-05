-- CreateEnum
CREATE TYPE "PrePaymentFlow" AS ENUM ('WITHIN_48H', 'OUTSIDE_48H');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentDueAt" TIMESTAMP(3),
ADD COLUMN "prePaymentFlow" "PrePaymentFlow",
ADD COLUMN "prePaymentReminderStage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "prePaymentFlowStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "automationKey" TEXT NOT NULL,
    "orderId" TEXT,
    "appointmentId" TEXT,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "recipient" TEXT,
    "summary" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRun_createdAt_idx" ON "AutomationRun"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationRun_automationKey_createdAt_idx" ON "AutomationRun"("automationKey", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationRun_orderId_createdAt_idx" ON "AutomationRun"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_paymentDueAt_prePaymentFlow_prePaymentReminderStag_idx" ON "Order"("paymentDueAt", "prePaymentFlow", "prePaymentReminderStage");

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
