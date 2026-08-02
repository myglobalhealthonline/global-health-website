# Container / Filesystem Scan — Trivy

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch / commit:** `Dev-hassaan` @ working tree with Phase 1 changes applied (SCA fixes committed on top of `78921defaef19839d0c497c9e0fcfaa0c9281b15`)
**Tool:** Trivy 0.72.0, brew-installed — see `tooling-images-2026-08-02.md`
**Audit mode:** Container image / IaC / secret scanning. No application code changed in this phase; CI wiring added.

## Executive Summary

`frontend/Dockerfile` builds on `node:22-bookworm-slim`. This CVE class is invisible to every scanner wired so far — CodeQL, Dependabot, `pnpm audit`, and OSV-Scanner (Phase 1) all operate on source/lockfiles, not built images.

**Scope limitation, stated up front:** this session has no container runtime (no Docker/OrbStack/colima/podman — see `tooling-images-2026-08-02.md`). Trivy has its own registry client independent of a local daemon, so the **base image** (`node:22-bookworm-slim`) was scanned directly by reference. The **actual multi-stage build** (which layers `pnpm install`, the Next.js build, and the standalone output copy on top of that base) could not be built and scanned end-to-end locally. The final `runner` stage is `FROM node:22-bookworm-slim` with no additional OS packages installed, so the base-image scan is a representative proxy for the OS layer, but does not capture anything specific to the build/copy stages. The CI job added below builds and scans the real image on every push, on a runner that does have Docker — this gap only exists in this local audit pass.

**Findings:**

- **Base image OS layer:** 174 total vulnerabilities (72 LOW, 65 MEDIUM, 22 HIGH, 6 CRITICAL, 9 UNKNOWN). Of these, **160 have no upstream Debian fix available** — expected background noise for a Debian-slim base, not actionable today.
- **14 are genuinely fixable**, and all 14 are in **npm's own bundled tooling that ships inside the Node.js image itself** (`brace-expansion`, `picomatch`, `sigstore`, `tar` — vendored dependencies of the npm CLI, not this repo's application dependencies, which Phase 1 already covers separately). Includes **one CRITICAL**: `tar` 7.5.11 → fix 7.5.19 (CVE-2026-59873). Two of the fixable findings are the same `brace-expansion` advisory fixed in Phase 1 (CVE-2026-14257 / GHSA-mh99-v99m-4gvg) — coincidentally the same CVE, but this is a *separate* copy of the package bundled inside npm's own tooling in the base image, unrelated to this repo's `pnpm.overrides`.
- **Dockerfile config scan:** one LOW finding — no `HEALTHCHECK` instruction. Mitigated in practice by `frontend/railway.toml`'s external healthcheck (`/api/health`) at the platform level, but a container-level `HEALTHCHECK` is still good practice for local `docker run`/compose use.
- **`docker-compose.yml` config scan:** 0 findings — Trivy's compose-file detector did not recognize it as a scannable config in this version; the file only defines a loopback-bound, local-dev-only Postgres (already an explicit, documented security decision in the compose file's own comments).
- **Secret scan (filesystem, current working tree):** **0 secrets found.**
- **S-001 cross-check (Make.com webhook credential):** the prior audit (`SECURITY_AUDIT2.md` era) found a hard-coded webhook URL/token in tracked source, introduced in commit `e7dd6aa7`, with instructions to rotate before any history cleanup. Verified: **current `HEAD` no longer has a hardcoded fallback** — `backend/src/modules/invoices/generate-invoice.service.ts` now reads strictly from `process.env.MAKE_INVOICE_WEBHOOK_URL`, skips the webhook entirely if unset, and validates the resolved host against an explicit allowlist (`hook.eu1.make.com`) before firing. The code-level fix is real and confirmed. **The literal old credential string still exists in git history** at `e7dd6aa7` (history has not been rewritten) — **rotation status on Make.com's side cannot be verified from this session and needs your confirmation.**

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `trivy config .` | Finding | 1 LOW: `frontend/Dockerfile` missing `HEALTHCHECK` (DS-0026) |
| `trivy config docker-compose.yml` (explicit target) | Pass (no findings) | Compose file not recognized as a scannable config type by this Trivy version; not a coverage gap in practice — file only configures loopback-bound local dev Postgres |
| `trivy image node:22-bookworm-slim` | Finding | 174 total (6 CRITICAL / 22 HIGH / 65 MEDIUM / 72 LOW / 9 UNKNOWN) |
| `trivy image --ignore-unfixed node:22-bookworm-slim` | Finding | 14 fixable (1 CRITICAL / 5 HIGH / 8 MEDIUM), all in bundled npm tooling, not app deps |
| `trivy fs --scanners secret .` | Pass | 0 secrets in current working tree |
| Git history check: `git log --all \| grep e7dd6aa7`, `git show e7dd6aa7` | Finding (historical) | Confirmed the commit and the literal hard-coded webhook URL it introduced (value not reproduced in this report) |
| Current-source check: `grep MAKE_INVOICE_WEBHOOK_URL backend/src/modules/invoices/generate-invoice.service.ts` | Pass | No hardcoded fallback at current `HEAD`; env-var-only, fail-closed, host-allowlisted |
| **Gate test 1 (image):** `trivy image node:14-buster-slim` (deliberately EOL base) | Pass | 63 CRITICAL/HIGH found vs. 7 on the pinned current base — confirms the scanner's detection sensitivity is real, not a pass-through |
| **Gate test 2 (secrets):** planted a synthetic Stripe secret key + GitHub PAT in a scratch temp dir, scanned, reverted | Pass | Both detected (`stripe-secret-token`, `github-pat` rules); temp dir removed afterward, no residue in the repo |
| CI wiring: `container-scan` job in `.github/workflows/ci.yml` — `trivy-action` pinned to `ed142fd0673e97e23eac54620cfb913e5ce36c25` (`v0.36.0`, resolved via `git ls-remote` + reading `action.yaml` directly, not guessed) | Pass | Two steps: `config` scan (fail-closed, CRITICAL/HIGH), image build + `image` scan (`--ignore-unfixed`, CRITICAL/HIGH). `continue-on-error: true` on both per house convention — the image-build step could not be dry-run on this host |
| YAML validation (`ruby -ryaml`) | Pass | 9 jobs registered including `container-scan` |

