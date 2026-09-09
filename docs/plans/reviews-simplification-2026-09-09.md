# Reviews: audit and implementation plan

Date: 9 September 2026. Status: proposed; implementation and production sending have not started.

Use one review-request journey across all six markets. Keep one global Doctify account, one global Trustpilot account when available, and a Google Business Profile review link for each country. Send after a completed consultation, with a configurable, limited email follow-up sequence.

This audit covers the current shared working tree, not a verified production deployment. There are concurrent edits to schema, settings and email delivery files. Recheck those files before implementation; do not overwrite or assume those edits have shipped.

## What is wrong today

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Global Doctify/Trustpilot and country Google routing already exist | `backend/src/modules/review-invites/review-destinations.ts`, `backend/src/modules/settings/settings.service.ts` | Reuse this model; no country Doctify accounts are needed. |
| Seven private ratings are required before the UI exposes public review links | `frontend/app/(global)/reviews/rate/ReviewRatePageClient.tsx:62`, `:83`; `backend/src/routes/review-invites.route.ts:15` | Unnecessary work before the action we want. Links are available after any score; the observed code does not selectively route only positive scores. |
| No configurable follow-up lifecycle | `backend/src/modules/review-invites/review-invite.service.ts:123`; `review-destinations.ts:112` | New invitations send immediately; legacy scheduling handles Trustpilot AFS only. |
| Email result is ignored; an existing invitation prevents another send | `review-invite.service.ts:83`, `:123`; `backend/src/lib/email/send-email.ts` | A returned `{ok:false}` can leave an invitation unsent with no retry. |
| Doctor completion starts an invitation; admin completion does not | `backend/src/modules/doctor-appointments/doctor-appointments.service.ts:77`; `backend/src/modules/appointments/appointments.service.ts:802` | Equivalent completed appointments receive different treatment. The doctor call also runs without durable enqueueing. |
| Lookup then insert has no appointment uniqueness constraint | `review-invite.service.ts:83`, `:102`; `backend/prisma/schema.prisma:2980` | Concurrent requests can duplicate invitations. Submitted or expired invitations can also be recreated. |
| `submittedAt` means private survey submitted | `review-invite.service.ts:275` | It cannot establish that a public review was posted. |
| Patient portal banner is Trustpilot-only and uses appointment `updatedAt` | `backend/src/routes/account-trustpilot-reminder.route.ts:24` | Editing an old appointment can revive the banner; completion/dismissal does not govern it. |
| Settings mix collection, widget IDs, manual ratings and search markup | `frontend/app/(portal)/(admin)/admin/settings/reviews/page.tsx:129` onward | Routine review automation is buried among unrelated display controls. Google still has a site-wide rating setting despite country-specific profiles. |
| Email body is partly English; phone presence triggers WhatsApp too | `backend/src/lib/email/templates.ts:745`; `review-invite.service.ts:132` | Inconsistent language and duplicate-channel requests. |

The legacy AFS cron also sends before stamping dispatch state. Its HTTP route does not use the internal scheduler's advisory lock, so overlapping invocations can duplicate sends. Reconcile or retire this path during cutover.

## Recommended patient journey

1. Consultation completes. Record the actual completion time. A booking confirmation alone does not trigger a clinical-experience review request.
2. After 24 hours, send one short email in the appointment's notification language.
3. “Leave a review” opens the existing review URL, redesigned to show the available providers immediately: Doctify, Google for the appointment country, and Trustpilot when configured. Patients choose one; they are not asked to review on all three.
4. Keep “I've already reviewed” and “Stop review emails” available on the page. Private feedback can remain optional and separate; no score is needed to reach public providers.
5. Send a reminder seven days after the first successful email if the sequence has not stopped. Default to one reminder; allow zero, one or two in the portal.

Apply the same invitation criteria and presentation regardless of sentiment, doctor, clinical outcome or whether a prescription was issued. Cancelled/no-show appointments are outside this completed-consultation campaign. A refund after a completed consultation is not, by itself, a reason to exclude someone. Use the appointment country for Google routing, never IP address or current browser language.

