# Go-Live Audit Review — 2026-07-17

Review of the pre-launch security/release audit ([go-live-audit-2026-07-17.md](go-live-audit-2026-07-17.md), NO-GO verdict). Verdict: **audit is sound, NO-GO stands**. Spot-checks confirmed the two highest findings against source:

- SEC-001 confirmed: `backend/src/utils/admin-access-evaluator.ts:15` grants `LOCAL_ADMIN`, `ADMIN`, `SUPER_ADMIN` identically.
- SEC-004 confirmed: `frontend/proxy.ts` reads `AUTH_JWT_SECRET` and retains the legacy HS256 verify path (S-012 removal task still open); backend accepts the same fallback.

The audit is thorough on the code it inspected. What follows is what it **missed** — mostly release-management and operational reality that a worktree-only audit cannot see.

## 0. PASS re-verification — 2026-07-17

The audit's PASS marks are point-in-time. Re-ran the cheap ones live today after the repo changed. Results:

| PASS item | Re-check | Result |
| --- | --- | --- |
| `pnpm.overrides` drift | `node scripts/check-override-drift.mjs` | PASS (exit 0, consistent) |
| No focused tests (`.only`) | grep `.only(` in test files | PASS (none) |
| No `debugger` | grep `frontend/app` + `backend/src` | PASS (none) |
| No tracked `.env`/secrets | `git ls-files` env scan | PASS (none tracked) |
| All 21 finding-evidence files exist | file-existence sweep | PASS (all present) |
| SEC-001 still real | `admin-access-evaluator.ts:15` | CONFIRMED — LOCAL_ADMIN still granted equally |
| SEC-004 still real | `frontend/proxy.ts` AUTH_JWT_SECRET | CONFIRMED — HS256 fallback still present |

### Typecheck PASS was STALE — caught and fixed

Re-running `pnpm typecheck` today first **FAILED** (exit 2): 11 errors in `backend/src/modules/invoices/generate-invoice.service.ts` and `backend/src/routes/admin-invoices.route.ts` — `creditNoteReason`, `order`, and `invoices` reported missing on the `Invoice` type.

Root cause: **stale generated Prisma client**, not deleted source. `backend/prisma/schema.prisma` is git-clean and still defines `creditNoteReason`, the `order` relation, and `Order.invoices`. The generated client in `node_modules` had drifted from the schema. Fixed with `pnpm --filter backend exec prisma generate`; typecheck then passed (exit 0).

**Plan impact:** the release pipeline MUST run `prisma generate` before typecheck/build, or this exact drift ships. Add to CI (`ci.yml`) and to the deployment verification commands in the audit's §10. The `pnpm.overrides`/`pnpm.//` WARN during typecheck is expected — mirrored into service package.json on purpose (deployed services build standalone with `--ignore-workspace`; see CLAUDE.md), not a regression.

### Still not re-verified (do NOT carry forward old PASS)

Point-in-time gates — re-run on the actual release branch before go-live:

- Frontend unit tests (97/97) — `pnpm --filter frontend test`.
- Frontend + backend production build — `pnpm build` (after `prisma generate`).
- Lint — `pnpm lint`.
- Lockfile / frozen install — `pnpm install --frozen-lockfile`.

Nothing deleted changed the security findings — all blockers stand. The only regression surfaced was the stale Prisma client, now fixed.

## 1. Missing: branch / deployment-state audit (highest-impact gap)

The audit inspected a single working tree (`Security-Audit` branch). It never asked **which branch actually deploys**, and the repo is heavily divergent:

- Local branches: `main`, `Dev-hassaan`, `Dev-nauman`, `Security-Audit`, `feat/subscriptions`, `fix/critical-security-findings`, and others — many with unpushed or unmerged commits.
- Multiple completed **security fix batches exist only on unmerged/unpushed branches**: the round-3 security deploy set, the ~23-commit Audit2 remediation on `Dev-hassaan`, the subscription P0 hardening. If `main` (or Railway's tracked branch) goes live, those fixes are NOT in the deployed artifact.
- **Known deploy landmine**: the JWT asymmetric-signing commit (e51069f0 lineage) crash-loops the backend unless `AUTH_JWT_PRIVATE_KEY` / `AUTH_JWT_PUBLIC_KEY` are set on Railway *before* deploy. The audit's SEC-004 remediation (remove HS256) makes this a hard dependency. Not mentioned anywhere in the report.
- `Dev-nauman` was force-push reset in mid-July; ~20 commits (7 security fixes) survive only on a local backup branch. History-integrity risk the audit's Git section missed.

**Action**: before any go-live, produce a branch reconciliation plan — decide the release branch, merge/cherry-pick every security fix into it, and diff it against what Railway builds.

## 2. Missing: known-open credential items beyond SEC-003

- **Make.com webhook secret was flagged for rotation in a prior audit and is still NOT rotated.** The report's SEC-003 rotation list should explicitly include it.
- Stripe webhook signing secret rotation status not assessed.

## 3. Missing: database operational reality

The audit marked backups "NOT VERIFIED". Stronger evidence exists and worsens the picture:

- **Railway has NO automatic backups** — confirmed the hard way during the July DB wipe incident (Service table wiped, 88 records manually rebuilt). OPS-001 should be upgraded from "not verified" to "known absent".
- The test-DB guard that blocked `pnpm --filter backend test` exists precisely because a dev process once pointed at the production DB. SEC-003's "remove prod DB URL from local env" has an incident precedent — treat as confirmed exposure, not "potential".
- **`prisma migrate dev` is broken** in this repo (shadow-DB failure); team uses a diff-from-live-DB + `migrate deploy` workaround. Release process must account for this; the audit's verification commands assume a healthy migrate flow.
- **Unapplied migrations / unrun seeds queued**: i18n translation-table migration (20260716130000) authored but not applied; index migration from remediation authored not applied; country-disclaimer and corporate-plan seeds not run. Migration-state drift is a go-live gate the audit's checklist doesn't enumerate.
- **Prod-DB / code drift**: several content patches (Spain/Brazil/Czechia doctor briefs, Ireland content) were applied **directly to the production DB** while the generating code remains uncommitted. Deploying a stale branch can regress or contradict live DB content.

## 4. Missing: session/PHI items already tracked as open

- **Auto-logoff / idle session timeout** for clinical portals — known open item, absent from the report despite the PHI focus (relevant to SEC-005).
- WhatsApp-PHI exposure was already an accepted-open item from the round-3 deploy; PRIV-001 rediscovers it but doesn't note it was previously triaged — rotation of that decision needs an owner.

## 5. Missing: environment/config gates

- `NEXT_PUBLIC_SITE_URL` unset — canonical URLs and several SEO/metadata paths are blocked on it; belongs on the go-live checklist.
- `pnpm.overrides` security pins must be mirrored into root, `frontend/`, and `backend/` package.json (deployed services build standalone with `--ignore-workspace`). Audit ran the drift check (PASS) but didn't flag the fragility as process risk.
- Node 24 local vs Node 22 CI/deploy — listed as Warning; should be a checklist item: run the release verification on Node 22.

## 6. Missing: verification steps the audit could not run — assign owners

These stay open until someone runs them; the report lists them but assigns no owners:

| Item | Suggested owner action |
| --- | --- |
| `pnpm audit` dependency scan | Run once approved (transmits dependency graph) |
| Docker up → `test:db` 17 failures | Triage failures; several may be env, not product |
| E2E with real backend | Fix `playwright.config.ts` (standalone server + backend + seeded DB) |
| Live headers/TLS/CSP/CORS | Probe an authorized staging URL |
| Git-history secret scan | Re-run gitleaks over full history on a Linux/CI runner |
| Railway settings, branch protection | Manual console review |
| Backup + restore drill | Set up Railway/pg_dump backups first (none exist) |

## 7. Minor report issues

- SEC-004 wording: the frontend code path is a *verify* fallback, not a signer — the finding is still valid (possession of the shared secret enables minting), but remediation should say "remove the secret from the frontend environment", which the report does get right.
- OWASP/ASVS mapping fine; report could cite the specific ASVS 5.0 requirement IDs per finding for traceability.
- Findings count line says "6 High" but lists SEC-004/005/006, PRIV-001, OPS-001, A11Y-001 — consistent; no issue.

## 8. Consolidated go-live blocker list (audit's 12 + this review)

1–12. All 12 blockers from the audit report (access control, PHI guard, credential rotation, HS256 removal, compliance enforcement, Stripe data minimization, WhatsApp consent, capability tokens, WCAG, test suites, monitoring/backups, live verification).
13. Branch reconciliation: merge all security-fix branches into the release branch; verify Railway builds it.
14. Set `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY` on Railway **before** deploying the JWT changes (crash-loop otherwise).
15. Rotate the Make.com webhook secret (long-standing open item).
16. Apply queued migrations + run pending seeds in order; document migration state (migrate-dev is broken — use `migrate deploy`).
17. Stand up DB backups (none exist) and run one restore drill.
18. Commit the code behind prod-DB content patches or verify deploy branch matches live DB content.
19. Set `NEXT_PUBLIC_SITE_URL` and other missing production env vars.
20. Implement clinical-portal auto-logoff.

## 9. Prioritized blocker ranking

All 20 blockers ranked by urgency. Rationale: active-exposure items first (exploitable today, no deploy needed), then the deploy pipeline itself (nothing ships without it), then code fixes in exploit-likelihood order, then verification gates.

### P0 — immediately (this week, in order)

| # | Blocker | Why first |
| --- | --- | --- |
| 1 | **Rotate all potentially exposed credentials** (SEC-003) + remove prod DB URL from local env files; audit provider access logs | Active exposure right now. Independent of any code change or deploy. Every day unrotated = full DB/payment/storage compromise window. |
| 2 | **Rotate Make.com webhook secret** | Same batch as #1 — flagged in a prior audit, still open. |
| 3 | **Branch reconciliation** — pick release branch, merge every security-fix branch (Audit2 23 commits, round-3 set, subscription hardening), verify Railway builds it | Prerequisite for shipping ANY fix below. Fixes stuck on unmerged branches protect nobody. |
| 4 | **LOCAL_ADMIN scoping** (SEC-001) — `verifyGlobalAdminAccess` + country predicates on global config/deletion/bank routes | Worst live authz hole: one compromised local admin = cross-country data + IBANs. |
| 5 | **Enforce medical-access guard on every PHI route** (SEC-002) — mandatory pre-handler | Clinical data served without consent/2FA/audit. Core product is health data; this is the product's own promise. |

### P1 — before any production deploy

| # | Blocker | Notes |
| --- | --- | --- |
| 6 | **Set `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY` on Railway** | Must land BEFORE #7 deploys — backend crash-loops otherwise. |
| 7 | **Remove HS256 fallback + all signing/admin secrets from frontend** (SEC-004); rotate legacy secret, bump token versions | Pairs with #6. Frontend compromise currently = mint SUPER_ADMIN. |
| 8 | **Fail-closed production config** (SEC-005) — boot refuses relaxed compliance mode, empty 2FA roles, disabled medical enforcement | One env var typo currently disables PHI protection silently. |
| 9 | **Strip clinical notes from Stripe payloads** (PRIV-001a) — opaque IDs, generic labels | Small diff, ongoing PHI disclosure until fixed. |
| 10 | **WhatsApp consent fail-closed** (PRIV-001b) — require `patientConsent === true` | One-line semantic fix; compliance exposure per message sent. |
| 11 | **Apply queued migrations + run pending seeds** (i18n 20260716130000, index migration, disclaimer/corporate seeds) — via `migrate deploy` (migrate dev broken) | Deploying code against wrong schema = runtime failures or data corruption. |
| 12 | **Stand up DB backups + one restore drill** | Known absent (July wipe proved it). Going live on health data with zero backups is indefensible. |
| 13 | **Hash/expire/single-use capability tokens; redact URLs from logs** (SEC-006) | Real but needs a leak vector (logs/history); after the direct-access holes. |

### P2 — launch gate (block go-live until green)

| # | Blocker | Notes |
| --- | --- | --- |
| 14 | **Backend integration (17 fails) + E2E suites green** in isolated full stack; fix `playwright.config.ts` (standalone server + backend + seeded DB) | Can run in parallel with P1 fixes; must be green on the release branch. |
| 15 | **Production error monitoring, alert owners, rollback playbook** (OPS-001) | Without it, launch is blind — no detection of the very failures above. |
| 16 | **WCAG blockers** (A11Y-001): contrast, SSR lang, page titles, keyboard rows, focus restore | Legal/accessibility gate; mechanical fixes. |
| 17 | **Production env vars**: `NEXT_PUBLIC_SITE_URL` + full env audit on Railway | Cheap; blocks canonical/SEO + parts of #6. |
| 18 | **Live verification sweep**: `pnpm audit` (approve dependency-graph disclosure), TLS/headers/CSP/CORS probes on staging, git-history gitleaks on CI runner, smoke journeys | The audit's 9 NOT-VERIFIED areas. |
| 19 | **Commit code behind prod-DB content patches** (Spain/Brazil/Czechia/Ireland) or verify release branch matches live DB | Prevents deploy regressing live content. |

### P3 — fast follow (first 1–2 weeks after launch)

| # | Item |
| --- | --- |
| 20 | Clinical-portal auto-logoff / idle timeout |
| 21 | PHI audit writes fail-closed (SEC-008) |
| 22 | Deletion/anonymization completion (PRIV-002) + legal review |
| 23 | CI gates: E2E, SAST, dependency-review, SBOM, Dependabot/Renovate, deploy approval, post-deploy smoke (CI-001) |
| 24 | Enforce public CSP after monitored report-only period (DEP-001) |
| 25 | CMS CSS sanitizer replacement (SEC-007) — before untrusted CMS authors get access |
| 26 | Performance budgets (PERF-001), immutable-cache scoping (CACHE-001) |

Dependency chain worth respecting: **#1–2 today → #3 unblocks everything → #4–13 land on the release branch → #14–18 prove it → go-live → #20+**. Items #6→#7 are strictly ordered (keys before HS256-removal deploy). #14–18 parallelize with P1.

## 10. Go-live execution plan (model routing)

Routing rule: **Fable = brain** (orchestrate, sequence, review each result, decide go/no-go). **Opus = security** (any auth/PHI/crypto/credential/access-control change — design + implement + self-review). **Sonnet 5 = execution** (mechanical edits, migrations, config, tests, non-security fixes).

Fable owns the loop: dispatch each item to the right model, verify the returned diff, gate the next step. Security items get an Opus author + a second Opus review pass before Fable accepts. Every code item ends with Sonnet running `prisma generate` → typecheck → build → lint on the release branch (see §0 — stale client bit us once).

### Stage 0 — human-only, no model (start now, parallel to everything)

| # | Task | Owner |
| --- | --- | --- |
| 1 | Rotate exposed credentials, remove prod DB URL from local env, audit provider logs | **Human** — models must NOT touch live secrets (prohibited action). Fable produces the rotation checklist + verification steps only. |
| 2 | Rotate Make.com webhook secret | **Human** |
| 6 | Set `AUTH_JWT_PRIVATE_KEY`/`PUBLIC_KEY` on Railway | **Human** — before item 7 deploys |
| 12 | DB backups + restore drill | **Human** (infra); Fable writes the runbook |

### Stage 1 — release branch (Fable orchestrates)

| # | Task | Model | Notes |
| --- | --- | --- | --- |
| 3 | Branch reconciliation — merge all security-fix branches, verify Railway target | **Fable** decides merge order/conflicts; **Sonnet** executes merges/cherry-picks | Blocks all code work below |
| — | Baseline: `prisma generate` → typecheck → build → lint green on release branch | **Sonnet** | Green baseline before any change |

### Stage 2 — security fixes (Opus authors, Opus reviews, Fable gates)

| # | Task | Model |
| --- | --- | --- |
| 4 | LOCAL_ADMIN scoping — `verifyGlobalAdminAccess` + country predicates (SEC-001) | **Opus** |
| 5 | Medical-access guard mandatory on every PHI route (SEC-002) | **Opus** |
| 7 | Remove HS256 fallback + frontend signing/admin secrets, bump token versions (SEC-004) | **Opus** — deploy only after item 6 |
| 8 | Fail-closed prod config at boot — reject relaxed compliance/empty 2FA/disabled enforcement (SEC-005) | **Opus** |
| 9 | Strip clinical notes from Stripe payloads (PRIV-001a) | **Opus** |
| 10 | WhatsApp consent fail-closed `patientConsent === true` (PRIV-001b) | **Opus** |
| 13 | Hash/expire/single-use capability tokens, redact URLs from logs (SEC-006) | **Opus** |

Each: Opus writes the patch + regression test → second Opus pass reviews for bypass/alg-confusion/IDOR → Sonnet runs the verify chain → Fable accepts or bounces.

### Stage 3 — data + execution (Sonnet executes, Fable verifies)

| # | Task | Model |
| --- | --- | --- |
| 11 | Apply queued migrations + seeds via `migrate deploy` (migrate dev broken) | **Sonnet** — Fable confirms order/idempotency first |
| 19 | Commit code behind prod-DB content patches, or verify branch matches live DB | **Sonnet** |
| 17 | Set `NEXT_PUBLIC_SITE_URL` + full Railway env audit | **Sonnet** |
| 16 | WCAG fixes — contrast, SSR lang, titles, keyboard rows, focus (A11Y-001) | **Sonnet** |

### Stage 4 — launch gate (Sonnet runs, Fable reads results, Opus triages security-relevant failures)

| # | Task | Model |
| --- | --- | --- |
| 14 | Backend integration (17 fails) + E2E green; fix `playwright.config.ts` | **Sonnet** runs/fixes env; **Opus** if a failure is an auth/PHI regression |
| 15 | Error monitoring + alert owners + rollback playbook (OPS-001) | **Sonnet** wires SDK; **Fable** defines thresholds/owners |
| 18 | Live sweep: `pnpm audit`, TLS/headers/CSP/CORS probes, git-history gitleaks, smoke journeys | **Sonnet** runs; **Opus** interprets security findings; **Fable** go/no-go |

### Go/no-go (Fable)

Fable signs off only when: Stage 0 human items confirmed done, all Stage 2 security patches passed double-Opus review, Stage 3 applied, Stage 4 all green. Any red → back to the owning model. Final decision documented in the audit's §11 gate.

### Stage 5 — fast follow (post-launch, same routing)

Security items (21 audit fail-closed, 22 deletion/anonymization, 25 CMS sanitizer) → **Opus**. Everything else (20 auto-logoff, 23 CI gates, 24 CSP enforce, 26 perf budgets) → **Sonnet**. **Fable** prioritizes.

## 11. Execution log

**Stage 1 — DONE (2026-07-17).**
- Decision: Dev-nauman abandoned per owner ("had issues we don't want"); security fixes re-authored fresh, not merged.
- Release branch `release/go-live` cut off `main` (main already carries audit round 1+2, `1938f27d`).
- Audit report + review committed (`ee2b79ba`).
- Green baseline established: `prisma generate` OK · typecheck PASS · lint PASS (removed dead `publicAuthorityLinksWithTranslationsArgs`, `0b2aa632`) · backend build PASS · frontend build PASS (556 pages).
- Note: an untracked `go-live-execution-plan-2026-07-17.md` (16-line stub, likely concurrent session) left untouched.

**Stage 2 — IN PROGRESS.** Opus authors each security fix on `release/go-live`; Fable reviews each diff + verify chain before commit.

- **SEC-001 — DONE (`1f9e9ce2`).** `verifyGlobalAdminAccess` (ADMIN/SUPER_ADMIN only; LOCAL_ADMIN 403 at JWT-role + 401 at DB re-validation). Applied to country CRUD + doctor IBAN reveal. 10/10 tests, typecheck clean.
- **SEC-001b — NEW, OPEN (same Critical class, found during SEC-001).** These global/financial/user-admin routes still use the generic `verifyAdminAccess`; a LOCAL_ADMIN can reach cross-country data through them. Triage each: global → `verifyGlobalAdminAccess`; country-scoped → add country predicate. Routes: `admin-payout-invoices.route.ts:33,71`, `admin-invoices.route.ts:71,266,440,498,539`, `admin-users.route.ts:89`, `admin-reports.route.ts:78`, `admin-audit-log.route.ts:87`, `admin-security-alerts.route.ts:17,58`, `admin-settings.route.ts:17`, `admin-subscription-health.route.ts:14`, `admin-automation.route.ts:22`.
- **SEC-002 — DONE (`033987e9`).** Guard on all doctor PHI reads (notes, history, generated docs list+PDF, chat read+download), fail-closed 403.
- **SEC-005 — DONE (`a2c313db`).** Prod boot refuses relaxed/shadow PHI config. **Deploy dependency:** Railway prod must set `COMPLIANCE_MODE=strict`, `MEDICAL_ACCESS_ENFORCE=true`, `ADMIN_PHI_REQUIRE_REASON=true`, `REQUIRE_2FA_FOR_ROLES=SUPER_ADMIN,ADMIN,LOCAL_ADMIN,DOCTOR` or backend won't boot.
- **PRIV-001 — DONE (`d6584699`).** Stripe no longer receives appointment notes/PHI (both `payments.route` and `manual-booking.service`); WhatsApp fails closed on null consent.
  - **FLAG for legal/product:** `PatientProfile.patientWhatsappConsent` is `Boolean @default(true)` — consent defaults GRANTED (opt-out, not affirmative opt-in). The audit's "affirmative consent" intent needs a schema default change to `false` + a consent-capture UI. That's a product/legal decision, NOT made here.

### Stage 2 remaining — BLOCKED on decisions/human input

- **SEC-004 (HS256 removal)** — code-ready to author, but removing the fallback invalidates all existing HS256-signed sessions (mass logout) and MUST NOT deploy before Stage 0 item 6 (Railway `AUTH_JWT_PRIVATE_KEY`/`PUBLIC_KEY`) is live, or the backend can't verify anything. Needs: confirm keys set, agree the logout cutover window.
- **SEC-006 (capability token hashing)** — requires a DB migration (hash existing `uploadToken`/share/consent tokens, add columns) applied via `migrate deploy` (repo's `migrate dev` is broken). Needs: approval to author the migration + a plan for in-flight tokens (invalidate vs backfill-hash).
- **SEC-001b** — needs product knowledge to classify each of the ~10 routes as global vs country-scoped before wiring the right gate.

## Decision

NO-GO confirmed. The audit under-states risk if anything: deployment-state chaos (item 13) and absent backups (17) are launch blockers in their own right, independent of the code findings.
