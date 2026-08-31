# Careers recruitment runbook

This runbook covers the country-scoped job publisher and confidential PDF-CV inbox. Applicant records and CVs are confidential personal data.

## Required production configuration

- Configure the existing private object store (`S3_*`). The `recruitment/` prefix must never be public.
- Run ClamAV on private networking and set `CLAMAV_HOST`, `CLAMAV_PORT`, and `CLAMAV_TIMEOUT_MS`. Never expose port 3310 publicly.
- Set `RECRUITMENT_NOTIFICATION_EMAIL` to the monitored careers inbox.
- Have privacy/legal publish localized recruitment-notice text for every live market covering controller, purpose/legal basis, recipients, six-month retention, rights, and contact. Set `RECRUITMENT_PRIVACY_NOTICE_VERSION` to that approved published version; the checkbox is acknowledgment, not consent.
- Keep `RECRUITMENT_RETENTION_MONTHS=6` and `RECRUITMENT_RETENTION_ENFORCE=false` until privacy/legal approves destructive enforcement.
- Configure the existing email provider. Notifications contain only job/market/time and an authenticated portal link; they never contain applicant contact data or a CV.

Local development can start the pinned scanner with `docker compose up -d clamav`. ClamAV may take roughly two minutes to load signatures and become healthy.

## Deploy

1. Back up PostgreSQL and confirm the target environment. `backend/.env` points at production; never use it for a development migration.
2. Apply `backend/prisma/migrations/20260831120000_careers_recruitment/migration.sql` through the normal deployment migration step.
3. Deploy backend before frontend so the public/admin clients do not call missing endpoints.
4. Open `/admin/careers`. The intake warning must be absent before publishing the first job.
5. Create a draft for one country and exact locale, preview it, then publish it.

## Smoke test

1. Confirm another country, locale, draft, archived, and expired job all return 404 publicly.
2. Submit a clean PDF no larger than 5 MiB and confirm a neutral success response.
3. Submit a renamed non-PDF and an EICAR test PDF in staging; both must be rejected and neither may create a row or object.
4. Stop or firewall ClamAV in staging; upload must return 503 and store nothing while job pages remain readable.
5. Confirm the application appears only for a global admin, the list omits contact fields, and the detail view is audited.
6. Download the CV and verify attachment, `private, no-store`, `nosniff`, and sandbox CSP headers.
7. Verify a `recruitment/cv/...` key is denied by the public media route.
8. Confirm the outbox sends one minimal notification and retries a temporary email failure without duplicating the application.

## Retention and deletion

The scheduler reports overdue applications while enforcement is off. Before enabling deletion:

1. Obtain written privacy/legal approval for every market and the six-month period.
2. Rehearse against staging copies and confirm object-first deletion, missing-object idempotency, audit creation, retry behavior, and the overdue alert.
3. Confirm backups and object-store lifecycle rules do not silently extend or shorten the approved period.
4. Set `RECRUITMENT_RETENTION_ENFORCE=true` and monitor the first sweep.

For an approved data-subject request or correction, use the portal purge action. It deletes the object first, then deletes the database row and writes a non-PII audit event in one transaction. If storage is unavailable, the row must remain for retry.

## Incident response

- Scanner unavailable or malformed response: keep intake fail-closed, restore ClamAV/signatures, and retest with clean and EICAR files.
- Object-store failure: do not purge database rows; restore storage access and retry.
- Outbox failure: fix email delivery and let the existing retry dispatcher continue. Do not email CVs manually.
- Suspected CV exposure: disable application intake, preserve audit logs, revoke affected storage credentials, and follow the privacy incident process.
- Rollback: roll back application/frontend routes first. Leave the additive tables in place if applications exist; do not drop applicant data during an emergency rollback.
