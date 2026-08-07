-- Private membership plans, phase 3 — the claim confirmation token (§5.3).
--
-- The claim form is two-step: step 1 matches the enrollment and mails a
-- single-use link to the ENROLLED address; step 2 attaches the enrollment,
-- and only for the session that asked. Mechanics copy PasswordResetToken —
-- 32 random bytes, sha256 hash stored, raw token never persisted, single use,
-- 24h expiry — so a DB leak yields no usable link.
--
-- Generated with the §3.8 diff-and-review procedure against the dev database
-- (backend/.env.dev, hayabusa…:49401), then reduced BY HAND to the statements
-- belonging to this feature. The raw generator output additionally proposed:
--
--   * DROP of the three composite FKs phase 1 added in raw SQL
--     (MembershipBenefit_service_country_fkey,
--      MembershipEnrollment_level_country_fkey,
--      MembershipLevel_plan_country_fkey) — Prisma cannot express them, so
--     every future diff will keep proposing this. Never apply it;
--   * DROP/CREATE churn on the pg_trgm indexes and several
--     ON DELETE clauses that likewise live outside the datamodel;
--   * two RenameIndex statements for pre-existing identifier-length
--     truncations.
--
-- None of that belongs to this feature, so none of it is here. This reviewed
-- script is what gets committed and deployed — not a re-generated one.

-- CreateTable
CREATE TABLE "MembershipClaimToken" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipClaimToken_tokenHash_key" ON "MembershipClaimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MembershipClaimToken_enrollmentId_idx" ON "MembershipClaimToken"("enrollmentId");

-- CreateIndex
CREATE INDEX "MembershipClaimToken_userId_idx" ON "MembershipClaimToken"("userId");

-- AddForeignKey
ALTER TABLE "MembershipClaimToken" ADD CONSTRAINT "MembershipClaimToken_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "MembershipEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipClaimToken" ADD CONSTRAINT "MembershipClaimToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
