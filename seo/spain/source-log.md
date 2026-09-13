# Research source and limitation log

Collected 13 September 2026. OpenSEO session access was confirmed with free whoami
and list_projects before paid research. Reused project
7804f362-5891-417e-9c3a-d9e8d4d7dc6b; its Ireland 2372/en defaults were not inherited.
Paid Spain requests used location 2724 and language es explicitly; live SERPs also
used en/de/pt/ro/cs in Spain. Successful responses validate those combinations.

Opening balance 11,049; final free whoami 10,915: aggregate observed decrease
134 credits, below the 2,000-credit confirmation threshold. The account is shared;
this balance delta is not an exclusive billing attribution if another session ran.
No project, tracker, saved keyword or outreach was created.

| Evidence | Saved source | Scope / limitation |
| --- | --- | --- |
| Final GSC pages | raw/gsc-pages-current-2026-09-13.json; previous equivalent | 258/257 rows, final 28-day matched windows, pagination complete |
| GSC queries/pages | raw/gsc-query-page-current-2026-09-13.json | 1,479 rows, separate from page totals |
| Spain residents | raw/gsc-residents-current-2026-09-13.json; raw/residents-previous-2026-09-13.json | Country cut, not language inference |
| Keywords | raw/metrics-es-2026-09-13.json | Null remains unavailable; provider omitted requested flebología online entirely |
| SERPs | raw/serps-es-2026-09-13.json; raw/serps-locales-2026-09-13.json | Dated bounded results, not stable rankings |
| Portfolios | raw/portfolio-spain-2026-09-13.json; raw/portfolio-competitor-2026-09-13.json | 30/44 own rows and four competitor exact-page rows |
| Backlinks | raw/backlinks-2026-09-13.json | Domain query returned one row; do not compare to historical full-domain totals |
| Official sources | raw/registry-checks-2026-09-13.json; raw/official-serps-2026-09-13.json; raw/tomas-serp-2026-09-13.json | Named CGCOM browser matches and COPAO directory; Tomás remains unverified |
| Retrieved sources | raw/external-pages-2026-09-13.json | Competitors, BOE and COPAO; Comunidad Madrid source returned 404 |
| Public pages | raw/sitemap-2026-09-13.xml; raw/html/; raw/public-inventory-2026-09-13.json | 434 observed URLs; 422 live, 12 broken links |
| APIs | raw/api/ | 246 responses, including locale service/profile lists and details |
| Authenticated storage (14 Sept, owner-confirmed read-only) | raw/storage-preflight-2026-09-13.json (local, gitignored) | One REPEATABLE READ READ ONLY transaction; SHA-256 ecd8cb77…3fc61; no patient/appointment/account/banking tables |
| API refresh (14 Sept) | raw/api-refresh-2026-09-13/; raw/source-refresh-2026-09-13.json | 140 draft sources re-fetched (UTC-dated folder); zero drift; Fidel Mesa/cardiology still not bookable |
| PostgreSQL rehearsal (14 Sept) | raw/postgres-rehearsal-2026-09-13.json | Embedded local PostgreSQL 18.4 with current Prisma schema; production not touched |
| Body localization (14 Sept) | content-briefs/body-localization.json | EN/DE/CS/PT/RO drafts of two ES bodies; AI-drafted then independently reviewed; not native-speaker or clinical approval |

Primary administrative source: [BOE RD 625/2014](https://www.boe.es/buscar/act.php?id=BOE-A-2014-7684),
article 2. It establishes the statutory sick-leave route; it does not certify every
statement on our document pages. Registry membership does not verify biographies,
all training, spoken-language proficiency or specialist service suitability.

The full provider omission for flebología online is a missing-result record, not a
zero-volume finding. No Spanish volumes were copied into translated page rows.
Retained legal/clinical copy is not newly fact-checked in full.
