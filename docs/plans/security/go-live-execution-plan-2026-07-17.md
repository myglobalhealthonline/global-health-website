# Go-Live Execution Plan — 2026-07-17

Execution plan for the 26 ranked items in [go-live-audit-review-2026-07-17.md](../../audits/security/go-live-audit-review-2026-07-17.md) §9.

**Model roles**
- **Fable** — brain: orchestration, branch reconciliation decisions, reviewing every agent diff before commit, final go/no-go per phase.
- **Opus** — security work: all authz/auth/PHI/token/crypto code changes and security verification of them.
- **Sonnet 5** — execution hands: mechanical fixes, config, tests, migrations, CI, WCAG, monitoring wiring.
- **Human (Hassaan)** — anything requiring console/provider access: credential rotation, Railway settings, backups, legal signoff, approving `pnpm audit` disclosure.

Rule per task: agent implements → Opus security-reviews (for P0/P1 security diffs) → Fable reviews + commits → gate check.

---

## Phase 0 — Human-only, start today (no model can do these)

| # | Task | Owner | Done