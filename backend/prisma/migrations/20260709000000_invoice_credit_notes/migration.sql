-- Credit notes: new document type + allow a second (credit-note) row per order.

-- AlterEnum
ALTER TYPE "InvoiceDocumentType" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE';

-- Drop the one-invoice-per-order unique so a CREDIT_NOTE can be a second row.
DROP INDEX IF EXISTS "invoices_orderId_key";

-- Keep orderId lookups fast.
CREATE INDEX IF NOT EXISTS "invoices_orderId_idx" ON "invoices"("orderId");