Example default sequence: consultation Monday 10:00; request Tuesday 10:00; one reminder the following Tuesday 10:00. A second reminder, if configured, follows seven days after the previous successful send. Delivery retries do not count as follow-ups.

## What “hasn't reviewed” can mean

There is no universal cross-platform review-completion signal. A generic external link does not give our backend access to the review a patient submits. Do not infer identity by matching reviewer names, scrape profiles, or use a changed aggregate count as proof.

| Signal | Portal label | Follow-up action |
| --- | --- | --- |
| Provider supplies a supported, securely matched completion event | Review confirmed by provider | Stop |
| Patient presses “I've already reviewed” | Patient says reviewed | Stop |
| Patient explicitly chooses an external provider on our page | Review site opened; posting unconfirmed | Stop as a conservative default |
| Patient opens the email or visits our landing page only | No completion confirmation | Continue within limit |
| Patient opts out, staff suppress sending, or address permanently fails | Stopped, with reason | Stop |

Stopping after a provider selection deliberately trades some unfinished reviews for fewer unwanted reminders. It must never increase the “confirmed reviews” count. Record the selection through an explicit first-party action; do not let email scanners loading a GET link mark someone reviewed or opted out. If external navigation fails, keep a retry link visible.

For Google, plan around unconfirmed completion. For Doctify and Trustpilot, verify the actual account's supported integration and correlation mechanism before promising automatic confirmation. Trustpilot's native reminder system can detect reviews made through its original invitation; that does not establish completion for a generic link or a different platform.

## Simpler admin portal

Keep `/admin/settings/reviews`, with three views: Automation, Activity, and Website display. Default to Automation.

Automation contains the following controls, with one save action and an email preview:

| Control | Proposed default / behavior |
| --- | --- |
| Send review emails | Off until rollout checks pass; one global pause switch |
| Send first request | 24 hours after consultation completion; configurable 1–168 hours |
| Number of follow-ups | 1; choose 0, 1 or 2, excluding the initial email |
| Days between follow-ups | 7; configurable 3–14 days; hide when follow-ups are zero |
| Repeat-patient frequency | At most one new sequence per 90 days across countries; show this rule clearly |
| Doctify | One global review link and Open link action |
| Trustpilot | One global review link; “Not connected” until supplied; hide from patients while absent |
| Countries | Six rows: country, Google review link, sending enabled, readiness |

The timing ranges, reminder cap and 90-day cooldown are product recommendations, not universal provider requirements. Use a fixed cooldown initially to avoid another settings panel. The first eligible appointment wins during the cooldown; protect this decision against concurrent worker runs. Respect suppression for both account and guest bookings, using the existing canonical patient/contact identity rules rather than ad hoc email aliases.

The six rows are Ireland, Czechia, Portugal, Spain, Romania and Brazil. A missing GBP link does not block a country's shared Doctify request. A country must have at least one usable destination before enabling sends. Validate HTTPS and provider hosts server-side. A syntactically valid URL is “Configured,” not “Account verified.”

Activity shows queued, sent, follow-ups sent, review-site opens, patient-reported reviews, provider-confirmed reviews, stopped and failed. Show filtered counts and a paginated list with country, appointment reference, last send, follow-ups sent/limit, next send and stop/error reason. Provide Stop and retry of known failed delivery; no unrestricted resend button. Keep patient information within existing admin access boundaries.

Website display holds Doctify widget settings and provider rating metadata. Keep these out of email setup. Label Doctify/Trustpilot ratings global and Google ratings country-specific; do not present one GBP's score as six markets' score. Preserve existing rendering during migration. Any change to public rating/schema behavior needs its own focused validation under the repository's SEO process; this plan does not authorize a wider SEO rewrite.

Use `FormSection`, existing buttons, `ColumnPriorityTable`, `AppMenu` and `PortalDialog` where appropriate. Portal styling belongs in `portal.css`; patient review-page styling belongs in `globals.css`.

## Implementation steps

### 1. Extend existing state and settings

