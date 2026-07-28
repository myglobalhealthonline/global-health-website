-- Audit action for "send a document to the patient" from the appointment
-- workspace.
--
-- Distinct from DOCUMENT_UPLOADED: that records PHI being stored, this records
-- PHI leaving the platform to an external mailbox, which is the event a data
-- subject access request or a breach review actually asks about.
--
-- Written idempotently: this DB is live and drifted, so the statement is
-- IF NOT EXISTS-guarded and the migration is applied with `migrate deploy`.
-- The new value is only added here, never read in this same transaction, so
-- it is safe inside the transaction Prisma wraps each migration in (PG 12+).

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_SENT_TO_PATIENT';
