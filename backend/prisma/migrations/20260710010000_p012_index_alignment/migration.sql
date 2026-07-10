-- P-012 (perf audit): query/index alignment for reminder routes, admin
-- patient search, blog listing, and the post-payment stage scan.
-- Authored, NOT applied here — verified against production EXPLAIN
-- (ANALYZE, BUFFERS) output first (all four query shapes currently Seq Scan
-- on ~40-85 row tables; too small for the planner to prefer an index scan
-- today, but this is provisioning ahead of the growth the audit warns about).
--
-- IMPORTANT — this migration is NOT safe to run through `prisma migrate
-- deploy` as-is. Every CREATE INDEX below uses CONCURRENTLY (so the index
-- build doesn't take a table lock against live traffic), and
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- `prisma migrate deploy` wraps each migration.sql in one transaction, which
-- will fail with "CREATE INDEX CONCURRENTLY cannot run inside a transaction
-- block." Apply this file manually, outside a transaction, e.g.:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migration.sql
-- (psql runs each top-level statement with its own implicit autocommit,
-- which is what CONCURRENTLY needs.) Do NOT wrap this file in BEGIN/COMMIT,
-- and do NOT run it via `prisma migrate deploy`.

-- ── Reminders (src/routes/reminders.route.ts) ───────────────────────────────
-- Both reminder scans filter to a small, shrinking subset of Appointment rows
-- (reminderSentAt / doctorReminderSentAt IS NULL, non-terminal status) inside
-- a scheduledAt window. Partial indexes keep the index proportional to
-- "not yet reminded" rows (not total appointment history ever) and let
-- Postgres range-scan scheduledAt directly instead of a Seq Scan once the
-- table outgrows the planner's seq-scan-is-cheaper threshold.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Appointment_reminder_pending_idx"
  ON "Appointment" ("scheduledAt")
  WHERE "reminderSentAt" IS NULL
    AND "status" NOT IN ('CANCELLED', 'COMPLETED');

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Appointment_doctor_reminder_pending_idx"
  ON "Appointment" ("scheduledAt")
  WHERE "doctorReminderSentAt" IS NULL
    AND "doctorId" IS NOT NULL
    AND "status" NOT IN ('CANCELLED', 'COMPLETED');

-- ── Admin patient / appointment substring search ────────────────────────────
-- Only for fields that are PLAINTEXT today AND stay plaintext regardless of
-- PHI encryption state — i.e. NOT in PHI_ENCRYPTED_FIELDS
-- (src/lib/crypto/phi-crypto.ts: nationalIdNumber, taxIdNumber,
-- passportNumber). `ILIKE '%x%'` can never use a plain btree index; pg_trgm's
-- GIN trigram index is what turns it into a bitmap index scan instead of a
-- full table scan.
--
-- Deliberately EXCLUDED: taxIdNumber, nationalIdNumber, passportNumber (see
-- admin-patient-profile.route.ts ~L346-356, which already comments on this).
-- PHI_ENCRYPTION_KEY is currently UNSET in this environment (encryption
-- dormant), so those three columns hold plaintext right now and a trigram
-- index would technically match today. But the moment PHI_ENCRYPTION_KEY is
-- set — the intended end state — the column becomes `phi:v1:<AES-GCM
-- ciphertext>` and substring matching goes from "works" to "silently matches
-- nothing" (AES-GCM ciphertext has no substring-preserving property), while
-- the index keeps costing write overhead for zero benefit. Indexing them now
-- would be dead weight the day encryption ships and would mask the real gap.
-- See the P-012 report for the actual fix these three fields need.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PatientProfile_email_trgm_idx"
  ON "PatientProfile" USING GIN ("email" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PatientProfile_fullName_trgm_idx"
  ON "PatientProfile" USING GIN ("fullName" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PatientProfile_phone_trgm_idx"
  ON "PatientProfile" USING GIN ("phone" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PatientProfile_globalHealthNumber_trgm_idx"
  ON "PatientProfile" USING GIN ("globalHealthNumber" gin_trgm_ops);

-- admin-patient-profile.route.ts ~L414 also does a plain Appointment.email
-- ILIKE scan (quick patient search) — same fix, same reasoning.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Appointment_email_trgm_idx"
  ON "Appointment" USING GIN ("email" gin_trgm_ops);

-- ── Blog list (src/modules/blog/blog.service.ts) ────────────────────────────
-- Admin table (getAdminBlogPosts): optional status filter, always orders by
-- updatedAt desc. Existing @@index([countryId, status, locale]) doesn't cover
-- this access pattern (no updatedAt, countryId not always filtered).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BlogPost_status_updatedAt_idx"
  ON "BlogPost" ("status", "updatedAt" DESC);

-- Public list (getPublicBlogPosts / getPublicBlogPostBySlug): status+isActive
-- equality, optional locale filter, orders by publishedAt desc then
-- createdAt desc.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BlogPost_status_isActive_publishedAt_idx"
  ON "BlogPost" ("status", "isActive", "publishedAt" DESC);

-- ── Post-payment flow (src/modules/automation/post-payment-flow.service.ts,
--    runPostPaymentReminderCron) ───────────────────────────────────────────
-- Existing @@index([postPaymentStage, paymentStatus]) leads with the RANGE
-- column (postPaymentStage: gte/lt) and trails with the EQUALITY column
-- (paymentStatus = 'PAID') — backwards for this query. Once a btree index's
-- leading column is used as a range, Postgres can no longer push a later
-- column's equality condition down as a true Index Cond — it's evaluated as
-- a Filter after the heap fetch, so every row in the postPaymentStage range
-- pays a heap visit regardless of paymentStatus. Reversing the column order
-- lets paymentStatus serve as the equality prefix and postPaymentStage as an
-- Index Cond range scoped within it. Additive — the existing index is left
-- in place since other call sites filter postPaymentStage as the leading
-- equality condition (e.g. the atomic stage-claim updateMany calls).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_paymentStatus_postPaymentStage_idx"
  ON "Order" ("paymentStatus", "postPaymentStage");
