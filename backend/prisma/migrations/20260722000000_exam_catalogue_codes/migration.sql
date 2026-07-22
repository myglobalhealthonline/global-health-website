-- Exam catalogue reference codes + supplier cross-reference.
--
-- Adds:
--   ExamType.code            → our Global Health reference ("GH1-0001").
--   TestCenterExam.supplierCode   → the center's own code (Synlab "Código").
--   TestCenterExam.turnaroundDays → result turnaround in business days.
--
-- Needed to bulk-load a supplier price list (Synlab PT, ~4.2k rows) and to
-- reconcile our orders against the supplier's own catalogue.
--
-- Idempotent: this DB carries drift, so the migration must be safe to
-- re-apply via `prisma migrate deploy`.

ALTER TABLE "ExamType"
  ADD COLUMN IF NOT EXISTS "code" TEXT;

-- One GH reference maps to at most one exam type. NULLs are unconstrained in
-- Postgres unique indexes, so pre-existing rows without a code stay valid.
CREATE UNIQUE INDEX IF NOT EXISTS "ExamType_code_key"
  ON "ExamType" ("code");

-- The admin catalogue is filtered by category and status now that it holds
-- thousands of rows.
CREATE INDEX IF NOT EXISTS "ExamType_category_idx"
  ON "ExamType" ("category");

CREATE INDEX IF NOT EXISTS "ExamType_isActive_idx"
  ON "ExamType" ("isActive");

ALTER TABLE "TestCenterExam"
  ADD COLUMN IF NOT EXISTS "supplierCode" TEXT,
  ADD COLUMN IF NOT EXISTS "turnaroundDays" INTEGER;

-- A supplier code is unique within one center (it is the center's own key).
-- Again NULL-tolerant, so centers that do not track codes are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterExam_testCenterId_supplierCode_key"
  ON "TestCenterExam" ("testCenterId", "supplierCode");
