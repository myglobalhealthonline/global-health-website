# Security Tooling Audit — Master Report

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch:** `Dev-hassaan`
**Audit mode:** A 7-phase scanner build-out and authorization audit, per the plan in this session. Consolidates six phase reports in this directory. No production deployment occurred; all changes are source, CI configuration, and test/tooling additions.

## Executive Summary

This was a from-scratch build of a security scanning programme for a repo that, going in, had real CI maturity (CodeQL, gitleaks, Dependabot, SBOM, lockfile-drift gates) but three concrete gaps: a dependency-audit gate that was silently inert, no static analysis targeting this codebase's specific authorization patterns, and zero authorization testing despite `SECURITY_AUDIT2.md` documenting five production-blocking findings that were all broken-authorization bugs — exactly the category no generic scanner catches.

**What this audit found, net new:**
- **2 dependency CVEs**, fixed (brace-expansion, sanitize-html — both one patch version behind their actual fix)
- **3 High-severity authorization gaps** (S-031, S-032, S-033) found — routes that read PHI with zero call to the central medical-access guard, the exact defect class the prior audit's S-005 finding described. **Remediated 2026-08-02**: S-031 partially fixed (single-invoice read guarded; the bulk tax-ID search audit-logged instead, since the guard isn't built for fan-out reads), S-032 fully fixed (one guard call covers all 4 PHI reads), S-033 reclassified as a Semgrep false positive (public capability-token flow, no session-bound actor to guard). See `audit-authz-rules-2026-08-02.md` for the per-finding resolution detail.
- **2 Low-severity architectural-consistency gaps** (S-034, S-035)
- **1 Critical CVE in the container's bundled npm tooling** (not this repo's own dependencies) and confirmation that ~160 Debian OS-layer CVEs on the current base image have no upstream fix yet
- **Confirmation from a live, external DAST pass** that the CSP gap already on record (`S-CSP`) is still present on staging
- **A genuinely important correction to this audit's own starting premise**: `pnpm audit`'s registry endpoints are not actually broken — tested directly, with and without the `--ignore-registry-errors` flag. The stated reason for that flag no longer holds; comments were corrected rather than left misleading
- **A significant, reproducible tooling bug**: Semgrep 1.172.0's `pattern-not-inside` rules give different (and sometimes wrong, in both directions) results depending on whether files are scanned individually or in a multi-file batch. Every custom rule in this repo is now validated per-file specifically because of this; CI is wired the same way
- **All 880 pre-existing backend tests pass against a real database** — the "17 failures" visible throughout Phases 1–4 were 100% this session's sandbox having no container runtime, not a real defect; confirmed via `git stash` against the pristine baseline

## Environment note carried through every phase

This session had **no Docker or container runtime** available (established in Phase 0). Every phase that needed one worked around it with a native, verified-equivalent substitute rather than skip the work: Homebrew-installed Semgrep/Trivy/OSV-Scanner/Postgres 16, and a downloaded-and-checksummed OWASP ZAP distribution for Phase 6. Where this required a real engineering trade-off (Docker-image scanning in Phase 2, the E2E CI job in Phase 5), it is called out explicitly in that phase's own report — nothing here claims verification that didn't happen.

## Phase-by-Phase Summary

| Phase | Report | Outcome |
|---|---|---|
| 0 — Baseline | `tooling-images-2026-08-02.md` | Tool versions pinned; CodeQL licensing on this private repo flagged as **unresolved**, needs manual GitHub UI check |
| 1 — SCA (OSV-Scanner) | `audit-sca-osv-2026-08-02.md` | 2 CVEs found and fixed; `pnpm audit`'s "broken registry" premise found to be stale and corrected; CI gate added, gate-tested with a planted vulnerable dependency |
| 2 — Container (Trivy) | `audit-container-trivy-2026-08-02.md` | 1 Critical CVE in bundled npm tooling (not app deps); ~160 unfixable OS CVEs; S-001's old credential confirmed removed from current code (rotation status still needs your confirmation — S-030) |
| 3 — SAST (Semgrep, generic) | `audit-sast-semgrep-2026-08-02.md` | 16→1 findings after triage; 2 real fixes; found and documented that Semgrep's own re-scans don't reliably enumerate every instance of a pattern |
| 4 — SAST (custom authz rules) | `audit-authz-rules-2026-08-02.md` | 5 repo-specific rules; **3 confirmed High findings** (S-031/032/033); found and worked around the multi-file batch bug |
| 5 — Authorization matrix | `audit-authz-matrix-2026-08-02.md` | Real integration tests against a live Postgres; all 6 roles seeded; cross-tenant IDOR, session invalidation, and PHI audit trail all verified working; S-032 originally encoded as a `.todo()` regression test, now real and passing (fixed 2026-08-02) |
| 6 — DAST (ZAP, passive) | `audit-dast-zap-2026-08-02.md` | Zero High/Critical from live external scan; confirms CSP gap already on record; 1 confirmed false positive identified and explained |

