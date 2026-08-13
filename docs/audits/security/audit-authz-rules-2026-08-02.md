# Custom Authorization Rules — Semgrep

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch:** `Dev-hassaan`
**Tool:** Semgrep 1.172.0 (same install as Phase 3), 5 repo-specific rules in `.semgrep/rules/`
**Audit mode:** Custom static-analysis rule design, ground-truth corpus validation, fixture testing, and CI wiring. No behavioral code changes — only `nosemgrep` suppressions with written justifications, added after individually reading and verifying each site.

## Executive Summary

Five rules target the exact defect class `SECURITY_AUDIT2`'s finding S-005 described: routes that read PHI without going through the central medical-access guard, admin routes with no authorization hook, clinical reads missing the doctor-ownership filter, raw JWT verification used as an authorization decision instead of the DB-backed session gates, and unguarded scheduler-only endpoints.

**3 files have confirmed, real findings** — genuine gaps this pass was designed to surface, not fixed in this session (that's app-code remediation, out of this phase's scope):

- `admin-invoices.route.ts` — an authenticated ADMIN can read a patient's `taxIdNumber` (a PHI-encrypted government ID field) via search and direct lookup, with no `guardMedicalRead` call
- `doctor-patient-documents.route.ts` — a DOCTOR route reads `patientProfile`, `medicalDocument`, `appointmentDocument`, and `generatedDocument` with no guard call
- `patient-upload.route.ts` — a DOCTOR/ADMIN route reads `patientProfile` and `generatedDocument` with no guard call

**1 lower-severity finding:**

- `chat.route.ts` — its admin surface manually reimplements admin-checking (`resolveOptionalAuthUser` + `role !== "ADMIN"`) instead of the centralized `verifyAdminAccess`/`verifyGlobalAdminAccess`. Session validity IS re-verified (tokenVersion + DB lookup), so this is an architectural-consistency gap, not an open door — but it means future hardening to the centralized gate (2FA requirements, country scope, audit logging) won't automatically apply here.
- `services.route.ts` — a public route resolves `userId` via raw `verifyAuthToken` (JWT signature check only, no `tokenVersion` re-check) to gate corporate-only service visibility. Narrow impact: a deactivated/signed-out-everywhere corporate user could still view (not book) corporate-only service metadata until their JWT naturally expires.

**Everything else validated clean** across the full 138-file `backend/src/routes/` corpus: the 15 files that correctly call the medical guard, the 7 files that correctly scope clinical reads by `doctorId`, all cron/internal scheduled-job endpoints, and roughly a dozen legitimate exceptions (patient-self-service, guard-input-management, token-scoped public endpoints, data-integrity checks) — each individually read and suppressed with a written, site-specific reason rather than a blanket exclusion.

## A significant tooling finding: Semgrep multi-file batches produce wrong results with these rules

Every one of the five rules relies on `pattern-not-inside` to express "flag this sink unless a recognized guard/gate call also appears in scope." **Scanning multiple files in a single Semgrep invocation was empirically found to produce incorrect results** — in both directions:

- Running rule 1 or rule 3 against a curated 12-file batch gave 0 findings on files that, when scanned individually, correctly showed real violations (a **false negative** from batching).
- Running rule 1 against the full 138-file `backend/src/routes/` tree in one call produced findings on files (`account-access-log.route.ts`, `certificate-verify.route.ts`, etc.) that were legitimate and, once individually suppressed, disappear entirely from single-file scans (this direction turned out to be *correct* behavior once suppressions were added — but the point stands that batch-vs-single-file gave different answers for the same rule and file).
- The same file pair, scanned together, gave 0 findings in one run and non-zero in another — reproducing the *identical* command. This was traced partway (ruled out: metavariable name collisions across `pattern-not-inside` alternatives, JSON-output/stderr mixing, disk caching, and thread-count via `-j 1`) but the exact root cause inside Semgrep 1.172.0's multi-target evaluation was not fully identified.

**Single-file invocation was reliable and reproducible in every test run performed.** The CI job (`sast-authz-rules`) therefore loops per file — one `semgrep --config .semgrep/rules/` call per route file (138 calls, all 5 rules loaded together each time to avoid 690 separate calls) — rather than passing the whole `backend/src/routes/` tree to a single invocation. Anyone extending this ruleset should validate new rules the same way: confirm results are stable across repeated single-file runs before trusting any multi-file batch result from this version of Semgrep.

