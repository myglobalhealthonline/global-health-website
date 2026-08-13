# SAST Baseline — Semgrep

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch:** `Dev-hassaan`
**Tool:** Semgrep 1.172.0, brew-installed — see `tooling-images-2026-08-02.md`
**Audit mode:** Static analysis + triage. Two code-level fixes applied; 15 false positives suppressed inline with documented reasons; CI wiring added.

## Executive Summary

Ran Semgrep's `p/typescript`, `p/nodejs`, `p/owasp-top-ten`, `p/secrets`, and `p/javascript` registry rulesets against `backend/src` and `frontend` — 147 rules, 1,763 files. This is a **generic calibration pass**, ahead of the repo-specific authorization rules planned for Phase 4.

**CodeQL licensing is still unresolved** (flagged in Phase 0 as needing manual GitHub UI verification) — this pass therefore ran the full ruleset rather than a narrowed one, on the working assumption that Semgrep may currently be the only functioning SAST tool on this private repo.

**First pass: 16 findings.** Triage:

- **2 real, fixed:**
  - `phi-crypto.ts` decrypt path called `createDecipheriv("aes-256-gcm", ...)` without an explicit `authTagLength`. Node's default (16 bytes) already matched this envelope's `TAG_BYTES` constant, so this changes nothing functionally — it just stops relying on an implicit default for a security-sensitive parameter. Verified via the existing `phi-crypto.test.ts` suite (6/6 pass).
  - `frontend/.npmrc` had no `min-release-age` setting. Added `min-release-age=7`, orthogonal to the existing `frozen-lockfile=false` (which is required for Railway's Root-Directory build and stays unchanged).
- **14 false positives, suppressed inline** with `// nosemgrep: <rule-id>` comments explaining the reasoning at each site (never a blanket rule disable):
  - **10× `direct-response-write`** — Fastify's typed `reply.send(stream)` / `reply.send(buffer)` / `reply.send(jsonObject)` streaming S3 objects or serializing JSON. This rule is tuned for Express's `res.write(userInput)` pattern and doesn't understand Fastify's typed, auto-content-negotiated `reply.send()`. Verified across every call site by reading the actual code — all stream/buffer S3 downloads or plain JSON objects, never a hand-built HTML string.
  - **1× `hardcoded-jwt-secret`** — a deliberate negative-test fixture in `auth-session.test.ts` proving a token forged with a legacy secret is rejected (`SEC-004`). Test-only, not a live credential.
  - **3× `react-dangerouslysetinnerhtml`** *(grew to 6 during triage — see below)* — every site traced to a named sanitizer (`sanitizeDoctorBioHtml`, `scopeBlogHtml`, `sanitizePageBodyHtml`), each independently confirmed to call `sanitize-html` with a controlled allowlist before rendering.
- **1 false positive, NOT suppressed** — `confidentiality-pdf.ts`: `raw-html-format` flags a line *inside a template literal*. Every interpolation on that line goes through the file's own `esc()` HTML-escaping helper, and the template has no URL/host-shaped field — but the flagged line is literal PDF-template text, so any `//` or `{/* */}` comment placed there becomes rendered output, not a suppression. **Carried forward via `--baseline-commit` on PRs instead** (see CI Wiring below) rather than forced into an unsafe location.

### A methodology note worth recording: triage is not a single pass

Re-running Semgrep after each suppression round repeatedly surfaced **new, previously-unflagged sibling findings** — the same vulnerable-shaped pattern in a different file, or even a second occurrence in the *same* file, that the first scan simply didn't report. This happened four times in a row (16 → 7 → 3 → 2 → 1 findings across five reruns), and separately, proactively grepping for every `dangerouslySetInnerHTML` site in the repo (14 total, only 2 initially flagged) surfaced 8 more that Semgrep never flagged in its own reruns at all. **Semgrep's own progressive re-surfacing is not exhaustive — it should not be trusted as a complete enumeration of a vulnerability shape.** The reliable method was to grep the codebase directly for the pattern family (every `reply.send(stream...)`/`reply.send(buffer)` call, every `dangerouslySetInnerHTML`) and manually confirm each one, rather than iterating on the tool's findings alone. Every site is now individually annotated, so this should not recur for these two rule families, but it is a reason to treat any future Semgrep-reported count as a floor, not a ceiling.

A second, unrelated lesson: `nosemgrep` comments must sit on the exact line immediately preceding Semgrep's *reported* line — not the enclosing statement, and never inside a multi-line call's opening line if the reported line is a continuation (e.g. `reply.send(\n  okResponse({` — the finding was on the `okResponse({` line, not `reply.send(`). Several suppressions initially failed silently (the finding just re-appeared at a shifted line number after inserting a comment in the wrong place) until each was re-verified against the tool's own reported line number.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `semgrep --config p/typescript --config p/nodejs --config p/owasp-top-ten --config p/secrets --config p/javascript backend/src frontend` (pass 1) | Finding | 16 findings |
| Fix `phi-crypto.ts` (explicit `authTagLength`) | Pass | `phi-crypto.test.ts` 6/6 pass |
| Fix `frontend/.npmrc` (`min-release-age=7`) | Pass | Orthogonal to existing `frozen-lockfile=false` |
| Suppress 10× `direct-response-write` + 1× `hardcoded-jwt-secret` + 2× `dangerouslySetInnerHTML` inline | — | First triage round |
| Re-scan (pass 2) | Finding | 7 findings — 5 suppressions had landed on the wrong line (adjacency), re-diagnosed and corrected |
| Re-scan (pass 3) | Finding | 3 findings — corrected placements took effect; 1 new sibling appeared (`admin-patient-profile.route.ts:845`, a second identical download endpoint) |
| Re-scan (pass 4) | Finding | 2 findings — 1 new sibling appeared (`blog-post-page.tsx`, the public-facing blog render, same `scopeBlogHtml` pattern) |
| Full repo grep: every `dangerouslySetInnerHTML` site (14 total) | Finding | 8 more sites found beyond what Semgrep had ever flagged; all traced to a verified sanitizer and suppressed proactively |
| Full repo grep: every `reply.send(stream\|streamToNodeReadable\|buffer)` site, pattern-vs-suppression count per file | Finding | 1 more sibling found in `account-profile.route.ts` (2 patterns, 1 suppression) |
| Re-scan (pass 5, final) | Pass | **1 finding** — only the accepted `confidentiality-pdf.ts` template-literal case remains |
| `phi-crypto.test.ts` (targeted) | Pass | 6/6 |
| `auth-session.test.ts` (targeted) | Pass | 2/2 |
| `pnpm --filter backend test` (full suite) | Pass (17 pre-existing failures) | 704 pass / 17 fail / 15 cancelled / 144 skipped — **identical count verified via `git stash` against the pristine baseline**; all 17 are DB-dependent integration tests (subscriptions, orders, plans, login-audit) failing because no test Postgres is reachable in this sandbox (no container runtime — see Phase 0). None relate to this phase's edits. |
| `pnpm --filter frontend test` | Pass | 313/313, 31 test files |
| `pnpm typecheck` (backend `tsc --noEmit`, frontend `tsc --noEmit` directly) | Pass | Frontend's `pnpm typecheck` wrapper still fails on the pre-existing, unrelated locale-key gate (confirmed pre-existing in Phase 1) |
| `pnpm lint` | Pass | 0 errors, 1 pre-existing unrelated warning |
| **Gate test:** planted `res.write("<div>" + userInput + "</div>")` in a scratch route file, staged with `git add` (untracked files are silently skipped by Semgrep's default `git ls-files` scan scope — confirmed and worked around) | Pass | Detected by 2 rules (`raw-html-format`, `direct-response-write`) as expected; file removed and unstaged afterward, no residue |
| **Gate test (negative control):** planted `eval(userInput)` — not detected by these 5 packs | Informational | Confirms this specific pack combination has no generic `eval` rule; not a harness failure (the harness correctly caught the `res.write` pattern moments later in the same file) |
| CI wiring: `sast-semgrep` job — plain `pip install semgrep==1.172.0` + CLI invocation (not a third-party action, to avoid any implicit Semgrep AppSec Platform login dependency) | Pass | `--baseline-commit` on PR events only (diffs against `github.event.pull_request.base.sha`); full scan on push. `continue-on-error: true` per house convention |
| CI action SHA check: initially used a guessed SHA for `actions/setup-python` — caught and corrected via `git ls-remote` before finalizing | Fixed | Resolved to `5fda3b95a4ea91299a34e894583c3862153e4b97` (`v7.0.0`) |
| YAML validation (`ruby -ryaml`) | Pass | 10 jobs registered including `sast-semgrep` |

## Findings

### Finding S-028c: GCM decrypt path relied on Node's implicit default tag length

- **Severity:** Low
- **Category:** cryptography / defense-in-depth
- **Affected files:** `backend/src/lib/crypto/phi-crypto.ts:75`
- **Problem:** `createDecipheriv("aes-256-gcm", k, iv)` omitted `authTagLength`, relying on Node's default matching the envelope's actual 16-byte tag.
- **Why it is dangerous:** Not currently exploitable (the default and the actual value match), but an implicit dependency on a runtime default for an authentication-tag length is fragile — a future Node major version changing that default, or code reuse in a context with a different tag size, would silently weaken authentication.
- **Safe fix:** Applied — explicit `{ authTagLength: TAG_BYTES }`.
- **Difficulty:** Trivial
- **Production urgency:** Low — already fixed
- **Priority:** P2

### Finding S-028d: `confidentiality-pdf.ts` false positive cannot be inline-suppressed

- **Severity:** Informational
- **Category:** tooling / SAST hygiene
- **Affected files:** `backend/src/modules/confidentiality/confidentiality-pdf.ts:86`
- **Problem:** The one surviving Semgrep finding is a confirmed false positive (every interpolation passes through the file's `esc()` escaper; the output renders to a server-side PDF, never navigable HTML) that cannot be suppressed with an inline `nosemgrep` comment, because the flagged line is inside a multi-line template literal — any comment placed there becomes literal PDF content rather than being recognized as a suppression.
- **Why it matters:** Without a suppression mechanism, this finding will appear in every future scan of this file, including in CI.
- **Safe fix:** Handled via `--baseline-commit` on PR-triggered CI runs (this finding predates any future PR, so it won't count as newly introduced). On `push` events (no PR base to diff against), it will still appear in scan output — this is intentional and documented in the CI job's comment, not a bug.
- **Difficulty:** N/A (accepted, structurally unsuppressible without restructuring the template)
- **Production urgency:** None
- **Priority:** P3

## Recommended ongoing practice

- `sast-semgrep` now runs in CI on every push/PR, `continue-on-error: true` until a clean run is confirmed in Actions (matches this repo's established rollout convention for new gates).
- When triaging a Semgrep finding as a false positive: suppress inline with `// nosemgrep: <rule-id>` **and a one-sentence reason**, placed on the exact line immediately before Semgrep's *reported* line (verify by re-running, not by assumption) — never blanket-disable a rule for a whole file or ruleset.
- When a rule-class produces one false positive, grep the codebase directly for the same pattern shape rather than relying on Semgrep's own iterative re-surfacing to find every instance — as this pass's methodology note describes, the tool does not reliably enumerate every occurrence of a pattern across successive runs.
- Revisit CodeQL licensing (Phase 0, still open) and narrow this ruleset if/once confirmed working, to reduce duplicate coverage.
