# Review campaigns: implementation and rollout

Implemented the September 9 plan. The portal now separates Automation, Activity and Website display. Collection uses global Doctify, optional global Trustpilot and each country's Google review URL. The patient page offers providers immediately; private ratings are optional.

The existing scheduler and outbox own delivery. Defaults are 24 hours after a completed consultation, one reminder seven days after successful delivery, a configurable zero-to-two reminder limit, a 90-day recipient cooldown and a 45-day sequence lifetime. Booking alone does not trigger a request. Explicit platform choice, self-report and opt-out stop reminders; a platform choice is never counted as a verified review. Unknown email acceptance cannot automatically resend.

## Release steps

1. Migration `20260910090000_review_campaigns` was applied to Railway Development, then Production on September 10, 2026, with explicit user authorization. Both had only this migration pending and no failed migrations. The migration is additive; historical invitations remain version zero and cannot enter the new scheduler.
2. Run `backend/scripts/review-rollout-inventory.sql` as a read-only inventory. Confirm that any native Doctify or Trustpilot invitation automation will not overlap. The legacy cron URL now schedules unified campaigns and never drains historical AFS invitations.
3. In `/admin/settings/reviews`, set the global collection links and country Google links. Leave automation off while checking all links and the twelve localized email previews. Review sends require a configured email transport.
4. Test captured emails and explicit stop actions in staging, including repeated scheduler runs. Enable one country, then global automation. The server records the first activation cutoff; older consultations are excluded. Timing changes affect new sequences; pause and reduced reminder limits affect pending sends.
5. Monitor Activity for failed and unknown deliveries. Retry is available only for known failures. Unknown acceptance requires provider reconciliation and must not be manually treated as a failed send. Roll out the remaining countries after staging and the first-market checks.

Pause global automation to stop subsequent sends. Retain the additive schema and campaign records on rollback, and do not restore the retired AFS sender.

## Verification and limits

Backend and frontend TypeScript checks passed independently. All 56 focused backend tests and 18 frontend tests passed, covering campaign delivery, provider routing, legacy token compatibility, expiry, admin authorization and validation, explicit patient actions, privacy headers, proxy forwarding and six-language copy parity. Frontend review lint and the six-locale key check also passed.

Both databases verified the applied checksum `7eeed353d74f7469ae9a423fdba67176c51cd08a3ad3e956c4443ca2079c06ef`, the new columns/tables and the partial unique appointment index. Development preserved 187 invitations and 33 submissions; Production preserved 237 invitations and 38 submissions. All existing invitations remain legacy version zero. Automation was disabled in both environments and was not changed.

No review emails were sent. Concurrent-worker integration checks and browser-based staging acceptance remain release gates. Semgrep was unavailable in the installed runtime; the repository security CI must run before release. Provider-confirmed review callbacks are not connected: Activity distinguishes site selection and patient self-report. Application deployment is separate from the completed database migration.
