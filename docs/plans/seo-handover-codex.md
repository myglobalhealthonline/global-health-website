# SEO handover — Claude Code → Codex

**Written 2026-08-15.** For an agent picking up SEO work on this repo in Codex, with
no memory of the sessions that produced the current state.

Read this once, then work from `docs/plans/seo-control-state.md`. This file explains
what you are inheriting, what changes because the work moved to Codex, and what will
silently mislead you. It does **not** duplicate the ledger — where the two disagree,
the ledger wins on facts and this file wins on process.

---

## 1. Read these three, in this order

1. **`docs/plans/seo-control-state.md`** — the canonical SEO ledger, roadmap and
   indexation watchlist. ~5,600 lines. Every other SEO markdown in the repo is
   historical evidence and carries a header saying so. Start at §0 (operating rules),
   §5 (remediation ledger), §6 (indexation watchlist), §7 (roadmap), then §21.10 (the
   dated measurement calendar — the closest thing to a to-do list).
2. **`CLAUDE.md`, the SEO sections** — repo conventions. Codex does **not** read
   `CLAUDE.md` automatically. Section 4 below mirrors the parts that matter; read the
   file itself before trusting the mirror.
3. **`docs/plans/seo-indexation-plan-2026-07-28.md`** — superseded as a status
   document, but its §2 design decisions and §5 "explicitly not doing" list are still
   binding.

There is no Wave 4. As of 2026-08-15 the six-market program is **complete / monitor
exceptions**, and the next phase is scheduled measurement, not implementation. Do not
open a new batch because the roadmap looks quiet.

---

## 2. What changes when the work moves to Codex

### 2.1 Fix this first — the global `AGENTS.md` is for a different project

`~/.codex/AGENTS.md` currently contains instructions for a Django project called
**Nashaa Sports**. Codex loads it globally, so it applies to this repo and will
actively mislead you about stack, structure and conventions. This repo is Next.js 16 +
Fastify + Prisma, not Django.

Either scope that file to its own project, or add a repo-root `AGENTS.md` that
overrides it. A minimal one that makes this handover discoverable:

```markdown
# AGENTS.md

Next.js 16 (`frontend/`) + Fastify/Prisma (`backend/`) telemedicine platform.
Repo conventions live in `CLAUDE.md` — read it; it is not loaded automatically.

SEO work: read `docs/plans/seo-handover-codex.md` first, then
`docs/plans/seo-control-state.md` (canonical ledger).

The Next middleware convention file here is `proxy.ts`, NOT `middleware.ts`.
```

### 2.2 Capability delta — what you lose, and what replaces it

| Capability | In Claude Code | In Codex |
| --- | --- | --- |
| GSC Search Analytics, URL Inspection | `openseo` MCP | **Not configured.** Use the Python scripts (§2.3) or add an MCP entry |
| SERP / keyword / backlink data (DataForSEO) | `openseo` MCP | **Not configured.** Same options |
| SEO specialist subagents and skills (`seo-audit`, `seo-technical`, …) | `claude-seo` plugin | **Gone.** Their underlying Python scripts still exist on disk (§2.3) |
| Google APIs (GSC, GA4, CrUX, PageSpeed) | Plugin scripts + shared OAuth token | **Works** — plain Python, any process can run it (§2.3) |
| Everything repo-resident (ledger, redirects, `GONE_DOCTORS`, CI gate, sweep script) | — | **Unaffected.** This is most of the system |

The important line in that table is the last one. The durable parts of this SEO system
are files in this repo and a CI job, not agent tooling. What you lose is *research
convenience*, not the control surface.

### 2.3 Google API access — paths, and the one that expires

Credentials: `~/.config/claude-seo/` (`google-api.json`, `oauth-token.json`,
`client_secret.json`).
Scripts: `~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/` — plain
Python, runnable from Codex.

```bash
py ~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/google_auth.py --check
```

Four traps, each of which has already cost a wasted round:

- **`py`, never `python`.** `python` on PATH is a broken WindowsApps stub.
- **The OAuth consent screen is in Testing**, which caps refresh tokens at 7 days.
  The token was expected to die ~2026-08-10 and has been re-authed since. If GSC calls
  start failing, this is why. Publishing the consent screen ends the weekly re-auth.
- **`--check` reporting `[OK]` proved nothing** until it was patched on 2026-08-03 to
  actually attempt a refresh. The script lives in the Claude plugin marketplace,
  outside this repo, so a plugin update reverts the patch. If `--check` passes and
  calls still 401, re-read the script.
