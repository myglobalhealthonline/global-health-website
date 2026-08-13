-- Private membership plans, phase 6 — the goodwill override's audit column (§26).
--
-- Hand-written rather than generated. `prisma migrate diff` against this schema
-- proposes dropping phase 1's three composite foreign keys, because Prisma has
-- no way to express them and reads them as drift (§3.8); every generated
-- membership migration in this series has had those DROP CONSTRAINT lines cut
-- by hand, and this one avoids the question by not being generated at all.
--
-- One nullable column, no default: non-null IS the flag. A line priced by the
-- override carries `membershipBenefitId` (a real benefit row governed the
-- price) but NO `membershipEnrollmentId`, and never spends an allowance unit —
-- the patient holds no membership, so there is no counter it could come out of.
-- That is what lets §32's reports split goodwill from real usage with a
-- predicate instead of a join.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "membershipOverrideReason" TEXT;
