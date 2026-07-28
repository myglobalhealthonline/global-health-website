-- Trustpilot review invites (Free plan, Automatic Feedback Service trigger).
--
-- Per-doctor switch between our internal 7-dimension review form (default,
-- unchanged) and a Trustpilot invite fired 24h after the consultation ends.
--
-- Written idempotently: this DB is live and drifted, so every statement is
-- IF NOT EXISTS / guarded and the migration is applied with `migrate deploy`.

-- Per-doctor destination switch. Default false => every existing doctor keeps
-- the internal form with no behaviour change.
ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "trustpilotInviteEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Channel enum. CREATE TYPE has no IF NOT EXISTS in PostgreSQL, so guard it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewInviteChannel') THEN
    CREATE TYPE "ReviewInviteChannel" AS ENUM ('INTERNAL', 'TRUSTPILOT');
  END IF;
END
$$;

-- Existing rows are all internal-form invites, hence the default.
ALTER TABLE "ReviewInvite"
  ADD COLUMN IF NOT EXISTS "channel" "ReviewInviteChannel" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS "scheduledFor"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatchedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatchError" TEXT;

-- Backs the cron scan: due TRUSTPILOT rows not yet handled.
CREATE INDEX IF NOT EXISTS "ReviewInvite_channel_dispatchedAt_scheduledFor_idx"
  ON "ReviewInvite" ("channel", "dispatchedAt", "scheduledFor");
