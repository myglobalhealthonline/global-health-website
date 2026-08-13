-- Private membership plans, phase 1 — AuditAction values.
--
-- Split into its own migration on purpose: PostgreSQL will not let an enum
-- value be added and then USED inside the same transaction, and Prisma runs
-- each migration file in one transaction. Keeping the ADD VALUEs ahead of
-- everything that could reference them (here and in later phases) means a
-- future migration is free to insert/compare against them.
-- Precedent: 20260802040127_add_patient_tax_id_searched_audit_action.
--
-- Phase 1 covers plan/level/benefit configuration only. Enrollment lifecycle,
-- import commit, allowance adjust and report-access actions arrive with their
-- own phases.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_PLAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_PLAN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_PLAN_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_LEVEL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_LEVEL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_LEVEL_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_BENEFIT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_BENEFIT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_BENEFIT_DELETED';