Keep global destination keys and country settings. Add one validated `review.automation` setting with enablement, activation time, initial delay, reminder interval and maximum follow-ups. Show the computed sequence before saving.

Extend `ReviewInvite` with campaign version, appointment-country/locale snapshot, next-send time and terminal stop reason/time. Keep historical survey ratings and `submittedAt` intact. Add a delivery record per sequence stage with a unique `(inviteId, stage)` key, status, attempts, accepted-send time, provider message ID and sanitized error. Derive successful follow-up counts from these records instead of maintaining a second counter that can drift.

Enforce one new campaign per appointment at the database level. Historical duplicates must remain preserved: use a version-scoped/partial uniqueness rule for new campaigns after a read-only duplicate inventory. Add due-work indexes. Do not collapse old survey submissions into “public review completed.”

### 2. Make one scheduler responsible for sending

Extend the current internal scheduler and `backend/src/modules/outbox/outbox.ts`; do not add another queue dependency. Periodically discover completed appointments using `consultationCompletedAt`, create campaign/delivery records and enqueue due stages transactionally. This covers doctor completion, admin completion and missed request-time calls. A durable discovery cursor with bounded batches and overlap makes restarts recoverable; database uniqueness handles repeated discovery.

Remove immediate-send behavior from the old creation path when the new campaign is enabled. Route the internal endpoint through the same idempotent scheduling operation. Recheck appointment status, destinations, global/country switches, suppression, cooldown, stage limit and expiry immediately before sending. Do not hold a database transaction open during network delivery.

Use current settings as immediate upper bounds: pausing or reducing the follow-up limit stops pending work. Preserve a campaign's timing snapshot for predictability; timing edits apply to new campaigns. Raising a limit never resurrects terminal sequences. Expire sequences 45 days after completion and expire links 60 days after completion, covering the maximum supported schedule. Pausing cannot recall an email already accepted by the provider.

### 3. Handle delivery and tokens explicitly

Reuse email transports and outbox claims/backoff, but add review-specific delivery protection. The outbox timeout currently requeues without cancelling the network call; a unique queue key alone cannot guarantee exactly-once email delivery.

Before a send, persist the attempt. Count only actual provider acceptance, never development/log mode. Retry known nonacceptance with bounded backoff. If a crash or timeout leaves acceptance uncertain, mark delivery unknown and do not blindly resend through an expired worker lease. Reconcile with provider evidence where available; otherwise show it for operator review. Permanent failure stops that sequence. Label acceptance “Sent,” not “Delivered,” unless a delivery event exists.

Current raw review tokens are not stored, so they cannot simply be reused by a later worker. Add hashed capability tokens associated with each delivery attempt. Generate raw tokens only at send time, retain prior token hashes until expiry so older email links work, and never put raw tokens in outbox payloads or logs. All tokens resolve to the same campaign and stop state. Support old token lookup during migration.

Token endpoints expose no clinical details, validate allowed provider destinations and resist replay/rate abuse. Use no-referrer and no-store on the token page, exclude it from indexing, and prevent analytics from capturing token URLs. Opt-out uses an explicit action and covers future review campaigns for that recipient without disabling essential appointment emails. Reuse compatible existing suppression infrastructure after checking its current implementation and review-email preference rules across markets.

### 4. Replace the patient UI and email copy

Show provider choices before any survey; retain a separate optional feedback route and historical data. Replace the account's Trustpilot-only banner/API with the same campaign destination and stop state. Use true completion time, not `updatedAt`.

Localize the full initial email, reminder, controls, errors and expired-link screen: English, Czech, Portuguese, Spanish, Romanian and Brazilian Portuguese. Preserve the appointment's selected language with country fallback. Start with email only and retire automatic WhatsApp from this campaign.

Suggested email: “Thank you for using Global Health. If you'd like to share your experience, you can leave an honest review on your preferred platform.” CTA: “Leave a review.” Reminder: “If you haven't shared your experience yet and would like to, you can leave a review here. If you've already reviewed, thank you.” Include the stop controls and a brief reminder not to include medical or identifying details in a public review.

### 5. Migrate and release without duplicate campaigns

