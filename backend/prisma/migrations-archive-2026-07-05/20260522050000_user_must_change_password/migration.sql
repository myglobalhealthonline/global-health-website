-- Phase 1.6: flag accounts that need to rotate their password on next
-- successful login. Set TRUE when admin creates an account on the
-- patient's behalf with a generated temp password; cleared back to
-- FALSE the moment the user changes the password themselves.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE;
