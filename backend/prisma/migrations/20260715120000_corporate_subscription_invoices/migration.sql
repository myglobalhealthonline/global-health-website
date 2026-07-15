-- Corporate subscription invoices: a corporate company's offline annual
-- billing is now recorded as synthetic Orders (one per admin-generated fiscal
-- document) so the existing invoice pipeline (numbering, PDF, print page,
-- download, resend) is reused unchanged. "Order"."corporateCompanyId" flags
-- those synthetic orders and links them back to the company.
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "corporateCompanyId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_corporateCompanyId_idx" ON "Order"("corporateCompanyId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE "Order"
    ADD CONSTRAINT "Order_corporateCompanyId_fkey"
    FOREIGN KEY ("corporateCompanyId") REFERENCES "CorporateCompany"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
