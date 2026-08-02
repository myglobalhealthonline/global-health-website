# Software Composition Analysis — OSV-Scanner

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch / commit (start):** `Dev-hassaan` @ `78921defaef19839d0c497c9e0fcfaa0c9281b15`
**Tool:** OSV-Scanner 2.4.0 (osv-scalibr 0.4.5), brew-installed — see `tooling-images-2026-08-02.md`
**Audit mode:** Dependency vulnerability scan + remediation. Application code untouched; three `package.json` files and their lockfiles updated.

## Executive Summary

Scanned all three pnpm lockfiles that matter for this repo — root, `frontend/`, `backend/` — with OSV-Scanner, which reads lockfiles directly against the OSV database rather than depending on npm's registry audit endpoints.

**Two real, current findings, both fixed:**

1. **S-028a** — `brace-expansion` override pinned the 1.x line to `1.1.16`, one patch below the actual fix (`1.1.17`) for GHSA-mh99-v99m-4gvg. The repo's own `//auditConfig` comment asserted 1.1.16 already carried the 1.x fix — that assertion was incorrect per the advisory's current per-major-line ranges, and the CI-level suppression (`ignoreGhsas`) was masking it. Bumped to `1.1.17`; suppression removed.
2. **S-028b** — `sanitize-html` resolved to `2.17.4`, vulnerable to GHSA-vccv-cmxp-4j9h (incomplete URI scheme validation — `javascript:` URIs pass through `action`/`formaction`/`data`/`poster`/`background` attributes). The existing override range (`^2.17.4`) already permitted the fixed `2.17.5`; a plain reinstall picked it up. **Only found in the `backend` lockfile** — worth noting since `sanitize-html` is a direct dependency of both frontend and backend, but only backend's resolution graph pulled the vulnerable exact version.

