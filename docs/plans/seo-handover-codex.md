# SEO handover — Claude Code → Codex

**Written 2026-08-15; operational update 2026-08-25.** For an agent picking up SEO
work on this repo in Codex, with no memory of the sessions that produced the current
state.

Read this once, then use `seo/README.md` to route the task to the global ledger and
the relevant country evidence package. This file explains what you are inheriting,
what changes because the work moved to Codex, and what will silently mislead you. It
does **not** duplicate the ledger — where the two disagree, the ledger wins on facts
and this file wins on process.

---

## 1. Read in this order

1. **`seo/README.md`** — the six-market workspace map and source-of-truth contract.
2. **`docs/plans/seo-control-state.md`** — the canonical global ledger, roadmap and
   indexation watchlist. Start at §0, then read only the global status/watchlist/
   roadmap sections and country sections relevant to the task.
3. **`seo/<country>/README.md`** — the market evidence index. Country files support
   the ledger; they do not own current status, dates or next actions.
4. **`CLAUDE.md`, the SEO sections** — repo conventions. Codex does **not** read
   `CLAUDE.md` automatically; the repo-root `AGENTS.md` it *does* read points at it.
   Section 4 below mirrors the parts that matter; read the file itself before trusting
   the mirror.
5. **`docs/plans/seo-indexation-plan-2026-07-28.md`** — superseded as a status
   document, but its §2 design decisions and §5 "explicitly not doing" list are still
   binding.
6. **`docs/plans/seo-editorial-next-agent-brief-2026-08-25.md`** — for editorial work,
   the detailed execution
   order for Week 1 review, the selective 19-variant Week 2 cohort, authority work,
   production approval boundaries and 30/60/90-day measurement.

There is no Wave 4 technical-remediation batch. The six-market technical program
remains **complete / monitor exceptions**. A separate, owner-directed editorial growth
experiment was registered on 2026-08-25. It uses the same measurement gates and does
not reopen closed technical findings. Do not treat planned blog work as permission to
rerun old SEO batches.

---

## 2. What changes when the work moves to Codex

### 2.1 Instruction files — both fixed 2026-08-16

`~/.codex/AGENTS.md` used to carry ~380 lines of instructions for a Django project
called **Nashaa Sports**, which no longer exists. Codex loads that file globally, so it
applied to this repo and described the wrong stack entirely. The dead half was removed
on 2026-08-16; the generic ECC half was kept, and the original is preserved at
`~/.codex/AGENTS.md.nashaa-backup-2026-08-16` if anything needs recovering.

A repo-root `AGENTS.md` now exists as well, so Codex loads this repo's conventions
automatically: stack, the `proxy.ts` naming trap, redirect-ordering, the CSS split, the
shared-clone git rules, and pointers to `CLAUDE.md` and to this handover.

### 2.2 Capability delta — smaller than it looks

| Capability | In Claude Code | In Codex |
| --- | --- | --- |
| GSC Search Analytics, URL Inspection | `openseo` MCP | **Already configured** — `[mcp_servers.openseo]` in `~/.codex/config.toml`, same `https://app.openseo.so/mcp` endpoint |
| SERP / keyword / backlink data (DataForSEO) | `openseo` MCP | **Same server, same tools** |
| SEO specialist subagents and skills (`seo-audit`, `seo-technical`, …) | `claude-seo` plugin | **Gone.** Their underlying Python scripts still exist on disk (§2.3) |
| Google APIs (GSC, GA4, CrUX, PageSpeed) | Plugin scripts + shared OAuth token | **Works** — plain Python, any process can run it (§2.3) |
| Everything repo-resident (ledger, redirects, `GONE_DOCTORS`, CI gate, sweep script) | — | **Unaffected.** This is most of the system |

**The only real loss is the `claude-seo` subagent layer** — the prepackaged audit
personas. The data access moves intact, and so does everything that actually holds the
system: the ledger, the redirects, `GONE_DOCTORS`, the CI gate and the sweep script are
files in this repo, not agent tooling.

OpenSEO tools cost credits. Focused research is fine; ask before a batch over ~2,000
credits. GSC-backed tools (`get_search_console_performance`, `inspect_urls`) are
read-only and use none.

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
property `547083375`. GA4 is consent-gated.

