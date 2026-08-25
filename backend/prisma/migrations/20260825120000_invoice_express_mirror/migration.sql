-- Mirror the Portuguese InvoiceExpress document as an `invoices` row.
--
-- Portugal is the one market whose legal document this system does not draw:
-- the Fatura-Recibo is issued by InvoiceExpress. Until now that left PT orders
-- with no `invoices` row at all, so a PT patient saw nothing in the portal and
-- an admin had nothing to resend — the document existed only inside
-- InvoiceExpress and in whatever email it sent.
--
-- These columns let a row point at the InvoiceExpress document AND at our own
-- stored copy of its PDF. The copy is the point: a live link would go dark on
-- an InvoiceExpress outage or a lapsed account, and these are fiscal documents
-- we are required to be able to produce.
--
-- Every column is nullable, so existing non-PT rows are untouched and no
-- backfill is needed. `IF NOT EXISTS` throughout: idempotent, safe to re-run
-- against a database that already has them.
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "invoiceExpressId" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceExpressType" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceExpressPermalink" TEXT,
  ADD COLUMN IF NOT EXISTS "pdfStorageKey" TEXT;

-- One row per InvoiceExpress document. The mirror is best-effort and retried
-- (it must never block a paid order), so this constraint — not application
-- logic — is what guarantees a retry can only ever update, never duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceExpressId_key"
  ON "invoices" ("invoiceExpressId");
