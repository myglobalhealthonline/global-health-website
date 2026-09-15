# A7 market intelligence notes — 2026-09-15

All estimated metrics (search volume, keyword difficulty, SERP positions, backlink
counts, domain/spam scores) are **DataForSEO via OpenSEO, observed 2026-09-15**
unless a country package date is given. Live HTTP checks of backlink target URLs
were run directly against production on 2026-09-15 and are not provider estimates.

Country packages were all younger than 30 days, so they were **reused** rather than
re-bought: Ireland 2026-08-25, Czechia 2026-08-31, Portugal 2026-08-31, Spain
2026-09-13, Romania 2026-09-13, Brazil 2026-09-13. Fresh purchases were limited to
ranked keywords (6 markets), SERP verification (30 head terms), competitor sets
(6 markets), whole-domain backlinks, and keyword metrics for the three markets whose
packages carried no measured volume (Spain, Romania, Brazil).

---

## Cross-market findings (apply to all six)

1. **Wrong-locale pages are winning the few rankings that exist.** Every market
   publishes all six locales (`/spain/cs`, `/romania/ro`, `/brazil/es` …), and
   Google is picking the wrong one. Romania: 5 of its 16 ranked keywords are held by
   `/spain/ro/...` and `/ireland/ro/...` rather than `/romania/ro/...`. Brazil: 4 of
   11 are held by `/brazil/es/...`, `/brazil/en/...` and legacy `/pt/specialty-sp`.
   Spain: 2 of 47 sit on `/romania/es` and `/ireland/es`. Ireland: 4 of 100 sit on
   `/ireland/es` and `/ireland/ro`. This is self-cannibalisation, not competition.
2. **The redirect map from the old Wix site works, but lands too coarsely.** Of the
   237 distinct backlink target URLs checked live on 2026-09-15, **222 resolve 200**
   to a current market page (e.g. `/pt/portugal/traveler's-consultation` →
   `/portugal/pt/services/consulta-do-viajante`). Two groups lose their specificity:
   - **54 links across 7 distinct `/post/<article-slug>` URLs** land on the generic
     `/ireland/en/blog` index rather than the matching article. Only one of the eight
     linked articles (`hand-foot-and-mouth-disease...`) maps article-to-article. The
     largest single loss is 24 links to a coronary-artery-disease article.
   - **128 of the 195 `wix.to` `/booking-calendar/<service>` deep links** land on a
     generic `/book` page; the other 68 do reach the correct service page. So the
     redirect table is already service-aware — it is simply incomplete.
3. **15 backlinks are live-verified 404s.** All point at deleted Wix commerce pages —
   `/product-page/<home-test>` (thyroid, vitamin D, PSA, gut microbiome, AMH and 10
   more) plus `/home-health-tests/vitamin-b12-blood-test` — and 14 of the 15 come from
   a single source, `globalguestgg.wixsite.com`. A further 15 links are flagged
   `broken` by DataForSEO (mostly Romanian `/booking-calendar/` specialty slugs) but
   **currently resolve 200 live**, so treat that provider flag as stale.
4. **The link profile is thin and mostly low quality.** 572 backlinks / 68 referring
   domains / domain rank 43. 457 of 572 come from six domains, of which
   `wix.to` (195, the old link shortener) is the largest. 42 links are spam-suspect
   (spam score >= 40, incl. one anchor literally advertising PBN link sales); 9 links
   from 6 domains are genuinely medical (doctify.com, mudr.cz,
   coombecommunitypharmacy.ie, askspud.ie, bionicgym.com, worldhealthorganization.co).
5. **Organic footprint is tiny outside Ireland.** Ranked keywords per market:
   Ireland 203, Spain 47, Czechia 44, Portugal 41, Romania 16, Brazil 11. Across the
   30 head terms whose SERPs were verified at depth 20, MGH appears in a top-10
   **once**: `calculator calorii` (Romania, position 7).

---

## Ireland — `/ireland/en` (location 2372, en)

- **Demand.** The reused package (2026-08-25) carries 152 keywords summing ~186,600
  monthly searches, but the volume is concentrated in tools: `bmi calculator` 74,000
  (KD 49) and `blood pressure chart` 8,100 (KD 48). The commercial core is small:
  `sick cert online` 880 (KD 0), `online gp ireland` 880 (KD 27),
  `online medical certificate` 590 (KD 0).
