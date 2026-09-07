-- Guest-account claim: a /register attempt against an email that already
-- has a never-verified User row (guest booking shadow account, or an
-- unfinished self-signup) parks the chosen password hash on the
-- verification token. consumeEmailVerificationToken applies it once the
-- mailbox is proven. Hand-written (prisma migrate dev is broken in this
-- repo -- see the migration-shadow-db note); idempotent.
ALTER TABLE "EmailVerificationToken" ADD COLUMN IF NOT EXISTS "pendingPasswordHash" TEXT;
