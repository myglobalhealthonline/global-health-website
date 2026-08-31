# Global Health Website — agent notes

## CSS architecture (two files — know which one to edit)

Since 2026-07-08 the hand-authored CSS is split in two:

- `frontend/app/globals.css` — tokens, resets, PUBLIC site (`gh-*`, `gh2-*`) and
  anything shared. Imported once in the root layout → ships on every route.
- `frontend/app/portal.css` — authenticated-portal-only rules: `.gh-admin-*`,
  `.gh-doctor-*`, `.gh-portal-*`, `.lux-*` / `--lux-*` (Obsidian Ivory system).
  Imported ONLY by the `(admin)`, `(doctor)`, `(auth)` route-group layouts, so
  public visitors never download it.

Rules:
- Adding/editing a portal-only style → `portal.css`. Public or shared → `globals.css`.
- A selector must live in exactly ONE of the two files — never both.
- New glass/backdrop-filter classes must join the mobile fallback blocks
  (`@media (pointer: coarse)` and `@supports not (backdrop-filter)`) in the SAME
  file the class lives in — both files carry their own copy of those blocks.
- `@keyframes` used by both files stay in `globals.css`.

## UI primitives (Phase 2, responsive overhaul)

New dropdowns/popovers/dialogs/drawers — never hand-roll: use `AppMenu`
(dropdown/popover), `PortalDialog` (modal), `AppSheet`/`RecordDetailsDrawer`
(drawer/sheet). New list/table pages — never hand-write twin table+card
markup: use a `ColumnPriorityTable` config (`ResponsiveField` priority 1-4 +
drawer flag), which renders both the desktop table and the `PortalMobileCard`
fallback from one source. See `docs/design/responsive/handoff.md` for the full
migration history and `docs/design/responsive/shared/responsive-design-system-plan.md`
for the rules (z-token scale, height-axis tiers, theme fidelity).

## Agent workflow rules

- Subagent gating: mechanical fix → Sonnet agent directly. Unknown feasibility or
  architecture change → spawn an INVESTIGATION-ONLY agent first (report, no code
  changes), wait for user approval before any implementation agent.
- Status recaps ("what's left"): full list once per session; afterwards deltas only.
- End multi-step tasks with a proof line (hashes, tsc/test output), not a question.
- Next 16: the middleware convention file is `proxy.ts`, NOT `middleware.ts`.
  Check framework conventions before adding framework-level files.
- Heavy skills (full seo-audit crawl etc.): invoke only for genuinely full runs.
  Narrow verification/fix tasks get a plain instruction instead.

## Analytics / SEO services connected (2026-08-03)

No credentials here — handles only. The tooling finds its own tokens.

| Service | Handle | Notes |
| --- | --- | --- |
| Search Console | `sc-domain:myglobalhealth.online` | OAuth. **Token dies ~2026-08-10** — the consent screen is still in Testing, which caps refresh tokens at 7 days. Publish it to stop the weekly re-auth. |
| GA4 | property `547083375` | Data API enabled 2026-08-03. Consent-gated tag. The Docker build gap is fixed and `begin_booking`, `begin_checkout`, and `purchase` were verified in production on 2026-08-25. Historical data before that deployment cannot prove blog lead ROI; evaluate only post-2026-08-25 event volume. |
| CrUX + PageSpeed | API key | Key-based, so unaffected by the OAuth expiry. |
| openseo MCP | tool list | SERP, keywords, backlinks, site audit. Announces itself — nothing to configure. |

Config `~/.config/claude-seo/google-api.json` · scripts
`~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/` · check auth
with `py .../google_auth.py --check`.

Traps that have each cost a wasted round already:

- **`py`, never `python`** — `python` on PATH is a broken WindowsApps stub.
- **URL Inspection results nest `index_status.coverage_state`.** There is no
  top-level `verdict`; a flat read reports every row as UNKNOWN.
- **`--check` reporting `[OK]` proved nothing** until it was patched on
  2026-08-03 to actually attempt the refresh. It lives in the plugin
  marketplace, outside this repo, so a plugin update reverts it.
- **The plugin's "add the service account as Viewer" error is hardcoded** and
  fires on any 403. In practice it has meant a disabled API, not missing access.
  Call the API raw before acting on that message.
- **Grepping served HTML for `hreflang` returns zero** — it is emitted as
  camelCase `hrefLang`.
- Quotas: URL Inspection ~7.5 s/URL, 2,000/day. Indexing API 200/day and
  officially JobPosting/BroadcastEvent-only — do not mass-submit.

**SEO entry point: `seo/README.md`. Canonical SEO control file:
`docs/plans/seo-control-state.md`.** The country folders hold detailed, dated market
evidence; the control file alone holds current remediation status, the growth roadmap,
the indexation watchlist, deadlines and next actions. Other SEO status audits are
historical evidence unless this section identifies them as a current operating
document.
The current plain-language audit is
`docs/audits/seo/seo-roadmap-review-2026-08-25.html`; the active content-growth
execution rules are in `docs/plans/editorial-plan-2026-08-19.md` §7.

Two rules that override any older SEO document:

- Before starting an SEO remediation or growth batch, refresh the relevant
  OpenSEO/GSC data and verify live production behaviour. Historical audit counts
  are context, not the current source of truth.
- After every implemented/deployed SEO batch, update the ledger and roadmap in
  `seo-control-state.md` before starting the next batch.

Do not rerun the full ~1,000-page crawl per batch — it is for global technical
validation, periodic baselines, or post-sitewide-change only. Everything narrower
gets a focused OpenSEO/GSC pull plus a live production check.

`docs/plans/seo-indexation-plan-2026-07-28.md` is superseded as a status document
but its §2 design decisions and §5 "explicitly not doing" list are still binding.

## Dependency overrides

`pnpm.overrides` are NOT inherited by the deployed services (each builds
standalone with `--ignore-workspace`). Mirror every security pin into root,
`frontend/`, and `backend/` package.json. CI gate: `scripts/check-override-drift.mjs`.
See `docs/guides/dependency-overrides.md`.

## Security scanning (added 2026-08-02)

CI runs OSV-Scanner (SCA), Trivy (container), Semgrep (generic SAST +
`.semgrep/rules/`, 5 repo-specific authorization rules), and Playwright
(`e2e-authz`). Rules and fixtures live in `.semgrep/rules/` /
`.semgrep/tests/`. **Custom rules must be run per-file, never as one
multi-file batch** — that combination gives wrong results with this repo's
`pattern-not-inside` rules in Semgrep 1.172.0 (see
`docs/guides/security-scanning-runbook.md`). A suppression is always
`// nosemgrep: <rule-id> -- <specific reason>`, placed on the line
immediately before Semgrep's *reported* line — never a bare disable, and
never inside a template literal (the comment becomes literal output there).
`backend/src/routes/authz-matrix.test.ts` is the integration authorization
matrix; testing the medical-access guard's actual allow/deny decision
requires forcing `env.MEDICAL_ACCESS_ENFORCE = true` at runtime (`.env.test`
defaults to shadow mode). Full findings: `docs/audits/security/
security-tooling-audit-2026-08-02.md`. Runbook: `docs/guides/
security-scanning-runbook.md`.
