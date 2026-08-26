-- Two-way doctor support chat: throttle stamp for the admin → doctor
-- email + WhatsApp fan-out.
--
-- Hand-written and idempotent — this project applies migrations with
-- `prisma migrate deploy` against a live Railway database that carries
-- pre-existing drift; `migrate dev` is never run.
--
-- Mirrors "SupportThread"."lastAdminEmailAt" (doctor → admin direction). The
-- name is deliberately not `...EmailAt`: this window covers BOTH channels, so
-- one admin message produces at most one email and one WhatsApp per window.

ALTER TABLE "SupportThread"
  ADD COLUMN IF NOT EXISTS "lastDoctorAlertAt" TIMESTAMP(3);
