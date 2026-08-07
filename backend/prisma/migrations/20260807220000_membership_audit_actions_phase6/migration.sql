-- Private membership plans, phase 6 — AuditAction values.
--
-- Same split as the phase 1/2/3 audit migrations, for the same reason:
-- PostgreSQL will not let an enum value be added and then USED inside the
-- same transaction, and Prisma runs each migration file in one. These go
-- ahead of the phase 6 code that writes them (§3.8, §4.2).
--
-- Phase 6 covers admin manual booking + the goodwill override, usage
-- reporting, the allowance adjust deferred from phase 5, and the expiry cron.

-- AlterEnum
-- `POST /membership-enrollments/:id/allowance-adjust` (§7, SUPER_ADMIN, reason
-- mandatory). Deferred from phase 5, which shipped the ledger it writes to.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_ALLOWANCE_ADJUSTED';
-- The SUPER_ADMIN goodwill override on an admin manual booking (§26). Written
-- against the enrollment when the patient has one and against the level when
-- they do not — the whole point of the override is that they may hold neither.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_BENEFIT_OVERRIDDEN';
-- Report access (§32). Both the per-plan usage view and the per-member
-- drill-down write one: the drill-down lists a named member's bookings, which
-- is member PII even with no clinical content in it, so reading it is an event
-- worth being able to reconstruct afterwards.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_REPORT_VIEWED';
