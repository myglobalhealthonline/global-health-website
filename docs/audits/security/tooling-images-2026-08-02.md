# Security Scanning — Tooling Baseline

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch / commit:** `Dev-hassaan` @ `78921defaef19839d0c497c9e0fcfaa0c9281b15`
**Audit mode:** Tooling setup for the phased security scanning programme. No application code changed.

## Deviation from the original plan

The plan called for pinned Docker images. No container runtime (Docker Desktop, OrbStack, colima, podman) is installed on this host and none could be provisioned in this session. Homebrew has current bottled formulae for all three core scanners, so native brew-installed binaries are used instead, with **exact version pins recorded here** in place of image digests. Re-pull/upgrade only by re-running this doc's install commands and updating the versions below.

## Tool versions installed

| Tool | Version | Install command |
|---|---|---|
| Semgrep | 1.172.0 | `brew install semgrep` |
| Trivy | 0.72.0 | `brew install trivy` |
| OSV-Scanner | 2.4.0 (osv-scalibr 0.4.5) | `brew install osv-scanner` |

OWASP ZAP (Phase 6, gated) not yet installed — deferred until the Phase 6 safety gate is evaluated.

## CodeQL licensing status — UNRESOLVED, needs manual confirmation

`myglobalhealthonline/global-health-website` is a **private** repository. GitHub's CodeQL analysis engine is proprietary for private repos and requires GitHub Advanced Security / Code Security to be enabled on the repo; the free tier covers public repos only. `.github/workflows/codeql.yml` declares `security-events: write` to upload SARIF, which only succeeds if Code Security is actually enabled.

**This could not be verified in this session** — no `gh` CLI auth and no browser access to the repo's Security tab or Actions run history.

**Action needed from you:** check `Settings → Code security` and the `Security` tab's Code scanning alerts on GitHub for this repo, or the Actions run history for `codeql.yml`, and confirm whether runs are succeeding or failing on SARIF upload.

**Working assumption until confirmed:** Semgrep is treated as the **primary** SAST tool (full ruleset, not narrowed) for Phase 3, since a failing/inert CodeQL would otherwise be the only SAST in the pipeline. If you confirm CodeQL is licensed and green, Phase 3's ruleset should be narrowed to avoid duplicate findings — noted in that phase's report.

## Output convention

Scanner output (SARIF/JSON) goes to `tmp/security/` — already covered by the root-anchored `/tmp` rule in `.gitignore`. Added `*.sarif` as a repo-wide backstop in case a tool writes output outside `tmp/`.

## Docs location note

The plan referenced `docs/security/`. On `Dev-hassaan` the docs tree was reorganized: security audits actually live under `docs/audits/security/`, indexed from `docs/README.md`. This and all subsequent phase reports use the real path, `docs/audits/security/`.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `git checkout Dev-hassaan && git rev-parse HEAD` | Pass | SHA recorded above |
| `docker version` | Finding | No Docker/container runtime available on host |
| `brew install semgrep trivy osv-scanner` | Pass | All three installed cleanly, versions recorded above |
| Path verification against plan (`docs/security/`, key guard/route files) | Finding | `docs/security/` does not exist on `Dev-hassaan`; real path is `docs/audits/security/`. Guard/route/script files referenced in the plan all confirmed present. |
| CodeQL Security-tab / Actions-history check | Blocked | No `gh` auth, no browser access this session — needs manual check |
