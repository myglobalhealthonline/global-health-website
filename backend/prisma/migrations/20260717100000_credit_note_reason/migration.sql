-- A credit note is now issued for two reasons: a refund of a paid order, and the
-- cancellation of an unpaid manual/AI-booking INVOICE for non-payment. Persist the
-- reason so the PDF badge + patient email never say "refund processed" for an order
-- that was never paid.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreditNoteReason') THEN
    CREATE TYPE "CreditNoteReason" AS ENUM ('REFUND', 'CANCELLATION');
  END IF;
END
$$;

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "creditNoteReason" "CreditNoteReason";

-- Every credit note issued before this migration was a refund.
UPDATE "invoices"
SET "creditNoteReason" = 'REFUND'
WHERE "documentType" = 'CREDIT_NOTE' AND "creditNoteReason" IS NULL;
