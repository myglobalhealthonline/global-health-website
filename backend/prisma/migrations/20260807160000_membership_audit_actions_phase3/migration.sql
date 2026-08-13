-- Private membership plans, phase 3 — AuditAction values.
--
-- Same split as 20260807120000_membership_audit_actions and
-- 20260807140000_membership_audit_actions_phase2, for the same reason:
-- PostgreSQL will not let an enum value be added and then USED inside the
-- same transaction, and Prisma runs each migration file in one. These go
-- ahead of the phase 3 code that writes them (§3.8, §4.2).
--
-- Phase 3 covers the member portal, the two-step email-confirmed claim, the
-- digital card, member-added dependents and the staff verify lookup.

-- AlterEnum
-- Written on EVERY claim attempt, hit or miss, against entityType
-- 'MembershipClaimAttempt' with the submitted membership id as the entity id
-- — a miss has no enrollment to point at, and the probed ids are what
-- enumeration detection needs (§5.3).
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_CLAIM_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_CLAIM_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_CLAIM_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_DEPENDENT_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_DEPENDENT_REMOVED';
-- The staff card lookup reads member PII, so it is audited like a report view.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_VERIFY_LOOKUP';
