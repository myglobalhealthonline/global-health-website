# Security Scanning — Ops Runbook

Operational reference for the scanner suite added 2026-08-02: OSV-Scanner (SCA),
Trivy (container), Semgrep (generic SAST + 5 repo-specific authorization
rules), the backend/E2E authorization test matrix, and OWASP ZAP (DAST). The
application code is mostly unaffected; the fragile part is running these
locally the same way CI does, and knowing what to do when one flags something.

> Related: `docs/audits/security/security-tooling-audit-2026-08-02.md` (the
> consolidated findings this tooling produced), and the six per-phase reports
> in the same directory (`audit-sca-osv-*`, `audit-container-trivy-*`,
> `audit-sast-semgrep-*`, `audit-authz-rules-*`, `audit-authz-matrix-*`,
> `audit-dast-zap-*`). Findings referenced below (S-028 onward) map to those
> reports' finding register, continued from `SECURITY_AUDIT2.md`'s S-027.

---

## 1. Local tool versions

No Docker was available when this suite was built, so every tool is a native
Homebrew (or, for ZAP, an official checksummed download) install rather than
the originally-planned pinned container image. Match these exactly when
reproducing a result:

| Tool | Version | Install |
|---|---|---|
| Semgrep | 1.172.0 | `pip install semgrep==1.172.0` (matches CI) or `brew install semgrep` |
| Trivy | 0.72.0 | `brew install trivy` |
| OSV-Scanner | 2.4.0 | `brew install osv-scanner` |
| Postgres | 16.x | `brew install postgresql@16` — needed for the backend authz matrix; see §4 |
| OWASP ZAP | 2.17.0 | Official cross-platform zip from `github.com/zaproxy/zaproxy/releases` — **verify the SHA-256 on the release page before extracting**, this is executable software |
| OpenJDK | 21 | `brew install openjdk@21` — required by ZAP only |

## 2. Running each scanner locally

**SCA (OSV-Scanner)** — one recursive pass covers all 3 lockfiles:
```bash
osv-scanner scan source -r . --format json --output-file tmp/security/osv.json
```

**Container (Trivy)** — three passes; base-image scan works without Docker,
the actual built-image scan needs it:
```bash
trivy config .                                  # Dockerfile/compose misconfig
trivy image --ignore-unfixed node:22-bookworm-slim   # base layer (proxy for the real image if no Docker)
trivy fs --scanners secret .                    # filesystem secret scan
```

**SAST, generic rules:**
```bash
semgrep --config p/typescript --config p/nodejs --config p/owasp-top-ten \
  --config p/secrets --config p/javascript backend/src frontend
```

**SAST, custom authorization rules — per-file, not a directory batch:**
```bash
for f in backend/src/routes/*.route.ts; do
  semgrep --config .semgrep/rules/ --error --quiet "$f" || echo "FAILED: $f"
done
```
**Do not** run `semgrep --config .semgrep/rules/ backend/src/routes/*.route.ts`
as a single multi-file call — this was found to produce wrong results (both
false positives and false negatives) with these specific `pattern-not-inside`
rules in Semgrep 1.172.0. Validate any new rule you add the same way: per-file,
and re-confirm results are stable across repeated single-file runs before
trusting a multi-file batch from this tool version.

**Fixture tests for the custom rules:**
```bash
for f in .semgrep/tests/*.ts; do
  semgrep --test --config ".semgrep/rules/$(basename "$f" .ts).yaml" "$f"
done
```

## 3. Suppressing a false positive

Every suppression in this codebase states a specific, site-level reason —
never a bare disable. Follow this exact shape:

```ts
// nosemgrep: <rule-id> -- <one-sentence reason: which of the recognized
// exceptions applies (self-service scoping / guard-input management /
// narrow ID-resolution / token-scoped public / documented architectural
// exception), and why>
```

**Placement is exact**, not "somewhere nearby" — the comment must sit on the
line immediately before Semgrep's *reported* line, not the enclosing
statement. Re-run the scan after adding a suppression to confirm it actually
took effect; several suppressions during this build silently failed because
the comment landed one statement too early (see `audit-sast-semgrep-*.md`
and `audit-authz-rules-*.md` for the exact failure modes).

If the flagged line is inside a template literal (a string body, not real
code), an inline comment there becomes literal output, not a suppression —
this happened once (`confidentiality-pdf.ts`) and was handled via
`--baseline-commit` in CI instead of forcing a broken suppression.

## 4. Running the backend authorization matrix

Needs a real Postgres — the test-guard (`backend/src/test-guard.ts`) refuses
to run against anything that isn't `localhost`/`127.0.0.1`/`postgres` or a
database name containing "test"/"shadow". **Never set `ALLOW_LIVE_DB_TESTS=1`
for normal use.**

```bash
brew services start postgresql@16   # or: pg_ctl -D <datadir> -o "-p 5433" start
createdb -p 5433 global_health_test
cd backend
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.test --import tsx --import ./src/test-guard.ts \
  --experimental-test-module-mocks --test "src/**/*.test.ts"
```

`backend/.env.test` sets `COMPLIANCE_MODE=relaxed`, which defaults
`MEDICAL_ACCESS_ENFORCE` to shadow mode (denials logged, never blocking). Any
test asserting the guard's actual allow/deny decision must force
`env.MEDICAL_ACCESS_ENFORCE = true` at runtime (the module is a plain mutable
object, not frozen — `medical-access-guard.test.ts` and
`authz-matrix.test.ts` both do this, restoring the original value in
`after()`) — otherwise the test passes regardless of the real authorization
outcome.

## 5. Seeding all 6 roles for manual/E2E testing

```bash
cd backend
SEED_DOCTOR_PASSWORD='...' SEED_PATIENT_PASSWORD='...' \
SEED_SUPER_ADMIN_PASSWORD='...' SEED_ADMIN_PASSWORD='...' \
SEED_LOCAL_ADMIN_PASSWORD='...' SEED_CORPORATE_ADMIN_PASSWORD='...' \
SEED_DOCTOR2_PASSWORD='...' SEED_PATIENT2_PASSWORD='...' \
node --env-file=.env.test --import tsx scripts/seed-test-accounts.ts
```
All 8 passwords are required and must be pairwise distinct. Idempotent —
re-running updates passwords/roles on the same rows rather than duplicating.
Creates two countries if none exist (a fresh test database has zero rows in
`Country` — there is no generic base-data seed script in this repo).

## 6. Running DAST (ZAP) against staging

**Go/no-go rule:** never run this against production, and never run it
without first confirming the target's database and object storage are
separate from production with no real patient data — this was an explicit,
user-confirmed precondition before Phase 6 ran at all.

```bash
cd /path/to/ZAP_2.17.0
./zap.sh -cmd -autorun path/to/passive-plan.yaml -silent
```
Passive-only (spider + `passiveScan-wait`, no `activeScan` job) is the
default posture. An active scan sends deliberate attack payloads and needs
its own separate go-ahead plus its own exclusion-list review — do not
upgrade a passive plan to active without re-confirming the safety gate.

## 7. Updating pinned tool versions

Bump the version in this file's §1 table, re-run the local commands above to
confirm nothing regressed, then update the matching `pip install semgrep==...`
/ formula references in `.github/workflows/ci.yml`.
