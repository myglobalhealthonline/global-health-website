-- Read-only pre-migration inventory. Counts only; no patient contacts or tokens.
-- Run against an explicitly selected database before enabling the campaign.
BEGIN READ ONLY;

SELECT "channel", COUNT(*) AS invitations,
       COUNT(*) FILTER (WHERE "submittedAt" IS NOT NULL) AS private_surveys,
       COUNT(*) FILTER (WHERE "channel" = 'TRUSTPILOT' AND "dispatchedAt" IS NULL) AS pending_legacy_afs
FROM "ReviewInvite"
GROUP BY "channel";

SELECT COUNT(*) AS appointments_with_multiple_invitations
FROM (
  SELECT "appointmentId" FROM "ReviewInvite"
  WHERE "appointmentId" IS NOT NULL
  GROUP BY "appointmentId" HAVING COUNT(*) > 1
) AS duplicates;

SELECT "countryCode", COUNT(*) AS completed_in_last_45_days,
       COUNT(*) FILTER (WHERE NOT EXISTS (
         SELECT 1 FROM "ReviewInvite" r WHERE r."appointmentId" = a.id
       )) AS without_historical_invitation
FROM "Appointment" a
WHERE status = 'COMPLETED'
  AND "consultationCompletedAt" >= CURRENT_TIMESTAMP - INTERVAL '45 days'
GROUP BY "countryCode";

-- Names only: check which profiles/settings exist without exposing link tokens.
SELECT key FROM "Setting"
WHERE key LIKE 'review.%'
ORDER BY key;

ROLLBACK;