## Consolidated Findings

Finding numbering continued from `SECURITY_AUDIT2.md`'s last-used ID (S-027) at the start of this session. Two IDs from Phase 3 (`S-028c`, `S-028d`) share the S-028 root with Phase 1's SCA finding because they were identified while that finding was still the most recent — see each phase's own report for the precise distinction; they are not duplicates.

### Fixed in this session

- **S-028 / S-028a-b** (High — Phase 1): `brace-expansion` and `sanitize-html` dependency overrides pinned one patch version behind their actual CVE fixes. Fixed; mirrored across all 3 `package.json` files per this repo's own override-mirroring convention.
- **S-028c** (Low — Phase 3): PHI decrypt path relied on Node's implicit default GCM auth-tag length rather than an explicit value. Fixed (no behavior change — the default already matched).

### Fixed in the 2026-08-02 remediation pass

- **S-031** (High, **partially fixed**): `admin-invoices.route.ts` — the single-invoice read (`GET /api/admin/invoices/:invoiceId`) is now wrapped in `guardMedicalRead` (`resourceType: "SENSITIVE_PROFILE"`). The 200-row fan-out tax-ID *search* (`GET /api/admin/invoices`) is not guarded per-row — the guard is a one-resource-at-a-time check, wrong tool for bulk search — instead the search itself is now audit-logged via a new `AuditAction.PATIENT_TAX_ID_SEARCHED` value (additive migration), recording the actor and search-term length only. `admin-patient-profile.route.ts:399`'s identical unguarded-search pattern was flagged as a follow-up and has since also been fixed the same way.
- **S-032** (High, **fixed**): `doctor-patient-documents.route.ts` — one `guardMedicalRead` call, placed right after the existing `patientProfile` lookup, now covers all 4 PHI reads that follow. The regression test that was `.todo()` in `authz-matrix.test.ts` is now real and passing (plus 4 more covering the audit-log write and the `ADMIN_PHI_REQUIRE_REASON` break-glass path).
- **S-033** (High → **reclassified as false positive**): `patient-upload.route.ts` — both flagged lines are inside the public `/api/public/patient-upload` capability-token flow (`verifyPatientUploadToken`), not a session-authenticated route. There is no `GuardActor` to construct — the single-use token is the authorization mechanism here, structurally different from what `gh-phi-route-missing-guard` checks for. Suppressed with `// nosemgrep` + a written reason on both lines; no logic changed.

Verification for all three: 891 backend tests pass (0 failures, 0 todo, up from 887), `pnpm typecheck`/`pnpm lint` clean, the new migration applies cleanly and in isolation (`prisma migrate deploy`, no unrelated schema drift bundled), and `gh-phi-route-missing-guard` re-scanned clean per-file on all 3 files.

### Confirmed, NOT fixed — deliberately deferred, separate pass

- **S-034** (Low): `chat.route.ts`'s admin surface manually reimplements admin-checking instead of using the centralized `verifyAdminAccess`/`verifyGlobalAdminAccess`. Not an open door (session validity is re-verified), but bypasses centralized hardening.
- **S-035** (Low): `services.route.ts` resolves caller identity via raw `verifyAuthToken` (no `tokenVersion` re-check) to gate corporate-service visibility — narrow, view-only exposure window after a session should have been invalidated.

### Needs your confirmation, not resolvable from source alone

- **S-030** (Phase 2): The `Make.com` webhook credential (`SECURITY_AUDIT2.md` finding, prior session) is confirmed removed from current source — the code now reads strictly from an environment variable with a fail-closed default and host allowlist. **Whether the actual token was rotated on Make.com's dashboard could not be verified from this session** — the old value is still in git history (unrewritten) and remains usable if never rotated.

### Tracked, no source action needed right now