- **URL Inspection results nest `index_status.coverage_state`.** There is no top-level
  `verdict`; a flat read reports every row as UNKNOWN.

Two more, API-shaped: the plugin's "add the service account as Viewer" error is
hardcoded and fires on any 403 — in practice it has always meant a disabled API, so
call the API raw before acting on it. Quotas: URL Inspection ~7.5 s/URL and 2,000/day;
the Indexing API is 200/day and officially JobPosting/BroadcastEvent-only, so do not
mass-submit.

Handles (no credentials here): Search Console `sc-domain:myglobalhealth.online`, GA4
property `547083375`. GA4 is consent-gated and only has data for 2026-07-25 → 07-28 —
treat it as unusable for trend work until that is fixed.

---

## 3. The system you are inheriting, in files

| Thing | Where | Note |
| --- | --- | --- |
| Canonical ledger / roadmap / watchlist | `docs/plans/seo-control-state.md` | The one file that must stay current |
| Redirects (all 364 rules) | `frontend/next.config.ts` | Runs **before** middleware. Rule order matters — a broad rule above a precise one kills it |
| Middleware (410s, locale, headers) | `frontend/proxy.ts` | Next 16 convention here is `proxy.ts`, not `middleware.ts` |
| Permanently removed entities | `frontend/lib/seo/gone-content.ts` | `GONE_DOCTORS`; requires a `clickCost` and a named `approvedBy` per entry, enforced by lint |
| Sitemap | `frontend/app/sitemap.ts` | The section loop must stay last; `lastmod` must never be build time |
| Hreflang | `frontend/lib/seo/hreflang.ts`, `doctor-hreflang.ts` | Emitted as camelCase `hrefLang` — grepping served HTML for `hreflang` returns zero |
| Live production gate | `frontend/tests/unit/seo-live-urls.test.ts`, CI job `seo-live-urls` | Weekly cron + on merge to main + `workflow_dispatch`. Asserts no redirect ends in 404, every sitemap entry is a live indexable 200, every `GONE_DOCTORS` URL answers 410. Failure opens a GitHub issue labelled `seo-live-urls` |
| Ledger-vs-production sweep | `scripts/seo-ledger-sweep.py` | `py scripts/seo-ledger-sweep.py`. Read its attribution-rule header before trusting output |

---

## 4. Rules that override any older document

These are the ones that get violated by a fresh agent. They are not stylistic.

**Refresh before, update after.** Before starting an SEO remediation or growth batch,
refresh the relevant GSC data and verify live production behaviour — historical audit
counts are context, not truth. After every implemented or deployed batch, update the
ledger and roadmap in `seo-control-state.md` *before* starting the next batch.

**Do not rerun the ~1,000-page crawl per batch.** It is for global technical
validation, periodic baselines, or post-sitewide-change only. Everything narrower gets
a focused pull plus a live production check.

**Distinguish three states in every finding**: what production serves right now, what
Google has stored from its last crawl, and what an older audit recorded. They diverge
routinely, and conflating them is the main way stale work gets redone.

**A decision row needs a named human and a date, or it is not a decision.** A ledger
row marked as someone's decision reads as correct forever. One was fabricated once and
removed the same day; this rule is the scar.

**Redirected URLs cannot compete with their targets.** GSC attributes impressions and
clicks to a redirect *source* for weeks after the redirect lands. Before calling
legacy URLs duplicates, probe them: only the 200s are real. (§22 ran exactly this and
found zero duplicates across 282 URLs.)

**Do not report blended average position** while indexation is still expanding — it
measures how much got indexed, not how well anything ranks. Report segments (§22.2).

**Watch for corpus-assembly failures.** Seven times now, an instrument has run
correctly over a corpus assembled by a rule rather than observed, and the output was
read as evidence: synthesized honorific URL variants, a truncated GSC pull,
diacritic-free Czech keyword research, the ledger's own redirect-arrow attribution
bug, and most recently a "legacy URL" bucket containing the site's homepage. The
cheapest detector is implausibility of the *output* — if a result set contains
something that obviously does not belong, check how the input was built before acting
on the finding.

**Prose rots silently and nothing gates it.** Automated checks verify that a URL
behaves correctly; nothing verifies that a sentence describing a URL is still true.
When a change deletes or moves a URL, grep the ledger for that path in the same pass.