## The Five Rules

| ID | Detects | Live findings |
|---|---|---|
| `gh-phi-route-missing-guard` | A route reading a PHI Prisma model via `find*` with no `guardMedicalRead`/`guardMedicalReadForAppointment` anywhere in the file | 3 files (8 findings) |
| `gh-clinical-read-missing-doctor-scope` | `verifyClinicalReadAccess` called with no subsequent `auth.doctorId` reference anywhere in the handler | 0 (all 7 real call sites already correctly scoped) |
| `gh-admin-route-missing-auth-hook` | An `/api/admin/*` route registration with none of `verifyAdminAccess`/`verifyGlobalAdminAccess`/`requireManageSubscriptions`/`dependencies.verifyAdminAccess` anywhere in the file | 1 file (3 findings) |
| `gh-route-raw-token-verify` | `verifyAuthToken` called with no prior `verifyAdminAccess`/`verifyGlobalAdminAccess`/`verifyDoctorAccess`/`verifyClinicalReadAccess`/`resolveOptionalAuthUser` earlier in the same handler | 1 file (1 finding) |
| `gh-cron-route-missing-secret` | An `/api/cron/*` or `/api/internal/*` route registration with no `isValidCronSecret` anywhere in the file | 0 (all 8 real endpoints correctly gated) |

### PHI model list used by `gh-phi-route-missing-guard`

`consultation`, `prescription`, `examResult`, `medicalNote`, `consultationService`, `formSubmission`, `patientProfile`, `patientNationalityDocument`, `medicalDocument`, `generatedDocument`, `appointmentDocument`, `patientUploadLink`, `shareLink`, `consultationMessage`, `crossBorderPrescriptionRequest` (a model added on this branch since the earlier codebase exploration — a doctor-authored cross-border prescription request, genuinely clinical, included in the list).

**Deliberately excluded, with reasons verified by reading the actual code, not assumed:**
- `FamilyMember` — touched only by `family.route.ts`/`cart.route.ts`, both scoped by `primaryUserId` to the caller's own session; never accessed by a doctor/admin route in this codebase.
- `InternalMessage` — doctor↔admin case notes, never patient-visible; not a `resourceType` the guard's own domain model (`prisma/schema.prisma` `MedicalAccessLog.resourceType` enum) recognizes at all.
- `Message` — a separate, non-clinical patient↔admin support-chat model (distinct from `ConsultationMessage`); `chat.route.ts` uses this one, not the clinical model.
- The rule only matches `find(Many|First|Unique|FirstOrThrow|UniqueOrThrow)` — `count`/`groupBy`/`aggregate` calls on a PHI model (e.g. unread-message-count badges) are metadata, not content reads, and are correctly never flagged.

## Corpus Validation (per-file, full `backend/src/routes/` — 138 files)

