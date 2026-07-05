-- Post-payment communication flow stage tracking on orders.
ALTER TABLE "Order" ADD COLUMN "postPaymentStage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "postPaymentFlowStartedAt" TIMESTAMP(3);

CREATE INDEX "Order_postPaymentStage_paymentStatus_idx" ON "Order"("postPaymentStage", "paymentStatus");
