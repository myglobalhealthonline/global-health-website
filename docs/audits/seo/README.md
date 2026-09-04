# SEO audit directory

This directory contains current reports and historical evidence. It is not the
canonical status ledger.

## Read in this order

1. `../../../seo/README.md` — global/country workspace map and source-of-truth rules.
2. `../../plans/seo-control-state.md` — current remediation status, measurement
   gates, watchlist and future implementation calendar.
3. `../../plans/seo-handover-codex.md` — operating rules, tooling and handover traps.
4. The relevant `../../../seo/<country>/README.md` — country evidence index.
5. `six-market-seo-audit-2026-09-04.md` (or the `.html` rendering) — **the current
   audit.** Six-country status, code/template parity across all 410 primary-locale
   pages, the measurement-gate register with absolute dates, and readiness assessments
   for Spain, Romania and Brazil.
6. `seo-roadmap-review-2026-08-25.html` — the previous plain-language audit and action
   plan. Still useful for narrative context; superseded on status by the file above.
7. `../../plans/editorial-plan-2026-08-19.md` §7 — compact content standard, approved
   Week 2 locale matrix and 30/60/90-day measurement rules.
8. `../../plans/seo-editorial-next-agent-brief-2026-08-25.md` — detailed, copy-paste
   execution brief for the next agent.

## Current position, 4 September 2026

- **GA4 is not measuring anything and has not been since 2026-08-02.** Production is
  tagged `G-4PPGECG12X`; the property the tooling reads (`547083375`) streams
  `G-SP48D9LJJ5`. Every conversion figure in this programme reads zero for a structural
  reason. Ledger §42.1. Nothing depending on `begin_booking`, `begin_checkout` or
  `purchase` can be evaluated until a corrected build is deployed and a fresh window
  accrues.
- The technical program remains complete and holding: 410 of 410 primary-locale sitemap
  URLs return 200, `index, follow`, self-canonical, one `<h1>` and an `og:image`.
- Ireland, Czechia and Portugal have full research, governance and measurement layers.
  **Spain, Romania and Brazil have none** — no clinical-approval gate, no register, no
  matrix — while already publishing doctor credentials. That gate is the next
  substantial implementation.
- Three dated gates (Brazil 09-04, Romania 09-06, Spain 09-08) cannot be read: the pages
  they measure have not been recrawled since before their fixes. Extend, do not
  escalate. The Spain dermatology gate has been re-armed for this reason.
- Brazil's deferral is re-affirmed on fresh evidence: one clinician, the densest SERP
  wall of the six markets, 0.62% CTR.

## Previous position, 25 August 2026

- The six-market technical remediation program is complete and monitoring dated
  exceptions. There is no new technical “Wave 4.”
- The active future implementation is a separate selective editorial experiment.
  Week 1 has four live topics and two production drafts; Week 2 has local working
  copies but zero production CMS records.
- Week 2 is capped at the evidence-backed 19 locale variants. Six primary-language
  drafts come first; the other 13 require native-language review.
- The next main gates are 8 September (labs, Czech GP, Spain dermatology and the
  first editorial cohort), 30 September (FAQs, legacy consolidation and 30-day
  editorial evidence), and 13 November (60-to-90-day commercial recheck).
- Production creation, publishing, outreach and other external mutations remain
  separate owner-approved actions.

## Historical evidence

Files dated before 25 August 2026 are point-in-time evidence unless the canonical
ledger explicitly promotes a finding. Their counts, rankings, crawl results and
recommendations must not be silently rewritten to look current. When live evidence
changes a status, update `seo-control-state.md` and record the new dated report.

The July audit directory and the 16 August HTML review are historical snapshots.
The 25 August roadmap review is the current human-readable report until a later dated
report replaces it.

## Audit rule

Before any SEO implementation batch, refresh the smallest relevant GSC/OpenSEO data
set and verify live production behaviour. After deployment, update the canonical
ledger before starting another batch. A local HTML article is not proof of a CMS
draft, publication, indexation, ranking or lead generation.
