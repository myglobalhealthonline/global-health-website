-- Private membership plans, phase 7 polish — one more AuditAction value.
--
-- Its own migration, ahead of the code that writes it, for the same reason as
-- the phase 1/2/3/6/7 audit migrations: PostgreSQL will not let an enum value
-- be added and then USED inside the same transaction, and Prisma runs each
-- migration file in one.

-- AlterEnum
-- An eligible member checked out with benefitSource = NONE.
--
-- Diagnostic only — nothing branches on it and no price changes. Today nothing
-- records whether a member deliberately declined their benefit or the client
-- sent NONE on its own, which makes "I should have got my discount" an
-- unanswerable support question: the order simply looks like a full-price
-- booking by someone who happens to hold a membership.
ALTER TYPE "AuditAction" ADD VALUE 'MEMBERSHIP_BENEFIT_DECLINED';