> **CORRECTED 2026-09-04 — this paragraph described a funnel that is not being
> measured.** `begin_booking`, `begin_checkout` and `purchase` are all wired in code
> (`frontend/lib/analytics/track.ts`) and the Docker build gap was genuinely fixed.
> But only `purchase` and `begin_booking` are registered as key events on property
> `547083375` — `begin_checkout` never was. More seriously, production is tagged
> `G-4PPGECG12X` while that property's only stream is `G-SP48D9LJJ5`, so the property
> stopped receiving data on **2026-08-02** and every GA4 read since returns zero rows.
> The "24 sessions" the Ireland and Czechia packages each recorded as sparse coverage
> is that property's entire lifetime. Draw no conversion conclusion from GA4 until the
> Railway build variable is corrected and a redeploy lands. See ledger §42 and
> `docs/audits/seo/six-market-seo-audit-2026-09-04.md`, findings SMA-01 and SMA-02.

---

## 3. The system you are inheriting, in files

| Thing | Where | Note |
| --- | --- | --- |
| SEO workspace router | `seo/README.md` | Global/country ownership and six-market navigation |
| Country evidence | `seo/<country>/` | Dated audits, keywords, competitors, content opportunities and raw exports |
| Canonical ledger / roadmap / watchlist | `docs/plans/seo-control-state.md` | The one file that must stay current |
| Redirects (276 rules) | `frontend/next.config.ts` | Runs **before** middleware. Rule order matters — a broad rule above a precise one kills it |
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

## 5. Current state, updated 2026-08-25

**Headline:** clicks 420 → 738 across matched 28-day windows (2026-06-18 → 07-15 vs
07-16 → 08-12). First click-level evidence the migration is working. CTR (3.84% →
2.05%) and blended position (13.1 → 18.4) both fell, and that is arithmetic from 230%
impression growth, not a regression — see §22.1 and `SEO-GROWTH-012`.

**No technical SEO implementation batch is mid-flight.** The localized insurance line
and the `llms.txt` feature gates are deployed and live. Local editorial assets may be
uncommitted or may exist outside the CMS; that is content-production state, not proof
that a page is drafted, published, indexed, or measured.

**Editorial experiment overlay.** Week 1 has four live topics and two production
drafts. Week 2 has 36 local working copies, but the production plan is reduced to the
19 evidence-backed variants in the editorial plan; the rollout starts with six
primary-language drafts and requires separate production approval. The first two weeks
are cleanup and measurement, with no more than three active clusters at once.

**What is open, and it is all measurement:**

| Due | Item | Where |
| --- | --- | --- |
| 2026-08-25 → 2026-09-08 | Finish Week 1 review; compact and stage the six primary Week 2 articles; validate post-deployment funnel events; begin one real authority action per priority cluster | `editorial-plan-2026-08-19.md` §7; `seo-control-state.md` §27 |
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

1. Confirm the `openseo` MCP server actually connected this session — it is configured
   (§2.2), which is not the same as reachable.
2. If you need the Google APIs directly rather than through OpenSEO: run
   `py ~/.claude/plugins/.../google_auth.py --check`, then make one real call and
   confirm it returns rows. `--check` alone has lied before.
3. Read `seo/README.md`, the relevant country README, and the applicable sections of
   `seo-control-state.md` (§0 plus current global and market-specific entries).
4. `py scripts/seo-ledger-sweep.py` — confirms the ledger still agrees with production
   and takes minutes. Read its attribution-rule header first.
5. Check the `seo-live-urls` CI job is green on `main`. A red one means production
   rotted with no commit behind it.
6. Read `docs/audits/seo/README.md` and the current 2026-08-25 roadmap report so a
   historical audit is not mistaken for current state.
7. Only then pick up the nearest dated item from §5 above. Editorial work follows the
   separate production and clinical-review gates in `editorial-plan-2026-08-19.md` §7.

Do not open a new technical growth batch on arrival. The technical program is in
monitor state, every open item is dated, and the standing instruction is to not reopen
anything early absent a genuine production or search regression. The editorial
experiment is already scoped; do not widen its topic or locale matrix without new
Search Console, migration-corridor, product, and reviewer evidence.

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
