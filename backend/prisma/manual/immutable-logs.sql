-- ============================================================================
-- Immutable audit-log protection — Phase 2 plan, improvement #4
-- ("Logs cannot be edited by normal users / should not be casually deleted")
-- ============================================================================
--
-- WHY THIS IS NOT A PRISMA MIGRATION
-- A DELETE-blocking trigger can break existing cascade-delete / admin "purge"
-- flows (PatientConsent and MedicalAccessLog are `onDelete: Cascade` from
-- PatientProfile). Auto-applying it via `migrate deploy` could therefore make
-- a previously-working patient/user purge fail in production. So it lives here
-- and must be applied DELIBERATELY after you have:
--   1. Confirmed the platform anonymizes patients instead of hard-deleting them
--      (see anonymizePatient in country-data-policy.service.ts), AND
--   2. Audited every hard-delete / purge path that could cascade into these
--      tables, updating each to opt in via the GUC below if a real delete is
--      intended.
--
-- Apply manually once reviewed:
--   psql "$DATABASE_URL" -f prisma/manual/immutable-logs.sql
--
-- WHAT IT DOES
-- Blocks DELETE on the append-only audit tables unless the current transaction
-- explicitly opts in with:
--   SET LOCAL app.allow_log_delete = 'on';
-- UPDATE is intentionally left allowed: patient-merge re-points
-- `patientProfileId` on these tables via UPDATE. If you also want
-- UPDATE-immutability, extend prevent_audit_mutation() to fire on UPDATE and
-- have the merge transaction set the GUC.
--
-- DB-role note: a BEFORE trigger applies to ALL roles including the table
-- owner, so this is stronger than `REVOKE DELETE` (which the owner bypasses).
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_delete() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_log_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'Deletion of % is not permitted (append-only audit table). '
      'Set "SET LOCAL app.allow_log_delete = ''on'';" within a reviewed transaction to override.',
      TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_delete_medical_access_log ON "MedicalAccessLog";
CREATE TRIGGER no_delete_medical_access_log
  BEFORE DELETE ON "MedicalAccessLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

DROP TRIGGER IF EXISTS no_delete_patient_consent ON "PatientConsent";
CREATE TRIGGER no_delete_patient_consent
  BEFORE DELETE ON "PatientConsent"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- Optional: extend the same protection to the security alert / merge logs.
-- SecurityAlert has a status workflow (gets UPDATEd) but should not be deleted.
DROP TRIGGER IF EXISTS no_delete_security_alert ON "SecurityAlert";
CREATE TRIGGER no_delete_security_alert
  BEFORE DELETE ON "SecurityAlert"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

DROP TRIGGER IF EXISTS no_delete_patient_merge_log ON "PatientMergeLog";
CREATE TRIGGER no_delete_patient_merge_log
  BEFORE DELETE ON "PatientMergeLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();