- **S-029** (Critical, container layer): `tar@7.5.11` bundled inside npm's own tooling in the `node:22-bookworm-slim` base image (CVE-2026-59873, fixed at 7.5.19). Not this repo's own dependency — tracked via the new `container-scan` CI job, which rebuilds on every push and will catch it clearing on a routine base-image refresh.
- CSP gap (`S-CSP`, prior session) — reconfirmed live via Phase 6's external DAST pass; no new information, just independent confirmation it's still open.

## New CI Gates (all `continue-on-error: true`, matching this repo's own established rollout convention for a job not yet confirmed clean in real GitHub Actions)

| Job | What it gates | Local verification performed |
|---|---|---|
| `sca-osv` | Dependency CVEs, all 3 lockfiles | Full local run; gate-tested with a planted vulnerable package, then reverted |
| `container-scan` | Image + Dockerfile/compose misconfig | Base-image scan verified locally (no Docker to build+scan the actual multi-stage image — see Phase 2's own caveat) |
| `sast-semgrep` | Generic SAST, PR-baselined | Full local run, gate-tested with a planted XSS pattern |
| `sast-authz-rules` | The 5 custom authorization rules | Full local per-file corpus validation across all 138 route files (see the multi-file batch bug note below) |
| `e2e-authz` | Playwright cross-portal boundary checks | Config/fixture-only validation (`playwright test --list`) — **could not stand up a live frontend+backend+DB stack simultaneously to dry-run this one**; the single least-verified gate in this entire programme |

**None of these have been flipped to `continue-on-error: false`.** That requires an actual green run in GitHub Actions, which this session had no way to produce — flipping it based on local-only testing would risk breaking your CI on a real environment difference (Ubuntu runner vs. this session's macOS host) this session couldn't detect. Once you see a clean run for a given job in Actions, flip that one job's flag.

## A tooling bug worth remembering: Semgrep multi-file batches

Every custom rule in `.semgrep/rules/` uses `pattern-not-inside`. Scanning many files in one Semgrep invocation was found, repeatedly and reproducibly, to give different — and sometimes simply wrong — results than scanning the same files one at a time. This was narrowed down (ruled out: metavariable name collisions, stdout/stderr mixing, disk caching, thread count) but not fully root-caused inside Semgrep 1.172.0 itself. Every corpus validation in Phase 4, and the `sast-authz-rules` CI job, loops per file specifically because of this. Anyone adding a new `pattern-not-inside` rule to this ruleset should validate it the same way — a passing multi-file batch run is not proof of correctness with this tool version.

## Recommended Security Baseline (unchanged from the prior audit, still current)

- **Authorization:** every PHI read goes through `guardMedicalRead`/`guardMedicalReadForAppointment`; every clinical read scopes by `doctorId`; every admin route calls a recognized gate — all four now have a permanent Semgrep check.
- **Sessions:** `tokenVersion` re-verification on every request that isn't pure audit-attribution — confirmed working end-to-end in Phase 5, and now has a permanent Semgrep check for the raw-token-as-authorization anti-pattern.
- **Dependencies:** OSV-Scanner as the registry-independent SCA gate; mirror every override across all 3 `package.json` files; treat `pnpm audit`'s current "working" status as a fact to re-verify periodically, not assume permanent.
- **Containers:** Trivy on every push; accept the current ~160 unfixed Debian CVEs as tracked, not actionable, background risk; watch for the bundled-npm-tooling Critical to clear on a routine rebuild.
- **DAST:** passive-only was performed; an active scan against non-destructive endpoints remains available as a future step, gated on its own separate go-ahead given the different risk profile of sending attack payloads.

## What to do next, in priority order

1. Confirm the Make.com webhook token (S-030) was actually rotated, or rotate it now.
2. ~~Fix S-031/S-032/S-033~~ — done 2026-08-02 (S-031 partial, S-032 fixed, S-033 reclassified; `admin-patient-profile.route.ts`'s identical search pattern fixed too; see above).
3. Verify CodeQL's actual licensing status on this private repo (Phase 0's open item) — this determines whether `sast-semgrep`'s ruleset should be narrowed to avoid duplicate coverage.
4. Get the `e2e-authz` CI job to run green once in real Actions, then flip its `continue-on-error`; do the same for each other new job as it's confirmed.
5. Add `Secure` to the `gh_locale` cookie (Phase 6, trivial, no functional impact).
6. Post-deploy: re-run `list-phi-denials.ts` against production after the S-031/S-032 fixes ship, watching for `isAbnormal=true` rows tied to the 3 routes touched, for a short monitoring window.
