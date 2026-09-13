# Romania baseline audit

Evidence collected 13 September 2026; UTC timestamps are retained in raw responses.
Operational status is owned by global ledger section 55. This package is research
and local drafts; no production publication occurred.

## Coverage

The sitemap supplies 317 real Romania URLs: RO 54, EN 55 and CS/DE/ES/PT 52 each.
Public page links revealed ten additional URLs. Nine are working, intentionally
noindexed legal variants; one English sick-note link returns 404. The matrix has
327 rows: 326 reachable public pages and the broken destination. Counts are observed,
not multiplied from a primary-language template.

All 317 sitemap URLs return 200, have titles and descriptions, self-canonicalize
and declare index/follow. Six booking pages have no H1 in the HTML shell; this is
not evidence of a broken interactive booking flow. No booking was created.

Public API collection succeeded for 132 reads, covering six service lists, six
doctor lists and all 120 service/profile detail variants. The clone has no production
backend .env; no direct database access was attempted. Public projections cannot
reveal hidden rows, unpublished services or every stored translation. An authenticated
preflight remains necessary for a later mutation, not for this public-page audit.

## Available care

Three doctors are active and BOOKABLE in the observed public data. All list Romanian
and English. Alexandra Palaga is assigned specialist pediatrics; Andreea Lorena Bica
is assigned neurology; Robert Gabriel Brindus is assigned 14 GENERAL services.
The stored next appointment dates were 14 September; do not publish those dates as
evergreen copy. Per-service availability is recorded in the supply matrix.

`evaluare-durere` is the seventeenth public service and has no assigned doctor:
UNAVAILABLE / NO_APPROVED_DOCTOR. Its six variants have an operations hold.
No draft advertises a dermatologist, psychiatrist or gynecologist for a GENERAL
service. A page translated into Spanish does not imply a Spanish-speaking doctor.

## FAQ reconciliation

| Source | Coverage |
| --- | --- |
| Native ServiceFaq records | 0 across 102 service variants |
| Existing embedded service FAQ sections | 22 variants / 187 questions |
| English embedded service coverage | All 17 services / 142 questions |
| Other-locale embedded coverage | medic-online-romania only, five locales / 45 questions |
| True service FAQ gaps | 80 variants |
| Existing doctor FAQ coverage | 18 variants, six each, API/HTML/schema agree |

The old planning sample counted only accordion/schema content. This reconciliation
corrects its apparent all-service gap: native absence and visible absence are different.
There is no rendering defect demonstrated. Drafts remove the exact final embedded
FAQ block and replace it with reviewed native candidates, rather than duplicating it.

## Matched Search Console baseline

Final page data, all `/romania/` locales, all searcher countries. Current window
13 August–9 September; comparison 16 July–12 August. Both are 28 days. Pagination
completed (166 current pages; 170 previous pages). Page totals include anonymized
query demand that the earlier query-level sample omitted.

| Group | Previous clicks / impressions | Current clicks / impressions |
| --- | ---: | ---: |
| Services | 4 / 416 | 7 / 332 |
| Tools | 1 / 820 | 51 / 4,406 |
| Articles | 0 / 19 | 17 / 1,392 |
| Other, including hubs/directories | 12 / 530 | 18 / 1,862 |
| Total | 17 / 1,785 | 93 / 7,992 |

Commercial samples remain small. Most growth is in tools and articles, so overall
traffic growth must not be presented as booking growth. No individual doctor-profile
rows were returned. Romania-resident page data is saved separately (29 rows); do not
blend it with all-country page totals. No aggregate average-position claim is used.

The matched query/page extract contains 696 visible rows and no further page. Raw
queries include irrelevant strings, cross-language traffic and tiny one-impression
rows. The master distinguishes measured queries, provider metrics and editorial
labels; unavailable volume remains blank. Unsupported languages remain documented.

## Evidence

- `target-page-inventory.csv`, `faq-coverage.csv`, `doctor-service-language-matrix.csv`
- `raw/public-inventory-2026-09-13.json`, `raw/linked-extra-pages-2026-09-13.json`
- `raw/api/collection-status.json` and the response snapshots
- `raw/pages_current-2026-09-13.json`, `raw/pages_previous-2026-09-13.json`
- `raw/gsc-query-current-2026-09-13.json`, `raw/gsc-residents-current-2026-09-13.json`
