-- Private membership plans, phase 2 — AuditAction values.
--
-- Same split as 20260807120000_membership_audit_actions and for the same
-- reason: PostgreSQL will not let an enum value be added and then USED inside
-- the same transaction, and Prisma runs each migration file in one. These go
-- ahead of the phase 2 code that writes them (§3.8, §4.2).
--
-- Phase 2 covers the enrollment lifecycle, account linking and CSV import.
-- Allowance adjust and report access arrive with phases 5 and 6.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_REMOVED';
-- Written by the linker, which runs off a verification/login, not an admin
-- action: actorUserId is the member themselves.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_LINKED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ENROLLMENT_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_IMPORT_COMMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_IMPORT_CANCELLED';