| Category | Files | Result |
|---|---|---|
| Guard-call sites (`gh-phi-route-missing-guard`) | 15 files that correctly call `guardMedicalRead`/`guardMedicalReadForAppointment` | 0 findings, confirmed individually |
| Clinical-scope sites (`gh-clinical-read-missing-doctor-scope`) | 7 files calling `verifyClinicalReadAccess` | 0 findings — every real occurrence already scopes by `auth.doctorId`, via either the ternary-spread `where` pattern or an explicit ownership comparison |
| Admin-gate sites (`gh-admin-route-missing-auth-hook`) | 59 files registering `/api/admin/*` routes, spanning 4 distinct gate mechanisms (`verifyAdminAccess`, `verifyGlobalAdminAccess`, `requireManageSubscriptions`, DI-wrapped `dependencies.verifyAdminAccess`) and 2 file shapes (const-declared plugin, exported factory function) | 0 findings across 58 files; `chat.route.ts` correctly flagged |
| Cron/internal sites (`gh-cron-route-missing-secret`) | 4 `/api/cron/*` + 4 `/api/internal/*` files | 0 findings — all correctly gated |
| Legitimate exceptions (`gh-phi-route-missing-guard`) | 9 files: patient-self-service (`account-access-log`, `account-data-deletion`, `account-prescriptions`), guard-input management (`consents`, `medical-access-requests`), token-scoped public (`certificate-verify`, `share-links`), doctor/admin data-integrity checks (`admin-doctors`, `admin-users`) | Each individually read, confirmed legitimate, suppressed inline with a site-specific reason (13 suppression comments total) |
| Legitimate exception (`gh-admin-route-missing-auth-hook`) | `admin-notifications.route.ts` — deliberately uses a narrower `requireAdminId()` helper because `verifyAdminAccess`'s Bearer-token fallback has no session-bound user id, which this `recipientUserId`-filtered feature needs | Confirmed via the file's own module-level comment; suppressed at all 4 route registrations |
| Legitimate exceptions (`gh-route-raw-token-verify`) | 4 files: `admin-data-deletion` (×2), `admin-patient-merge`, `admin-security-alerts` — real authz gate (`verifyAdminAccess`/`verifyGlobalAdminAccess`) always runs first; raw token parse is audit-attribution only, with a safe fallback string | Confirmed via the ordered `pattern-not-inside` matching gate-then-token-call sequence; `auth.route.ts`'s logout handler suppressed separately (logout needs no prior authz — clearing your own cookie is always allowed) |

## Fixture Testing (`semgrep --test`)

Each rule has a fixture in `.semgrep/tests/` with `// ruleid:`/`// ok:` annotations. All 5 pass 100%.

| Rule | Fixture covers |
|---|---|
| `gh-phi-route-missing-guard` | Basic unguarded sink; both guard error-handling shapes (`try/catch` and `.catch()` tail); `guardMedicalReadForAppointment`'s guest-booking `null` return; `HealthTest` (non-PHI product catalog) never matching; `count()`-only reads never matching |
| `gh-clinical-read-missing-doctor-scope` | Missing-scope violation; the ternary-spread `where` pattern; the explicit ownership-comparison pattern |
| `gh-admin-route-missing-auth-hook` | Unguarded admin route; standard plugin-hook shape; `verifyGlobalAdminAccess` variant; `requireManageSubscriptions` called inside an `if` condition (not a bare statement); the DI/factory-function shape |
| `gh-route-raw-token-verify` | Raw-token-only violation; gate-then-attribute-via-verifyAdminAccess; gate-then-attribute-via-resolveOptionalAuthUser |
| `gh-cron-route-missing-secret` | Unguarded `/api/cron/*`; unguarded `/api/internal/*`; correctly-gated `/api/cron/*`; a file mixing a genuinely public route with a gated `/api/internal/*` route in the same plugin, confirming the public route is never a candidate match regardless of the guard's presence elsewhere in the file |

Two iteration lessons surfaced while building these fixtures, both now baked into the passing rules:

1. **`nosemgrep`/fixture line adjacency is exact.** A suppression comment (or a `// ok:` fixture annotation) must sit on the line immediately before Semgrep's *reported* line — not the enclosing statement. `Promise.all([a, b])` with two flagged sub-calls needs two separate comments, one per call; a multi-line `reply.send(\n  okResponse({...`'s finding is on the *inner* `okResponse({` line, not `reply.send(`.
2. **Nested expressions need the deep-expression operator.** A bare `auth.doctorId` (or `requireManageSubscriptions(...)`) pattern inside a `pattern-not-inside` block only matches as a standalone statement. Real code embeds these inside comparisons (`existing.doctorId !== auth.doctorId`) or `if` conditions (`if (!(await requireManageSubscriptions(...))) return;`) — `<... $EXPR ...>` is required to match the sub-expression at any nesting depth.

## CI Wiring