## Findings

### Finding S-029: `tar` bundled in the Node.js base image has a Critical unpatched CVE

- **Severity:** Critical
- **Category:** container / supply chain
- **Affected files:** `frontend/Dockerfile` (all three `FROM node:22-bookworm-slim` stages); not a change to this repo's own dependency tree
- **Problem:** `tar@7.5.11`, bundled inside npm's own tooling in the `node:22-bookworm-slim` image, is vulnerable to CVE-2026-59873. Fix is `tar@7.5.19`.
- **Why it is dangerous:** This is inside the base image inherited by all three Dockerfile stages, including the final `runner` stage that ships to production, even though the runtime container never invokes `npm`/`tar` directly (`CMD ["sh", "-c", "exec node server.js"]`). Risk is latent/build-time-adjacent rather than directly exploitable at runtime, but it does widen the image's supply-chain surface.
- **Safe fix:** No Dockerfile change needed immediately — `node:22-bookworm-slim` is a floating tag; a routine rebuild against a newer patch release of the tag may already resolve this, since upstream Node.js periodically refreshes the bundled npm/tooling versions. Recommend the new `container-scan` CI job (which rebuilds on every push) as the actual detection mechanism, and revisiting `.trivyignore` if this specific CVE persists across several rebuilds without upstream movement.
- **Difficulty:** Trivial to low (rebuild / wait for upstream tag refresh; no source change)
- **Production urgency:** Should fix soon — track via the new CI gate rather than a one-off patch
- **Priority:** P1

### Finding S-030: Rotation status of the S-001 Make.com webhook credential is unconfirmed

- **Severity:** High (pending verification — could be Informational if already rotated)
- **Category:** secrets / third-party integration
- **Affected files:** git history at commit `e7dd6aa7` (value not reproduced here); current code at `backend/src/modules/invoices/generate-invoice.service.ts` confirmed already fixed
- **Problem:** The prior security audit found a live-looking Make.com webhook URL/token hard-coded as a fallback default. The application-level fix (env-var-only, fail-closed, host-allowlisted) is verified present at current `HEAD`. Whether the actual webhook token was rotated on Make.com's side cannot be determined from source alone.
- **Why it is dangerous:** If unrotated, anyone who can read the git history (any current or former collaborator, or a leaked clone) still has a working credential capable of receiving patient identity, address, tax/VAT, service, and payment/invoice data pushed to it, regardless of the code fix.
- **Safe fix:** Confirm in the Make.com dashboard whether the specific webhook token from that commit has been regenerated. If not, rotate it now and update the `MAKE_INVOICE_WEBHOOK_URL` environment variable in Railway.
- **Difficulty:** Trivial (dashboard action) — but requires you, not this session, since it needs Make.com account access
- **Production urgency:** Confirm before this audit programme is considered complete
- **Priority:** P0 (pending your confirmation — downgrade to closed once verified)

## Recommended ongoing practice

- `container-scan` now runs in CI on every push/PR, rebuilding the frontend production image and scanning both it and the Dockerfile/compose config.
- Both new Trivy steps run with `continue-on-error: true` per this repo's established convention for a gate that couldn't be fully dry-run locally (matches the `sbom` job's existing pattern) — **flip both to `false` once a clean run is confirmed in GitHub Actions.**
- `--ignore-unfixed` is applied only to the `image` scan, not `config` — Dockerfile/compose misconfigurations always have a fix (they're this repo's own files), so there's no equivalent "no upstream patch" excuse there.
- Confirm S-030 (webhook rotation) directly with Make.com; this is outside what any static analysis can verify.