Preserve existing settings, submissions and links; deploy additive schema changes with automation off. Inventory historical internal and Trustpilot AFS invitations in dry-run mode. Mark historical invitations ineligible for the new follow-up engine by default. Do not automatically email the historical patient database.

Start with consultations completed on or after activation. A later, explicitly selected recent-history batch can be previewed with counts and deduplication before sending. Resolve whether any Doctify/Trustpilot native automations are already active and pause overlapping delivery. One system must own the reminder sequence for a patient; the proposed default is Global Health. Preserve the legacy endpoint until its deployment callers are inventoried, then stop its scheduler/dispatch safely.

Verify the real global Doctify collection link works for the six markets/languages, add the country GBP links, and add Trustpilot when the account is ready. Check integration entitlement and data-sharing requirements before implementing provider callbacks or sending patient contact data to a review platform. Generic patient-chosen links do not require an invitation API integration to launch.

Test with captured email locally and controlled recipients in staging, then enable one market before the rest. Watch queue age, failed/unknown deliveries and stop reasons. Rollback is the global pause switch plus disabling the scheduler; keep additive data and historical links, and ensure rollback does not reactivate the legacy sender.

## Acceptance checks

- Every country resolves to its own Google URL and the same global Doctify/Trustpilot URLs; unavailable providers disappear cleanly.
- Doctor and admin completion both produce exactly one new campaign; booking, cancellation and no-show do not. Repeated/concurrent discovery and internal requests cannot duplicate stages or bypass repeat-patient cooldown.
- Fake-clock tests prove initial delay, 0/1/2 follow-ups, successful-send-relative spacing, pause, lower limits, cooldown and expiry. Retry attempts never consume follow-up count.
- Explicit selection, self-report, opt-out and confirmed provider events stop queued work; mere page loads do not. Old and new tokens resolve correctly and expire. Clicks never count as confirmed reviews.
- Known failures retry; unknown delivery, stale claims, timeout and log-only sending cannot silently count as success or resend. An old worker returning after timeout cannot enable a second email.
- All six languages have complete email/page copy. Public links are equally available after low or high private ratings, and without private ratings.
- Admin authorization, validation, pagination and keyboard/mobile access work. Token endpoints do not leak patient data; expired/removed destination links fail safely.
- Migration dry run preserves historical ratings/tokens, blocks old backlog sends and prevents legacy/new campaign overlap.

Run focused existing and new review tests with the repository test guard; type-check separately with `pnpm --filter backend typecheck` and `pnpm --filter frontend exec tsc --noEmit`. Run applicable authorization/security checks for new endpoints. Production database scripts require a dry run and confirmation under repository rules. No test or production email was sent during this planning audit.

## External guidance checked

There is a common pattern, but no single universal timing or completion API across the providers. The proposed 24-hour request and seven-day reminder are our defaults.

- [Doctify: automate patient feedback](https://www.doctify.com/uk/blog/posts/now-is-the-time-to-automate-your-patient-feedback-requests), published 9 May 2022, read 9 September 2026: post-appointment triggers, configurable delay, email/SMS and the unique Doctify review link; gives a 24-hour consultation example. It does not establish account-specific callback access.
- [Google Business Profile: tips to get more reviews](https://support.google.com/business/answer/3474122?hl=en), read 9 September 2026: request reviews with a Google link/QR code, welcome balanced feedback, no incentives, protect privacy.
- [Trustpilot: invitation timing and delivery](https://help.trustpilot.com/s/article/Configure-your-invitation-time-and-delivery-settings?language=en_US), read 9 September 2026: delay, frequency controls and a reminder when no review was left through the original invitation.
- [Trustpilot: business guidelines, June 2026](https://corporate.trustpilot.com/legal/for-businesses/guidelines-for-businesses/jun-2026), read 9 September 2026: consistent, neutral invitations; no incentives or sentiment screening; links/QR codes are permitted when collection is fair and neutral.

Proof of this audit: source tracing and the four official pages above. Only this plan was added; application code, configuration and production state were not changed by this task.
