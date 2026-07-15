-- Keep the unpaid INVOICE and its paid RECEIPT as two separate rows that share the
-- same number, so a manual/AI-booking invoice is preserved when the receipt is issued
-- (previously the single row was relabeled INVOICE -> RECEIPT, losing the invoice).

-- Drop the unique on invoiceNumber so an INVOICE and its RECEIPT can share one number.
DROP INDEX IF EXISTS "invoices_invoiceNumber_key";

-- Keep invoiceNumber lookups fast (admin search + filters reference it).
CREATE INDEX IF NOT EXISTS "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
