# Romania competitor research

13 September 2026. Google Romania, location 2642. These findings are directional,
not an exhaustive market census. Live SERPs cover four Romanian commercial terms
and five Romania-specific queries in the other site languages. The Labs competitor
comparison was requested for five terms but returned position evidence only for
`medic online`; do not call it five-query visibility coverage.

## Findings

| Comparator | Evidence observed | Implication for Romania pages |
| --- | --- | --- |
| Medic Chat | Home and neurology pages retrieved. They display doctor cards, response-time claims, patient feedback, text/image questions and explanations of the process. | Explain our own video service and actual doctor choice. Do not copy their chat response promises or their roster claims. |
| Neuroaxis | Online page retrieved. It describes case screening, advance payment, video consultation and document handling; not every case is suitable online. | State remote-care limits and preparation clearly. Their broader neurology centre is not evidence of our service scope. |
| neurolog.doctor | Page retrieved: 330 lei, adults only, 20–30 minutes, limited online suitability and a stated follow-up. | Compare transparency of scope and inclusions, not just keyword placement. These are their advertised terms, not ours. |
| Getvig | Pediatrics and neurology pages retrieved; specialty introductions lead to clinician profiles. | Keep service-to-doctor links visible and distinguish general child care from specialist pediatrics. |
| SANADOR | Second-opinion page retrieved; focuses on oncology and multidisciplinary review. | Generic low-difficulty second-opinion terms can conceal specialist intent we cannot fulfill. Exclude oncology targeting. |
| Regina Maria / MedLife | Present in live SERPs; sampled fetches blocked or failed. | Search competitors confirmed; do not infer page content or pricing from failed fetches. |
| Ringdoc | HTTP 200 responses contained only a short application shell. | Treat body/FAQ assessment as unavailable from HTTP collection; do not report thin-content defects. |

Fifteen competitor URLs were attempted. `competitor-page-inventory.csv` preserves
HTTP errors, fetch failures and shells. Eight returned substantive page bodies;
two were application shells, one was blocked (500), and four fetches failed.
Access limitations do not prevent the comparisons supported by retrieved pages.

## Relative organic footprint

OpenSEO estimates for Romania/ro, domain scope (not individual service traffic):

| Domain | Estimated organic traffic | Ranking keywords |
| --- | ---: | ---: |
| medic.chat | 28,541 | 3,062 |
| neuroaxis.ro | 37,273 | 1,872 |
| myglobalhealth.online | 41 | 16 |

These are third-party estimates, not Search Console sessions or bookings. The
Neuroaxis figure covers its whole domain, including in-person services and articles.
Backlink totals were unavailable in these overview calls.

A bounded Medic Chat portfolio export contains 100 of 3,062 ranked keywords; it is
a sample. The exact Neuroaxis online-page export returned no useful count. Neither
is represented as complete keyword coverage. Ten Romanian seed research batches
returned 672 raw rows; there is overlap and substantial brand/product/form noise.

## Keyword decisions

Retain broadly relevant doctor/consultation, pediatric, neurological, hair-loss and
second-opinion language only where existing scope fits. Keep the medical-letter
article as the informational owner; documents and tests are not automatically
reimbursable or guaranteed. Reject competitor names, free/non-stop care, physical
city searches, unsupported subspecialties, oncology second opinions, products,
government forms, jobs and foreign-market service intent. The exclusion CSV keeps
the rejected evidence rather than silently dropping it.

The keyword master has 613 records combining filtered visible GSC demand, a manually
reviewed provider subset and explicit editorial service/name labels. It is not 613
measured commercial opportunities. The source and blank metric columns are essential.
Generated filtering is transparent in build-package.mjs; individual weak-query
interpretations should not drive publication without the owner-page brief.

All five non-Romanian keyword-research requests were rejected by the provider:
only ro is available for this location. Live searches in en/de/es/pt/cs succeeded.
Use those SERPs, actual GSC queries and accurate translated pages, without borrowing
domestic German, Spanish, Portuguese or Czech volumes for Romania.

## Highest-value comparison

Lead with the currently available clinician, consultation languages, what the
appointment can assess, what documents help and when in-person care is needed.
Strengthen the staffed specialist pages and their profiles before expanding general
head-term content. A smaller roster is a commercial constraint, not a reason to
invent specialties or promise immediate care.

Sources: raw/planning-serps-2026-09-13.json, raw/serps-locales-2026-09-13.json,
raw/competitors-2026-09-13.json, raw/competitor-pages-2026-09-13.json, raw/overview_*.json,
raw/portfolio_*.json, raw/research_*.json. No competitor claims were copied into our drafts.
