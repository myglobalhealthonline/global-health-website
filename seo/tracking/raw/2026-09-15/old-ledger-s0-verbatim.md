## 0. Operating rules

> **Before beginning any new SEO remediation or growth batch, refresh the relevant
> OpenSEO/GSC data and verify live production behavior. Historical audit counts are
> context, not the current source of truth.**

> **After every implemented/deployed SEO batch, update the canonical remediation
> ledger and growth roadmap in this file before proceeding to the next batch.**

Supporting rules:

- **Keep global control separate from country evidence.** `seo/README.md` is the
  workspace router; `seo/<country>/` holds detailed dated audits, keywords,
  competitors, content opportunities, technical analysis and raw exports. This file
  alone owns current status, priorities, deadlines and next actions. New country work
  saves its evidence in the country package and adds only a concise dated decision and
  link here. Sections 10–21 and 28–35 are a legacy exception: their embedded country
  evidence remains in place to preserve the decision trail, but new detailed market
  evidence follows the country-first rule. Cross-market findings stay here rather
  than being copied six times.
- **Do not rerun the full ~1,000-page crawl for every batch.** Reserve a full crawl for
  validating global technical architecture, establishing a periodic baseline, or
  following substantial sitewide change. For one page, one query cluster, one country,
  one redirect family, one metadata template, or one indexing question, use a focused
  OpenSEO/GSC pull plus a live production check.
- **Distinguish three states in every finding**: what production serves right now, what
  Google has stored from its last crawl, and what an older audit recorded. They diverge
  routinely, and conflating them is the main way stale work gets redone.
- **When old and new data disagree, new verified data wins.** Keep the old number only
  as labelled historical context.
- **An OpenSEO/MCP recommendation is a hypothesis.** Verify it against GSC, a live SERP,
  and the actual site architecture before it enters the roadmap.
- **This clone is shared with concurrent sessions — treat it as a standing
  condition, not an incident.** Other sessions' uncommitted work appears in the
  working tree without warning, and has changed mid-session more than once. So:
  run `git status` before staging, **stage by explicit path**, and never
  `git add -A` / `git add .` in this repo. A tidy-looking commit that sweeps in
  another session's half-finished backend edit is the failure mode this prevents.
  Corollary: `git log` is the source of truth for what shipped — a session's own
  account of what it committed or pushed can be wrong, and was on 2026-08-14
  (SEO-DOC-006 was reported unpushed while already present on `origin/main`).

---
