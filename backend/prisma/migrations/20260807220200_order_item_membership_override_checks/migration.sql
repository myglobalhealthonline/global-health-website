-- Private membership plans, phase 6 — the override's invariants, in the database.
--
-- Its own migration rather than an edit to 20260807220100: that one is already
-- recorded as applied (on dev, and on production from the 2026-08-07 accident
-- documented in §3.8), and Prisma checksums applied migration files — editing
-- one makes every later `migrate deploy` fail on a modified-migration error.
--
-- Prisma cannot model CHECK constraints, so `migrate diff` does not see these
-- and will never propose them; like phase 1's composite foreign keys (§3.8),
-- they live only here and must survive by hand through any future generated
-- migration. That is the trade for having the invariant hold against every
-- caller, including ones written years from now that never read §26.
--
-- The invariant: a line priced by the §26 goodwill override carries a written
-- reason, and that reason implies the other two columns. `membershipBenefitId`
-- must be present because the override applies a real benefit ROW's rule, never
-- a typed-in price — that is what makes an overridden price reproducible.
-- `membershipAllowanceUsed` must be false because goodwill is our cost, not the
-- partner's consumption: an override that could set it would let a grant we
-- gave away inflate the units a partner is reported to have used.
--
-- `membershipEnrollmentId` is deliberately NOT constrained. It is set whenever
-- the patient holds an enrollment at all — expired, suspended or
-- allowance-exhausted included, which are the common override cases — and is
-- null only for a genuine goodwill grant to someone with no membership. So the
-- reason column alone discriminates; the enrollment id carries attribution.

-- AddCheckConstraint
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_membership_override_needs_benefit"
  CHECK ("membershipOverrideReason" IS NULL OR "membershipBenefitId" IS NOT NULL);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_membership_override_spends_no_allowance"
  CHECK ("membershipOverrideReason" IS NULL OR "membershipAllowanceUsed" = false);