- **What MGH already owns.** The largest footprint of the six: 203 ranked keywords.
  Best positions are informational — `certificate of incapacity for work` 17 and
  `my welfare illness benefit` 19 (both `/ireland/en/blog/illness-benefit-ireland-how-to-claim`),
  `blood pressure chart` 20 (`/ireland/en/tools/blood-pressure-chart`),
  `randox ireland` 21 (`/ireland/en/lab-tests`).
- **The SERP wall.** Sick-certificate terms are owned by four specialists who are
  price-and-speed native: gethealthcare.ie (#1 for `sick cert online`,
  `online sick certificate`, `online sick cert ireland`, `medical certificate ireland`),
  smartscripts.ie (#1 `online medical certificate`, #1 `doctors note online`; its
  title advertises a fixed fee and a 2-hour turnaround), medhub.ie and gpsicknote.ie.
  webdoctor.ie holds #1 for `online gp ireland`, `gp online` **and**
  `bmi calculator ireland`. MGH's own sick-cert rankings (29, 30, 43) are held by
  `/ireland/es/...` and `/ireland/ro/...` — Spanish and Romanian pages.
- **Top 3 achievable.** (1) Fix the locale cannibalisation on
  `sick-cert-online`: four ranked positions sit on non-English locales while
  `/ireland/en/services/sick-certificate-ireland` ranks 61 for
  `medical certificate ireland`. (2) Defend and extend the illness-benefit and
  blood-pressure content, the only assets already inside the top 20. (3) Repoint the
  52 `/post/*` article backlinks (24 of them to a single coronary-artery-disease
  article) at the matching article instead of the blog index.
- **Do NOT.** Do not open a price war on `sick cert online` against four incumbents
  who advertise fixed fees and two-hour turnaround. Do not chase `bmi calculator`
  (74,000, KD 49) as a head term — webdoctor.ie already owns the Irish variant.

## Czechia — `/czechia/cs` (location 2203, cs)

- **Demand.** 150 reused keywords (2026-08-31) summing ~238,200 searches, again
  tool-dominated: `bmi kalkulačka` 40,500 (KD 5), `bmi` 33,100 (KD 11), `výpočet bmi`
  14,800 (KD 1-4), `těhotenská kalkulačka` 8,100 (KD 2). Regulatory demand is real:
  `nemocenské pojištění` 4,400 (KD 20), `neschopenka` 2,400 (KD 10).
- **What MGH already owns.** 44 ranked keywords, all but two on the correct `cs`
  locale. The strongest asset is one blog post:
  `/czechia/cs/blog/neschopenka-jak-funguje-eneschopenka` ranks 17 for
  `jak funguje eneschopenka`, 21 for `jak funguje neschopenka` and 22 for
  `vycházky na nemocenské`. `/czechia/cs/tools/blood-pressure-chart` ranks 26-30 and
  `/czechia/cs/tools/calorie-calculator` ranks 22.
