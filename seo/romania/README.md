# Romania SEO workspace

**Scope:** Romania market; primary route `/romania/ro`.
**Operational source:** [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).

This page routes Romania-specific work and indexes legacy country evidence that
remains embedded in the global ledger to preserve existing references. It does not
duplicate current status, deadlines or next actions.

## Evidence map

New dated planning evidence: [13 September scope and execution brief](planning-brief-2026-09-13.md),
with fresh OpenSEO/GSC exports under `raw/`. This covers all six Romania locales,
service and doctor FAQs, and the prior-country artifact contract. Operational
status and the next action are in global ledger section 55. Section 54 is the earlier
planning checkpoint, superseded by the full public-source reconciliation below.

## Completed research and draft package — 13 September 2026

The approved rollout is complete in commit `a560643b`: 20 groups covering 114 pages
are live and publicly verified. See the [implementation log](09-implementation-log.md)
and [publication cohort](publication-cohort-2026-09-13.json). Global ledger §55.3 owns
the remaining dependencies and measurement dates. The [original handoff](implementation-handoff-2026-09-13.md)
records the preparation scope from research commit `39656572`.

The numbered artifacts follow the Ireland/Portugal/Czechia country contract. Their
structure aligns; research depth and implementation status are country-specific.
Romania now has production rollback snapshots and public readback receipts in `raw/rollout/`.

| Evidence | File |
| --- | --- |
| Baseline and corrected FAQ counts | [01 baseline](01-baseline-audit.md) |
| Competitors and research limitations | [02 landscape](02-competitor-landscape.md) |
| Keywords and exclusions | [03 master](03-keyword-master.csv), [exclusions](keyword-exclusions.csv) |
| Page opportunities | [04 gaps](04-content-gap.csv) |
| URL ownership | [05 map](05-url-keyword-map.csv) |
| Architecture and links | [06 architecture](06-proposed-site-architecture.md) |
| Technical and source findings | [07 audit](07-technical-audit.md) |
| Authority prospects | [08 prospects](08-backlink-opportunities.csv) |
| Preparation receipt and preflight | [09 receipt](09-implementation-log.md) |
| Measurement method | [10 measurement](10-measurement-plan.md) |
| Rollout design | [11 sequence](11-30-60-90-day-roadmap.md) |

The [completion matrix](page-by-page-completion-matrix.csv) covers 327 discovered
URLs, including one broken destination. It records a disposition for each page;
it does not claim every retained body was rewritten. The [draft package](content-briefs/README.md)
contains 96 staffed service variants with 384 FAQ candidates and 18 doctor variants
with 24 targeted FAQ corrections. Existing embedded FAQ blocks are preserved in
the before/after receipts for atomic replacement.

Supporting checks: [FAQ coverage](faq-coverage.csv), [doctor/service/language matrix](doctor-service-language-matrix.csv),
[doctor facts](doctor-profile-fact-register.csv), [review register](clinical-review-register.csv)
and [source log](raw/source-log-2026-09-13.md). All current doctors list Romanian
and English, regardless of page locale. Six pain-service variants lack a doctor;
specialty and biography claims without authoritative evidence remain held.

Reproduce the local evidence checks from the repository root:

```powershell
node seo/romania/collect-public-inventory.mjs --check
node seo/romania/build-package.mjs
git diff --check
```

The build uses saved public responses and the existing installed HTML parser; it
does not write to production or purchase research. Authentication/storage preflight,
applicable clinical review, publication and rendered readback are implementation work.

| Area | Legacy embedded evidence |
| --- | --- |
| Baseline and market opportunity | Global ledger §§20.2–20.5 and 20.10–20.15 |
| Keyword and URL ownership | §§20.3, 20.11 and 21.2–21.4 |
| Competitor/SERP insights | §§20.8, 20.10 and 21.6 |
| Content opportunities | §§20.10–20.12, 21.4–21.8 and global editorial §27 |
| Technical/indexation issues | Global watchlist §6 and §§20.7, 21.2 and 21.7 |
| Actions and measurement gates | §§21.8–21.10 and global roadmap §7 |

Read [`seo/README.md`](../README.md) for the artifact naming and update contract.
Create standalone Romania audit, keyword, competitor or content files only when a
new focused research pass produces evidence to put in them.
