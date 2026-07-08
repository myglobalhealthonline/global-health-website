-- AlterTable: InvoiceExpress InvoiceReceipt id for paid Portugal orders (idempotency guard)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceExpressId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceExpressId_key" ON "Order"("invoiceExpressId");