`sast-authz-rules` job added to `.github/workflows/ci.yml`, looping per file (see the tooling-finding section above for why) — 138 `semgrep --config .semgrep/rules/` invocations, all 5 rules loaded together per call. Runs **without** `--baseline-commit` (unlike Phase 3's `sast-semgrep`): the intent is for the 3 confirmed genuine findings to show as failures, not be silently carried forward, since fixing them is real remediation work this phase's scope was to surface, not perform. `continue-on-error: true` per this repo's established convention for a job not yet verified in Actions.

## Findings

### Finding S-031: Admin invoice search/lookup reads a patient's tax ID with no medical-access guard — **FIXED 2026-08-02**

- **Severity:** High
- **Category:** authorization / PHI access control
- **Affected files:** `backend/src/routes/admin-invoices.route.ts:209-213, 514-517`
- **Problem:** `taxIdNumber` (one of four AES-256-GCM `PHI_ENCRYPTED_FIELDS`) is searched via `contains` and read via direct lookup by an authenticated ADMIN, with no `guardMedicalRead` call — no confidentiality check, no consent-level enforcement, no `MedicalAccessLog` audit row for this specific read.
- **Why it is dangerous:** Government tax ID is exactly the class of field the guard exists to protect; this route lets any authenticated admin search across all patients' tax IDs with zero audit trail of who looked up whose ID and why.
- **Resolution (2026-08-02):** Split into two distinct fixes, since the flagged code is two structurally different reads:
  - **Single-invoice lookup (line ~514):** now wrapped in `guardMedicalRead` with `resourceType: "SENSITIVE_PROFILE"`, `accessAction: "VIEWED"`, matching the exact pattern in `admin-patient-profile.route.ts:229`. Break-glass reason resolution (`x-phi-reason`/`gh_phi_reason`) is automatic — no per-route threading needed.
  - **Fan-out search (line ~209, up to 200 rows):** the guard is designed for one-resource-at-a-time access, not bulk search — per-row guarding would be slow and is the wrong tool. Instead, the search itself is now logged as one `recordAudit` event (new `AuditAction.PATIENT_TAX_ID_SEARCHED` enum value, additive migration `20260802040127_add_patient_tax_id_searched_audit_action`), logging the actor and search-term *length* only — never the raw tax ID or which patients matched.
  - `backend/src/routes/admin-patient-profile.route.ts:399` had the identical unguarded search pattern — flagged as a follow-up task, and now fixed the same way: the search's `recordAudit` call with `action: "PATIENT_TAX_ID_SEARCHED"` sits right after the query (line ~430-443), logging actor + search-term length + match count, never the raw term or which patients matched.
- **Verification:** `backend/src/routes/authz-matrix.test.ts` — "S-031 fix" tests confirm an admin can still read (200) and that a `MedicalAccessLog` row is now written where previously none was.
- **Difficulty:** Medium (as predicted)
- **Priority:** P1 → resolved

### Finding S-032: Doctor patient-documents route reads four PHI models with no medical-access guard — **FIXED 2026-08-02**

- **Severity:** High
- **Category:** authorization / PHI access control
- **Affected files:** `backend/src/routes/doctor-patient-documents.route.ts:48, 53, 91, 105`
- **Problem:** `verifyDoctorAccess` authenticates the caller, but none of the `patientProfile`, `medicalDocument`, `appointmentDocument`, or `generatedDocument` reads that follow call `guardMedicalRead`.
- **Why it is dangerous:** This is the exact S-005 pattern from the prior audit — a doctor route authenticated but not authorized for the specific patient record, bypassing confidentiality/consent/country-scope checks and leaving no `MedicalAccessLog` trail.
- **Resolution (2026-08-02):** One `guardMedicalRead` call added right after the existing `patientProfile` lookup, covering all four reads that follow (`resourceType: "MEDICAL_DOC"`). Note this handler already bounces any non-ADMIN role before reaching the guard (`if (auth.role !== "ADMIN") return 403`), so the only caller who ever exercises this guard call is an ADMIN with a linked Doctor profile — the guard's ADMIN branch is close to unconditional unless `ADMIN_PHI_REQUIRE_REASON` is on, so the fix's main observable effect is that a `MedicalAccessLog` row is now written for a read that previously wrote none at all.
- **Verification:** `authz-matrix.test.ts` — "S-032 fix" tests confirm regression-safe reads (200), a new `MedicalAccessLog` row, and a real 403 when `ADMIN_PHI_REQUIRE_REASON` is forced on with no reason supplied.
- **Difficulty:** Medium (as predicted)
- **Priority:** P1 → resolved

### Finding S-033: Patient-upload route (doctor/admin side) reads PHI with no medical-access guard — **RECLASSIFIED 2026-08-02: false positive**

- **Severity:** ~~High~~ N/A
- **Category:** ~~authorization / PHI access control~~ Semgrep false positive
- **Affected files:** `backend/src/routes/patient-upload.route.ts:51, 133`
- **Original problem statement (incorrect):** "Same pattern as S-032 — `verifyDoctorAccess`/`verifyAdminAccess` authenticate, but the `patientProfile` and `generatedDocument` reads that follow have no `guardMedicalRead` call."
- **Why this was wrong:** Deeper investigation (2026-08-02) found both flagged lines are inside `/api/public/patient-upload` — a public, single-use **capability-token** flow (`verifyPatientUploadToken`), not a staff-authenticated route at all. There is no `verifyDoctorAccess`/`verifyAdminAccess` anywhere in either handler, and no session-bound actor to construct a `GuardActor` from. The token — minted by a doctor, single-use, scoped to a specific appointment/email — is the authorization mechanism here, structurally different from the session-based medical-access guard `gh-phi-route-missing-guard` checks for.
- **Resolution:** No code/behavior change. Both flagged lines now carry `// nosemgrep: gh-phi-route-missing-guard` with this reasoning, so future scans don't re-flag a route that was never actually guardable this way.
- **Priority:** Closed, no further action.

### Finding S-034: Admin chat surface reimplements admin authorization instead of using the centralized gate

- **Severity:** Low
- **Category:** authorization / architectural consistency
- **Affected files:** `backend/src/routes/chat.route.ts:295-297, 346-348, 417-419`
- **Problem:** The admin-facing message-thread endpoints check `resolveOptionalAuthUser(request)` then `user.role !== "ADMIN"` manually, instead of `verifyAdminAccess`/`verifyGlobalAdminAccess`.
- **Why it is dangerous:** `resolveOptionalAuthUser` does re-verify `tokenVersion` and current DB user state, so this is not an open door — but it bypasses whatever `verifyAdminAccess` does beyond that (country scope, 2FA requirements, consistent audit logging), and any future hardening added to the centralized gate silently won't apply here.
- **Safe fix:** Replace the manual `resolveOptionalAuthUser` + role check with `verifyAdminAccess`.
- **Difficulty:** Low — likely a small refactor, verify no behavioral dependency on `resolveOptionalAuthUser`'s narrower PATIENT/ADMIN-only resolution
- **Production urgency:** Hardening improvement, not urgent
- **Priority:** P2

### Finding S-035: Corporate service-visibility check trusts a raw JWT without re-verifying session validity

- **Severity:** Low
- **Category:** authorization / session invalidation
- **Affected files:** `backend/src/routes/services.route.ts:16`
- **Problem:** `optionalUserId()` calls `verifyAuthToken` directly — which checks only the JWT signature, not current `tokenVersion` or active state — to resolve the caller's identity for `assertCorporateServiceBookable`'s eligibility check.
- **Why it is dangerous:** A corporate user who deactivated their session (role change, "sign out of all devices," account deactivation) retains a validly-signed JWT until natural expiry (`AUTH_JWT_EXPIRES_IN`, default 7 days) and could still view (not book — `assertCorporateServiceBookable` does its own live eligibility check) corporate-only service metadata during that window.
- **Safe fix:** Replace with `resolveOptionalAuthUser`, which performs the same JWT verification plus the `tokenVersion` and DB active-state re-check this route is currently missing.
- **Difficulty:** Trivial
- **Production urgency:** Low — narrow, view-only exposure
- **Priority:** P2

## Recommended ongoing practice

- Any future custom Semgrep rule using `pattern-not-inside` should be corpus-validated with **single-file invocations**, not a multi-file batch — this session found the two give different answers with this Semgrep version.
- `nosemgrep` suppressions in this ruleset must state the specific reason (self-service scoping, guard-input management, narrow ID-resolution, token-scoped public, or deliberate documented architectural exception) — a bare suppression with no reason should be treated as a review flag, not accepted.
- S-031/S-032/S-033 should be prioritized for an actual code fix in a follow-up session — this phase's scope was detection tooling, not remediation.
