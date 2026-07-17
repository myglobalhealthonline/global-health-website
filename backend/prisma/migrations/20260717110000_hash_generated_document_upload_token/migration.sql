-- SEC-006: stop storing the patient-upload capability token raw at rest on
-- GeneratedDocument. This column is only a denormalized "current upload link"
-- marker; the authoritative, already-hashed record lives in PatientUploadLink,
-- so in-flight patient links keep resolving regardless of what happens here.
--
-- In-flight rows: we forward-hash the existing plaintext in place (same as the
-- 20260710000000 share/review migration) using Postgres's built-in
-- sha256(bytea) so the value matches Node's
-- createHash("sha256").update(token).digest("hex"). NULL rows stay NULL. No
-- raw token is invalidated — the plaintext is only dropped from THIS cache
-- column; the resend flow now always mints a fresh token anyway.

ALTER TABLE "GeneratedDocument" ADD COLUMN "uploadTokenHash" TEXT;
UPDATE "GeneratedDocument"
  SET "uploadTokenHash" = encode(sha256(convert_to("uploadToken", 'UTF8')), 'hex')
  WHERE "uploadToken" IS NOT NULL;
ALTER TABLE "GeneratedDocument" DROP COLUMN "uploadToken";