**A significant correction to the stated premise of this whole audit programme:** `pnpm audit`'s npm registry endpoints are **not currently broken**. The `--ignore-registry-errors` flag and its accompanying CI comments (claiming the npm audit endpoints return HTTP 410) describe a state that no longer holds — verified by running `pnpm audit` with and without the flag in this session; both completed and returned real results. The gate wasn't blind to a dead endpoint; it was correctly not flagging S-028a because of the explicit `ignoreGhsas` suppression, and not flagging S-028b at the root/frontend audit scope because `pnpm audit --audit-level=high` filters out moderate-severity findings by design (backend's own `--ignore-workspace` audit did surface it as moderate). CI comments corrected to reflect current reality; the flag is kept as a defensive no-op, not removed, since a future registry outage is still possible.

OSV-Scanner is added regardless, because it is a genuinely independent second opinion (separate vulnerability database, zero dependency on npm's registry) — not because the existing gate was inert.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `osv-scanner scan source -L pnpm-lock.yaml` (root) | Finding | 1 vuln: brace-expansion GHSA-mh99-v99m-4gvg |
| `osv-scanner scan source -L frontend/pnpm-lock.yaml` | Finding | Same brace-expansion finding |
| `osv-scanner scan source -L backend/pnpm-lock.yaml` | Finding | brace-expansion + sanitize-html GHSA-vccv-cmxp-4j9h |
| `pnpm audit --audit-level=high --ignore-registry-errors` (root, pre-fix) | Finding | Reachable; reported 1 high finding, suppressed by `ignoreGhsas` — confirms the registry is not the problem |
| `pnpm audit --audit-level=high` (root, no ignore-registry-errors flag) | Pass | Same result with or without the flag — endpoint is up |
| `cd backend && pnpm audit --audit-level=high --ignore-workspace` (pre-fix) | Finding | Surfaced sanitize-html as a moderate finding, invisible at root scope |
| Bumped `brace-expansion@1` override → `1.1.17`, removed `ignoreGhsas`, in root/frontend/backend `package.json` | Pass | Mirrored per `CLAUDE.md` |
| `pnpm install` (root) then `pnpm install --ignore-workspace` (frontend, backend) | Pass | Re-resolved all three lockfiles |
| Re-scan all three lockfiles with OSV-Scanner | Pass | 0 vulnerabilities, all three |
| `pnpm install --frozen-lockfile` (root) / `--frozen-lockfile --ignore-workspace` (frontend, backend) | Pass | Lockfiles internally consistent post-fix |
| `node scripts/check-override-drift.mjs` | Pass | Overrides still consistent across all three files |
| `pnpm typecheck` (frontend `tsc --noEmit` directly; backend via `pnpm typecheck`) | Pass | Frontend's `pnpm typecheck` script also runs a locale-key check that fails — **pre-existing on `Dev-hassaan`, confirmed via `git stash` before touching anything, unrelated to this change** |
| `pnpm lint` | Pass | One pre-existing unrelated warning (unused eslint-disable directive), 0 errors |
| **Gate test:** added `lodash@4.17.4` (10 known CVEs) as a frontend devDependency, reinstalled, re-scanned | Pass | OSV-Scanner detected all 10 GHSA IDs immediately; fully reverted afterward, confirmed no residue in package.json or lockfile diff |
| CI wiring: `sca-osv` job in `.github/workflows/ci.yml`, calling `google/osv-scanner-action` reusable workflow pinned to `9a498708959aeaef5ef730655706c5a1df1edbc2` (`v2.3.8`, resolved via `git ls-remote`, action source read directly) | Pass | `upload-sarif: false` — depends on GitHub Advanced Security, same open question as `codeql.yml` (see `tooling-images-2026-08-02.md`) |
| YAML validation (`ruby -ryaml`) | Pass | 8 jobs registered including `sca-osv` |

## Findings

### Finding S-028: Stale dependency-override pins let two CVEs into deployed lockfiles

- **Severity:** High (brace-expansion, DoS/OOM) + Moderate (sanitize-html, stored XSS via unsanitized URI schemes)
- **Category:** dependency management / SCA
- **Affected files:** `package.json`, `frontend/package.json`, `backend/package.json` (`pnpm.overrides`, `pnpm.auditConfig`); `pnpm-lock.yaml`, `frontend/pnpm-lock.yaml`, `backend/pnpm-lock.yaml`
- **Problem:** Two dependency pins were one patch version behind their actual fix, and one was actively suppressed in audit config based on an incorrect claim about which version carried the fix.
- **Why it is dangerous:** `sanitize-html` sanitizes user- or admin-authored rich content before rendering — GHSA-vccv-cmxp-4j9h allows `javascript:` URIs through `action`/`formaction`/`data`/`poster`/`background` attributes, i.e. a stored-XSS bypass in exactly the library this repo relies on for that job. `brace-expansion`'s DoS is lower severity (dev/build-time only per the current override comment) but was flagged High by the advisory itself.
- **Safe fix:** Bump `brace-expansion@1` override to `1.1.17`; drop the `ignoreGhsas` suppression since it's no longer needed; reinstall so `sanitize-html` resolves within its already-correct `^2.17.4` range to `2.17.5`+.
- **Difficulty:** Trivial (version bump + reinstall, no code changes, typecheck/lint verified clean)
- **Production urgency:** Should fix soon — sanitize-html's XSS bypass is the higher-value item; deploy on next release
- **Priority:** P1

## Recommended ongoing practice

- OSV-Scanner now runs in CI (`sca-osv` job) on every push/PR, recursively covering all three lockfiles in one pass.
- Any new override or suppression added to `pnpm.overrides` / `pnpm.auditConfig` should cite the exact advisory ID and the exact fixed version, not a paraphrase — the stale comment here was wrong specifically because it asserted a version number without re-deriving it from the advisory's current data.
- Re-verify the CodeQL/Code-Security licensing question (Phase 0, still open) — once resolved, either flip `sca-osv`'s `upload-sarif` to `true` or confirm `codeql.yml` truly needs no change.
