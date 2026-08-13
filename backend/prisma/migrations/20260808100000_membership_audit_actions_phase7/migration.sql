-- Private membership plans, phase 7 — AuditAction values.
--
-- Same split as the phase 1/2/3/6 audit migrations, for the same reason:
-- PostgreSQL will not let an enum value be added and then USED inside the
-- same transaction, and Prisma runs each migration file in one. These go
-- ahead of the phase 7 code that writes them (§3.8, §21.6).
--
-- Phase 7 covers multi-country plans, generated membership ids and issued
-- member cards.

-- AlterEnum
-- A country was added to a plan's coverage (§26). This is an admin-visible
-- COST event, not bookkeeping: adding a country grants benefits to every
-- existing member of the plan immediately, with no per-member action.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_PLAN_COUNTRY_ADDED';
-- …and removed. New bookings only — anything already booked keeps its price,
-- mirroring decision 17.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_PLAN_COUNTRY_REMOVED';
-- The card + welcome email went out for an enrollment (decision 41).
-- `MembershipEnrollment.cardIssuedAt` is what dedupes the send; this is the
-- trail of when it happened and to which address.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_CARD_ISSUED';
