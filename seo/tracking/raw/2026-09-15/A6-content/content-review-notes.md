# A6 — content quality review, 2026-09-15

## Method

Review set `review_set.csv` (140 pages) verified complete from the cut-off run: 60 top-impression
pages from `top-pages-by-market-W1.csv` + 80 scanner-flagged 200-status pages, six markets, 12 page
types. Re-ordered to `review_set_ordered.csv` (market → page_type → impressions) so template
families were judged together. Every page read from its A2 extract
(`A2-probe/text/<url_id>.txt`, JSON-LD stripped) against title/meta/H1, its `gsc_query_page_W1`
queries, and the code file or CMS record that generates it. No production writes; A2 extracts were
current, so nothing was re-fetched. Scanner counts stay in `scanner_flags`; my ratings are separate
columns, and where they disagree the row says why.
Outputs: `data/content_review.csv` (140 rows, CR-0001…CR-0140), `data/copy_proposals.csv` (25).

## Counts

Improve 66 · Protect 45 · Consider retirement 15 · Consolidate 13 · Translate/localize 1.
By market (Protect/Improve/Consolidate/Retire/Translate): Brazil 11/11/1/3/1 · Czechia 11/8/1/3/0 ·
Ireland 9/9/4/3/0 · Portugal 6/14/3/2/0 · Romania 3/10/2/2/0 · Spain 5/14/2/2/0.
Intent: aligned 86, partial 50, mismatched 4. Factual safety: ok 106, check 25, **risk 9**.
Proposals 25 (BR 4, CZ 4, IE 4, PT 4, RO 3, ES 6): 12 body_section, 7 title, 4 meta_description,
2 faq; 5 carry a clinical gate.

## Systemic patterns, smallest shared fix each

**1. Untranslated blog category label — 23 of 37 blog pages.** The category renders in the record's
source language on every other locale: `Praktické lékařství` on /czechia/en·de, `Boli cronice` on
/romania/en·cs·es·de, `Dermatología` on /spain/en·pt, `Medicina Geral e Familiar` and
`Medicina de Viagem` on /portugal/en·de, `Atestados e documentos` / `Exames e diagnóstico` on
/brazil/en, `General Practice` / `Telemedicine` on /ireland/cs·de·es.
*Fix:* one locale-keyed category label map in `frontend/lib/content/blog-presentation.ts` (or a
translated `category` on the blog record). One change, 23 pages.

**2. Generic pan-market hero on 7 market homes.** "…registered with national medical councils across
Europe" and its de/ro/es translations still sit on /brazil/en, /czechia/de, /romania/en·ro,
/spain/es·en·de. Ireland and Portugal already have market-specific heroes. On the Brazil page it is
also factually wrong. *Fix:* the regulator name is already available to the template — set HOME
`heroSubtitle` from it per market. Covers HOME-ES (2,012 impressions) and U003803 (349).

**3. Country name renders as the English route slug inside localised copy.**
`Registrováno v Czechia`, `Zugelassen in Czechia`, `Autorizat în Romania`, `Colegiados en Spain`,
`Médicos registados · Spain`, `In Romania zugelassener Arzt`. *Fix:* trust-ribbon and service-badge
components take the localised country name instead of `params.country`. One component, every market
home plus every service page.

**4. Doctor profiles carry an English SEO heading and English language names on every locale.**
"`<Name> — <Specialty>, Global Health <Market>. Book an online video consultation.`" renders in
English above the localised profile on all 9 doctor pages reviewed, and `Idiomas: Portuguese,
English, Spanish` keeps English language names on pt/es/de. *Fix:* localise the heading string and
map language codes through `frontend/lib/content/languages.ts` in `doctor-profile-page.tsx`.

**5. Superlatives cluster in the German translations.** 36 reviewed pages carry ≥3 superlative hits;
17 are `de` (cs 1, en 5, es 7, pt 6). German amplifies claims the source states plainly
(/ireland/de home 16, /portugal/de blog 17, /spain/de service 11, /czechia/de home 11).
*Fix:* one German editorial pass against the source-language claim, not per-page rewrites.
20 rows flagged `native_editor_status = needed`.