**Never redirect to `/consult/*`**, and remember that rule order in `next.config.ts`
kills precise rules placed below broad ones.

---

## 5. Current state as of 2026-08-15

**Headline:** clicks 420 → 738 across matched 28-day windows (2026-06-18 → 07-15 vs
07-16 → 08-12). First click-level evidence the migration is working. CTR (3.84% →
2.05%) and blended position (13.1 → 18.4) both fell, and that is arithmetic from 230%
impression growth, not a regression — see §22.1 and `SEO-GROWTH-012`.

**Nothing is mid-flight.** No SEO code change is uncommitted, unpushed or awaiting
deploy as of this handover. The last two SEO commits are documentation.

**What is open, and it is all measurement:**

| Due | Item | Where |
| --- | --- | --- |
| ~2026-09-01 | Czech travel-medicine redirect lag + Portugal doctor recrawl; `inspect_urls` watchlist pass | §6, §21.10 |
| ~2026-09-04 | Brazil Sarmento recrawl | §21.10 |
| ~2026-09-06 | Romania doctor recrawl + second-opinion query signal | §21.10 |
| ~2026-09-08 | Ireland lab cluster, Czech GP ranking ramp, Spain dermatología; SEO-DOC-004 outcome | §5, §21.10 |
| **~2026-09-30** | Country FAQ measurement **+ legacy consolidation share, one trip** | §5 `SEO-GLOBAL-LANG-003`, §22.3 |
| ~2026-11-13 | Brazil/Romania generic commercial SERP-wall recheck | §21.10 |
| event-driven | Czech doctor onboarding, Hlavatý disposition, Spain gated-service content | §15, §16 |

**Two things pre-registered so you do not misread them:**

- **The 2026-09-30 consolidation number has a threshold.** 48% of clicks still enter
  through a legacy URL that 308s. If that is not materially below 48% — call it under
  30% — by 09-30, it stops being a wait and becomes a crawl-rate finding to work
  alongside the 117 un-recrawled doctor URLs in §6. Without the threshold this number
  gets reread as "still consolidating" forever.
- **Grainne Ahern's clicks will vanish next window.** `/ireland/en/doctors/dr-grainne-ahern`
  shows 8 clicks / 142 impressions in the current window because the 410 landed
  2026-08-08, mid-window. That is the 410 working as designed, the cost was booked at
  the decision (74 clicks / 600 impressions / 90d / position 3.8), and it is **not** a
  regression to investigate or a redirect to add.

**Waiting on a human, not on you:** the Brazil FAQ integration question, Hlavatý's
disposition (retired vs live under another identity), and Spain's gated-service
content. Absence from the roster is not evidence of departure — that mistake was made
once, on 2026-08-08, and reverted the same day.

---

## 6. First session checklist

1. Fix or override `~/.codex/AGENTS.md` (§2.1) before anything else.
2. `py ~/.claude/plugins/.../google_auth.py --check`, then make one real GSC call and
   confirm it returns rows. `--check` alone has lied before.
3. Read `seo-control-state.md` §0, §5, §6, §7, §21.10, §22.
4. `py scripts/seo-ledger-sweep.py` — confirms the ledger still agrees with production
   and takes minutes. Read its attribution-rule header first.
5. Check the `seo-live-urls` CI job is green on `main`. A red one means production
   rotted with no commit behind it.
6. Only then pick up the nearest dated item from §5 above.

Do not open a new growth batch on arrival. The program is in monitor state, every open
item is dated, and the standing instruction is to not reopen anything early absent a
genuine production or search regression.

---

## 7. Repo mechanics that will bite

- **This clone is shared with concurrent sessions.** Other sessions' uncommitted work
  appears in the working tree without warning. Run `git status` before staging, **stage
  by explicit path**, and never `git add -A` / `git add .`.
- **`git log` is the source of truth for what shipped.** A session's own account of
  what it committed can be wrong, and was on 2026-08-14.
- **Branch:** SEO work has been landing on `Dev-hassaan`. Do not merge or push `main`
  or `Dev-nauman` unprompted.
- **`backend/.env` points at PRODUCTION.** Dry-run and confirm before any script that
  writes.
- **`pnpm.overrides` are not inherited by deployed services** — mirror security pins
  into root, `frontend/` and `backend/` `package.json`. CI gate:
  `scripts/check-override-drift.mjs`.
- Type-check per package (`frontend/`, `backend/`) rather than from the root.
