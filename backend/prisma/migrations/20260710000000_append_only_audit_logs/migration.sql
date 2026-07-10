-- ============================================================================
-- S-008 hardening: append-only protection for AuditLog + MedicalAccessLog,
-- via a real Prisma migration instead of the manual-only script.
--
-- NOT YET APPLIED TO ANY DATABASE. Author-only, per this repo's convention
-- (see CLAUDE.md / prior migrations authored-not-applied, e.g. the
-- appointment composite indexes and peak-pricing migrations): this file
-- ships in the migrations folder so `prisma migrate deploy` picks it up
-- in order once a human runs the deploy step deliberately. It must be
-- verified against a real Postgres instance (staging first) before that
-- deploy — a BEFORE trigger on a hot table is not something to land blind.
--
-- ADAPTED FROM: backend/prisma/manual/immutable-logs.sql (the
-- prevent_audit_delete() trigger pattern already reviewed for
-- MedicalAccessLog/PatientConsent/SecurityAlert/PatientMergeLog). This
-- migration:
--   1. Re-creates the same DELETE-blocking trigger on MedicalAccessLog
--      (CREATE OR REPLACE + DROP TRIGGER IF EXISTS make this idempotent
--      whether or not the manual script was ever run by hand against this
--      database — safe either way).
--   2. Adds AuditLog, which the manual script never covered (S-008 finding).
--
-- WHY AuditLog GETS UPDATE-BLOCKING TOO (MedicalAccessLog does not):
-- `patient-merge.service.ts` UPDATEs MedicalAccessLog.patientProfileId when
-- two patient records are merged, so MedicalAccessLog must keep allowing
-- UPDATE (this mirrors the manual script's existing, deliberate choice —
-- see its header comment). AuditLog has no equivalent re-pointing need:
-- a repo-wide search (`auditLog.update` / `auditLog.updateMany`) found zero
-- production call sites — only test-cleanup `deleteMany` calls, which run
-- against the test DB, not this migration's target. So AuditLog can be
-- fully append-only (no UPDATE, no DELETE) without breaking any known path.
--
-- KNOWN FOLLOW-UP (do not let this block review, but don't forget it):
-- `admin-plans.route.test.ts` and `two-factor.service.test.ts` call
-- `prisma.auditLog.deleteMany(...)` for test cleanup. If this migration is
-- ever applied to the database those tests run against, that cleanup will
-- start failing with the trigger's exception unless the test setup wraps
-- it in `SET LOCAL app.allow_log_delete = 'on';`. Out of scope for this
-- hardening pass (tests are not run/fixed here per task instructions) —
-- flag before enabling this migration in any environment tests touch.
--
-- Apply manually once reviewed (same GUC opt-out as the manual script):
--   SET LOCAL app.allow_log_delete = 'on';   -- inside a reviewed transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_delete() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_log_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'Mutation of % is not permitted (append-only audit table). '
      'Set "SET LOCAL app.allow_log_delete = ''on'';" within a reviewed transaction to override.',
      TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- MedicalAccessLog: DELETE-blocked only (UPDATE stays allowed for
-- patient-merge re-pointing — see header). Idempotent re-apply of the
-- trigger already defined in prisma/manual/immutable-logs.sql.
DROP TRIGGER IF EXISTS no_delete_medical_access_log ON "MedicalAccessLog";
CREATE TRIGGER no_delete_medical_access_log
  BEFORE DELETE ON "MedicalAccessLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- AuditLog: fully append-only — no production code path UPDATEs or
-- DELETEs this table, so both are blocked (S-008: "does not cover
-- AuditLog").
DROP TRIGGER IF EXISTS no_delete_audit_log ON "AuditLog";
CREATE TRIGGER no_delete_audit_log
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- UPDATE needs its own function, not prevent_audit_delete():
--   1. A BEFORE UPDATE trigger must RETURN NEW — returning OLD would make
--      any GUC-permitted update silently write the old row back (no-op).
--   2. AuditLog.actorUserId has ON DELETE SET NULL (schema.prisma): every
--      User deletion (GDPR purge, admin user removal, test cleanup) fires
--      an UPDATE that nulls actorUserId on that user's audit rows. That
--      exact shape — actorUserId -> NULL, every other column unchanged —
--      must stay allowed or user deletion breaks the moment this migration
--      applies. Everything else stays blocked without the GUC.
CREATE OR REPLACE FUNCTION prevent_audit_update() RETURNS trigger AS $$
BEGIN
  IF NEW."actorUserId" IS NULL
     AND (to_jsonb(NEW) - 'actorUserId') = (to_jsonb(OLD) - 'actorUserId') THEN
    RETURN NEW;  -- FK ON DELETE SET NULL from a User deletion
  END IF;
  IF current_setting('app.allow_log_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'Mutation of % is not permitted (append-only audit table). '
      'Set "SET LOCAL app.allow_log_delete = ''on'';" within a reviewed transaction to override.',
      TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_audit_log ON "AuditLog";
CREATE TRIGGER no_update_audit_log
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();