- **The SERP wall.** Two different walls. Consultation terms are held by insurers and
  incumbent platforms — zpmvcr.cz (#3/#2), meddi.com (#2), konzultacelekare.cz (#1
  `konzultace s lékařem online`), moje.euc.cz (#1 `lékař online 24/7`). Calculator
  terms are held by non-medical publishers: ketomix.cz #1 and bodymassindex.cz #2 for
  `bmi kalkulačka`; hartmanndirect.com #1 for `normální tlak`.
- **Top 3 achievable.** (1) Build out the eNeschopenka cluster around the post that
  already ranks 17-22 — it is the single best-performing page in any market.
  (2) Attack `normální tlak` / blood-pressure tables, where the incumbents are a
  medical-devices retailer and a student wiki, with a clinician-reviewed table.
  (3) Correct the clinician listing on znamylekar.cz (ranks #3 for
  `konzultace s lékařem online`) and the existing mudr.cz link.
- **Do NOT.** Do not build a `bmi kalkulačka` page to beat ketomix.cz at 40,500/KD 5 —
  the query has no commercial path to a consultation. Do not target
  `nemocenské pojištění` transactionally; it is a state-benefit query owned by VZP.

## Portugal — `/portugal/pt` (location 2620, pt)

- **Demand.** 150 reused keywords (2026-08-31, competitor-brand navigational terms
  stripped) summing ~189,700. The head of the raw package is almost entirely rival
  brand navigation — `sns 24` 110,000, `hospital da luz` 90,500, `cuf` 74,000,
  `lusiadas` 60,500 — which is why those were excluded. The reachable demand is
  sick-leave and certificates: 77 of the 150 rows fall in the sick-certificate
  cluster (`baixa médica`, `atestado médico`).
- **What MGH already owns.** 41 ranked keywords, 36 on the correct `pt` locale.
  `/portugal/pt/tools/blood-pressure-chart` is the best asset (17 for
  `tensões altas valores`, 19 `tensão valores`, 21 `tensão arterial normal`).
  `/portugal/pt/services/certificado-medico-carta-de-conducao` ranks 33 for
  `atestado médico imt` and 43 for `atestado medico para carta de condução`.
- **The SERP wall.** The state is the wall: sns24.gov.pt holds #1 for
  `receita médica online` and `consulta do viajante`, #2 `consulta online`, #5
  `consulta médica online`. Then dronline.pt sweeps the commercial set (#1 for
  `médico online`, `consulta online` and `consulta médica online`), backed by
  insurers (medis.pt #2 `médico online`, advancecare.pt) and hospital groups
  (cuf.pt, lusiadas.pt, hospitaldaluz.pt).
- **Top 3 achievable.** (1) Own the driving-licence certificate niche
  (`atestado médico para carta de condução`) — MGH already ranks 33-43 with a
  dedicated service page and the state does not compete there. (2) Extend the
  blood-pressure tool cluster that already ranks 17-21. (3) Build the `baixa médica`
  explainer cluster (77 keywords in the map) where the current best rank is 40.
- **Do NOT.** Do not target `consulta do viajante` or `receita médica online` head-on
  — SNS24 holds #1 on both and MGH's own travel-consultation page is the single most
  linked legacy URL (34 backlinks) but still has no ranking. Do not build pages for
  competitor brand names (`sns 24`, `cuf`, `lusíadas`), the top of the raw package.

## Spain — `/spain/es` (location 2724, es)

- **Demand.** Package (2026-09-13) had only 10 measured keywords, so 95 candidates
  were metered fresh on 2026-09-15: 51 returned. Demand is overwhelmingly tool-shaped
  — `calculadora imc` / `calcular imc` / `calculo imc` 49,500 each (KD 13),
  `bmi calculadora` 22,200 (KD 9), `calculadora ovulacion` 2,900 (KD 0). The
  telemedicine core is small: `médico online` 480 (KD 10), `consulta médica online`
  260 (KD 36), `justificante médico online` 140 (KD 0). One notable adjacent seam:
  `baja por ansiedad` 2,400 (KD 0) plus `mi médico no me da la baja por ansiedad` 140.
- **What MGH already owns.** 47 ranked keywords, 44 on `es`. Nothing in a top-10.
  Best: `medica my` 18 and `global health` 23 (both `/spain/es`),
  `cual es la tensión arterial normal en un adulto` 26
  (`/spain/es/tools/blood-pressure-chart`). Two rankings leak to `/romania/es` and
  `/ireland/es`.
- **The SERP wall.** `justificante médico online` is a **government** SERP —
  comunidad.madrid #1, san.gva.es #2, juntadeandalucia.es #3, murciasalud.es #5: these
  are regional health services issuing the document, not competitors to outrank.
  `médico online` is held by saludonnet.com #1, tumedico.es #2, doctoralia.es #3.
  `calculadora imc` is held by texasheart.org #1, then CDC, Quirónsalud and the
  Spanish obesity society — institutional, not commercial.
- **Top 3 achievable.** (1) The `baja por ansiedad` seam: 2,400 searches at KD 0 with
  informational intent and a clear consultation path, and no telemedicine incumbent.
  (2) Consolidate the blood-pressure tool that already ranks 26. (3) Claim and correct
  clinician profiles on doctoralia.es, which ranks #3 for the market's main
  commercial term.
- **Do NOT.** Do not build a `justificante médico online` page positioned against the
  regional health services — the query is largely people retrieving a document from
  their own public health service. Do not chase `calculadora imc` at 49,500 against
  CDC and Quirónsalud.

## Romania — `/romania/ro` (location 2642, ro)

- **Demand.** Package (2026-09-13) listed 613 GSC-visible queries with no measured
  volume; 89 were metered fresh on 2026-09-15 and 68 returned. Total mapped volume
  ~83,500 — the smallest of the six. Tools again: `imc` 12,100 (KD 0), `calcul imc`
  8,100 (KD 9), `calculator sarcina` 8,100 (KD 2), `calculator calorii` 4,400 (KD 1),
  `calculator tensiune` 3,600 (KD 0). Consultation demand is genuinely small:
  `medic online` 390 (KD 31), `medici online` 140 (KD 46),
  `adeverinta medicala online` 170 (KD 0), `concediu medical online` 20.
- **What MGH already owns.** 16 ranked keywords — and the best result in the whole
  audit: `/romania/ro/tools/calorie-calculator` ranks 12-17 for four calorie-deficit
  variants and **7 for `calculator calorii`** in the verified SERP.
  `/romania/ro/tools/due-date-calculator` ranks 36 for `calculator sarcina`. But 5 of
  16 rankings are held by `/spain/ro/...` and `/ireland/ro/...` pages.
- **The SERP wall.** Hospital groups own everything: medlife.ro is #1 for
  `calculator calorii`, #2 for `calculator imc`, #3 for `medic online`; medicover.ro
  #1 `calculator imc`; reginamaria.ro #2 `medic online`. The only pure-play
  telemedicine incumbent is medic.chat (#1 `medic online`).
- **Top 3 achievable.** (1) Protect and extend the calorie calculator — it is already
  position 7 and the only near-miss top-5 in the audit. (2) Fix the `/spain/ro` and
  `/ireland/ro` cannibalisation so `/romania/ro` receives its own rankings.
  (3) `adeverinta medicala online` (170, KD 0) is an uncontested certificate term.
- **Do NOT.** Do not invest in `medic online` (390 searches, KD 31) against MedLife,
  Regina Maria and Medicover — the volume does not justify the authority gap. Do not
  treat the 613 unmetered package queries as demand; most returned no volume at all.

## Brazil — `/brazil/pt` (location 2076, pt)

- **Demand.** Package (2026-09-13) had 8 measured keywords; 68 candidates were metered
  fresh on 2026-09-15 and 40 returned, summing ~480,900 — the largest of the six, but
  the total is dominated by pregnancy tools: `calculadora gestacional` 135,000 (KD 0),
  `calculadora idade gestacional` 60,500 (KD 0), `calculadora de gravidez` 5,400
  (KD 0). (`sim` at 246,000 is a parsing artefact of a GSC row, not a real target.)
  Real service demand: `declaração de comparecimento` 9,900 (KD 0),
  `consulta médica online` 6,600 (KD 22), `clínico geral online` 720 (KD 6),
  `renovação de receita online` 720 (KD 0), `solicitação de exames` 1,600 (KD 0).
- **What MGH already owns.** The weakest footprint: 11 ranked keywords, best position
  30. Critically, **4 of 11 are held by the wrong locale** —
  `/brazil/es/gp-consultation-online` (a Spanish page) ranks 64 for `medicina online`,
  `/brazil/es/about` ranks 30 for `help global brasil`,
  `/brazil/es/blog/certificado-medico-online-brasil` ranks 68, and legacy
  `/pt/specialty-sp` ranks 39. The Portuguese tools
  (`/brazil/pt/tools/due-date-calculator`, `/brazil/pt/tools/ovulation-calculator`)
  rank 58-85.
- **The SERP wall.** Pregnancy calculators are held by clinical institutions —
  fetalmed.net #1 for both `calculadora gestacional` and `calculadora idade
  gestacional`, then sogesp.com.br (the São Paulo obstetrics society), babycenter,
  tuasaude and flo.health. Consultation terms are held by drconsulta.com (#1
  `consulta médica online`), medico24hs.com.br (#2) and doctoralia.com.br (#1
  `consulta online pediatra`). `declaração de comparecimento` has **no telemedicine
  incumbent at all** — gov.br sits at 15 and Instagram at 12.
- **Top 3 achievable.** (1) `declaração de comparecimento` — 9,900 searches, KD 0,
  no commercial incumbent, and MGH already has an attendance-certificate article.
  (2) Switch the Brazilian rankings onto the `pt` locale; a Spanish page currently
  represents the brand for `medicina online`. (3) Strengthen the two `pt` pregnancy
  calculators already ranking 58-85 against a 195,500-search cluster at KD 0.
- **Do NOT.** Do not treat `sim` (246,000) as demand. Do not fight fetalmed.net and
  the obstetrics society for the #1 pregnancy-calculator slot; take the long tail
  (`calculadora gestacional dum`, `calendário gestacional por semana`) where MGH
  already ranks. Do not publish new Spanish-language pages under `/brazil/`.

---

## Files produced

| File | Rows |
| --- | --- |
| `seo/tracking/data/backlinks.csv` | 410 |
| `seo/tracking/data/backlink_prospects.csv` | 258 |
| `seo/tracking/data/keyword_map.csv` | 820 |
| `seo/tracking/data/competitors.csv` | 299 |

Raw responses and the live-status check are in
`seo/tracking/raw/2026-09-15/A7-market/`; `manifest-A7.json` lists every paid call,
its parameters, measured credit cost and the reuse decisions.