**6. Spain service pages render no reviewer byline — the only market that doesn't.** All five
reviewed (dermatología, psiquiatra, psicólogo, salud mental, justificante) show no clinician and no
review date, while Brazil, Portugal, Czechia and Romania service pages do.
`seo/spain/clinical-approval.json` and `-phase2/3.json` already record Dra. María Fernanda Ocampo
Mora (CGCOM 291409735, 2026-09-14) as approver for exactly these service groups. *Fix:* render the
fields that already exist (CP-0024). Publication-contract gap, not a missing approval.

**7. Em-dash density is a service-page and German-translation habit, not sitewide.** Reviewed-set
medians per 1,000 words: cs 9.4, de 8.8, en 8.7, pt 6.9, ro 3.6, es 2.1. By page type: service 24.1
(max 36.7), market_home 10.9, blog 7.7, tool 4.9. Careers pages read 51–59/1k, but that is 9 dashes
in 176 words — noise. Legal pages at 33/1k are list formatting ("Acknowledgement — within 2 business
days"). Source-tree calibration, same date: 393 em-dashes in `frontend/locales/en/*.json` across 65
locale files, 252 lines in `frontend/lib/content/*.ts`, 42 in `backend/src/content/*.ts`. Czech,
Spanish, Portuguese and Romanian dash typography is legitimate and was not marked down. Punctuation
is not a ranking factor; it appears in 12 rows only because the service ledes are single
dash-chained sentences that read badly on a phone. *Fix:* rewrite ~19 service ledes, nothing else.

**8. Duplicate groups: 8, all noindex cart/checkout shells.** DG-0001…DG-0008 (12/12/12/12/12/6/3/2
URLs, 39 words each, `noindex`, 0 impressions) are cross-language cart and checkout pages per
market. No indexable duplicate group exists. No action.

**9. Same-language cross-market blog copies Google folded — 6 pages, 3 clusters.**
Hand, foot and mouth disease: /ireland/en + /portugal/en (identical English) and /ireland/cs +
/portugal/cs (identical Czech); all four call themselves "HSE-aligned" guides to "Irish children"
and two of them sit on Portugal URLs; the English meta is truncated mid-sentence ("…how to stop…").
Plus /portugal/en/blog/self-certification-sick-leave-portugal (folded despite being genuinely
Portuguese) and /ireland/cs/blog/jak-ziskat-online-potvrzeni… (2 impressions).
*Fix:* keep one canonical HFMD article and drop the Portugal copies; hand the self-certification
fold to A9/A11 as a canonical/hreflang question, not a content one.

**10. `soft_404_signal` is a false positive on all 29 flagged URLs — the rule, not the pages.**
23 are due-date calculators whose week table renders `…39 – 40…41…`, and in the de-spaced DOM text
the digits read as `404`. 5 are `/de/faq`, which open "Nicht gefunden, was Sie suchen? Schreiben Sie
uns." 1 is /ireland/es/blog/analisis-de-sangre-dublin, where "no encontr" falls inside "uno
**encontr**ado en internet". Every page is complete and working. *Fix:* anchor the match to the
title/first heading and require a low word count. Until then the flag is unusable.

## Factual-safety risks (9 rows in `content_review.csv`)

| page | claim | proposal |
| --- | --- | --- |
| /ireland/en/doctors/dr-raafat-ibrahim | "one of the most experienced paediatric clinicians available through online consultation anywhere in the world" | CP-0011 (gate yes) |
| /czechia/en/doctors/dr-ahmed-maklad | Ireland branding throughout a Czechia URL + "one of Europe's most internationally recognised medical schools" | CP-0005/0006 |
| /portugal/de/doctors/dr-ruben-pereira | meta calls a psychiatry trainee a "Spezialist" | CP-0015 (gate yes) |
| /spain/en/doctors/dr-javier-villarte-betancor | "Dr" prefixed to a health psychologist (col. A014346) | CP-0022 (gate yes) |
| /portugal/pt/doctors/dr-telmo-coelho | "um dos psiquiatras com maior abrangência de experiência clínica" | logged only; page is otherwise Protect-grade |
| /spain/en/services/psicologo-online | psychotherapy "frequently more effective in the long term than medication alone" | CP-0023 (gate yes) |
| /brazil/en/doctors | unsourced "45,332+ consultations" and "Reviewed on Doctify" beside "1 licensed clinician available" | CP-0003 |
| /portugal/en + /portugal/cs HFMD | Irish HSE guidance served on Portugal URLs | consolidate |
| /portugal/en/services/consulta-cardiologia | "the highest level of specialist cardiovascular qualification in Portugal" | CP-0014 (gate yes) |

No reviewer, review date, regulatory status, testimonial or evidence was invented. Every proposal
deletes an unsupported claim or restates a fact already on the page or in an approval record.

## Tool pages — where a snippet change is justified

Tools are the largest impression family (45 of 140 reviewed, ~0.5% CTR), but most of the gap is
position. Split by `gsc_query_page_W1` avg_position ≤ 15:

| page | imp | top-15 imp | clicks | top-15 CTR | verdict |
| --- | --- | --- | --- | --- | --- |
| /romania/ro/tools/calorie-calculator | 2,689 | 2,521 | 31 | 1.2% @ p8 | snippet — CP-0019 |
| /spain/es/tools/blood-pressure-chart | 955 | 293 | 2 | 0.7% @ p10 | snippet — CP-0025 |
| /czechia/cs/tools/blood-pressure-chart | 712 | 540 | 20 | 3.7% @ p4 | snippet — CP-0008 |
| /ireland/en/tools/calorie-calculator | 340 | 319 | 1 | 0.3% @ p9-11 | snippet — CP-0012 |
| /portugal/pt/tools/blood-pressure-chart | 201 | 167 | 2 | 1.2% @ p2-10 | snippet + intent — CP-0016 |
| /brazil/pt/tools/blood-pressure-chart | 94 | — | 0 | @ p8-15 | snippet — CP-0004 |
| czechia bmi 847 · ireland adhd 348 · brazil due-date 381 · romania bmi 373 · spain ovulation 290 | — | ≤20 | 0 | — | ranking, not copy |

Intent finding for A7: the Portugal blood-pressure queries are "tabela de **registo** tensão
arterial" and "registo tensão arterial" (p2, p10) — people want a sheet to record readings in, not
only a chart to compare against. Say what the page does; do not imply a record sheet that is absent.

## Protect list (do not touch)

Ireland: both Illness Benefit guides (851 and 749 impressions, the strongest pages in the estate),
blood-tests-dublin, adult-adhd-assessment, osteoporosis-risk-checker, adhd-test.
Czechia: neschopenka-jak-funguje-eneschopenka (243), lekar-online-24-7, and the whole cs tool set.
Portugal: atestado-medico-para-carta-de-conducao (255), baixa-medica-quanto-se-recebe, HOME-PT (676),
/portugal/en/faq. Romania: ce-scade-tensiunea-arteriala-rapid-sigur — it refuses to give an
unsupervised captopril dose, which is the safe answer. Spain: dermatologo-online-que-puede-resolver
(288), baja-laboral-por-ansiedad (answers "mi médico no me da la baja" at p9), dr-alfredo-del-valle
(127 imp / 20 clicks, highest CTR reviewed). Brazil: /brazil/pt/faq,
solicitacao-de-exames-laboratoriais, and both atestado-medico service pages, which state plainly
that booking does not guarantee a certificate.

## Handovers

- A7/A9: locale bloat — 14 due-date calculators and 1 calorie calculator sit in locales the market
  does not serve, all at 0 impressions (the 15 "Consider retirement" rows).
- A9/A11: the /portugal/en self-certification fold, and /romania/es/tools/bmi-calculator ranking for
  Romanian queries at p71-88, both look like canonical/hreflang pairing, not content.
- Scanner owner: fix the `soft_404_signal` rule before the next batch (29/29 false positives).
