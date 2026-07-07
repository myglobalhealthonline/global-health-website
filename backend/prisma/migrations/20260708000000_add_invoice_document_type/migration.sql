-- Invoice/receipt document type. Additive: a new enum plus a NOT NULL column
-- with a DEFAULT, so it is safe to apply to the existing "invoices" table with
-- data (the default backfills every existing row). Every existing invoice was
-- generated post-payment, so INVOICE_RECEIPT is the correct backfill value.
--
-- Guarded (DO block + IF NOT EXISTS) so `migrate deploy` is a no-op if the
-- change was already applied out-of-band on the shared DB — mirrors the
-- IF NOT EXISTS convention used by the other additive migrations here.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceDocumentType') THEN
    CREATE TYPE "InvoiceDocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'INVOICE_RECEIPT');
  END IF;
END$$;

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "documentType" "InvoiceDocumentType" NOT NULL DEFAULT 'INVOICE_RECEIPT';

CREATE INDEX IF NOT EXISTS "invoices_documentType_generatedAt_idx"
  ON "invoices" ("documentType", "generatedAt" DESC);
