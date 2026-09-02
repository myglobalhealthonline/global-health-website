# Week 2 editorial batch

> **STATUS SUPERSEDED — all six topics are PUBLISHED. Verified against production
> 2026-09-03.** Everything below is the dated implementation record of 24–29 August
> 2026 and was accurate when written. It is **not** current status: the
> "five parents still `DRAFT`" statements and the "Publication remains blocked
> until" checklist at the end have both been overtaken by events.
>
> Read-only production query, 2026-09-03: **30 blog posts PUBLISHED, 0 DRAFT.** All
> six Week 2 parents published 2026-08-29, each with full five-locale coverage:
>
> | Market | Slug | Published |
> | --- | --- | --- |
> | PT | `baixa-medica-quanto-se-recebe-como-calcular` | 2026-08-29 |
> | PT | `atestado-medico-para-carta-de-conducao` | 2026-08-29 |
> | IE | `illness-benefit-payment-ireland-rate-tax-timing` | 2026-08-29 |
> | CZ | `vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz` | 2026-08-29 |
> | ES | `tension-alta-sintomas-cuando-urgencias` | 2026-08-29 |
> | RO | `ce-scade-tensiunea-arteriala-rapid-sigur` | 2026-08-29 |
>
> The Spain parent had already been published before the 17-row translation
> completion, which is why the historical text below singles it out.
>
> **Nothing in this directory is awaiting publication.** The `.html` files beside
> this README are the working drafts the published records were built from, kept as
> evidence. Current status for this and every other SEO/editorial item lives in
> [`docs/plans/seo-control-state.md`](../../seo-control-state.md).

Prepared 24 August 2026. These are AI-assisted working drafts. Every kept locale requires a native-language editor and the medical articles require clinician review before publication. **The six primary-language records were created in production on 25 August 2026, and all 30 translation rows were present by 29 August 2026.** The final audit found five Week 2 parents still `DRAFT`; the Spain urgent-blood-pressure parent had been published separately before the last 17 translations were added.

Local and production coverage: every one of the six topics now has EN, PT, ES, CS, RO and DE copy, for 36 variants total. The original production-preparation manifest was restricted to 19 evidence-backed variants; the owner later approved completing the remaining 17 from the reviewed TypeScript sources. The article jurisdiction remains the topic market; the language variant does not replace the applicable local law, benefit system, emergency pathway or service route.

## Local implementation record, 25 August 2026

- The six primary-language drafts were rewritten first: PT sickness benefit 900
  words; IE payment/timing 898; CZ calculation 824; PT driving certificate 894;
  ES urgent blood-pressure safety 1,157; RO immediate blood-pressure safety 1,146.
- Exactly 19 deterministic standalone HTML files now live beside this README. They
  use the same article renderer and scoped visual language as the CMS body path.
- The default seeder scope is the six primary-language drafts. The explicit
  `--approved-locales` option expands it to 19, never 36. Both modes remain dry-run
  unless a separately approved operator supplies `--apply`.
- Focused OpenSEO work on 25 August refreshed keyword, SERP, owner-page GSC and
  domain-level backlink evidence. It did not run a broad crawl, change project state
  or acquire a backlink. The focused backlink response reported 37 links from 36
  referring domains; this narrow provider response does not rewrite the dated
  24 August profile below. Starting account balance was 17,474 credits; no final
  balance was read, so no exact credit-spend claim is made for this refresh.
- The current GSC owner-page evidence keeps Ireland payment/timing separate from the
  existing claim guide and Czech calculation separate from the eNeschopenka process
  guide. No measurable conflict appeared for the exact Portugal owner-page filter.
- Current SERPs support source-led administrative answers and conservative clinical
  triage. Spain and Romania reject self-medication and quick-fix framing; Portugal
  driving copy explains regulated groups and makes no certificate guarantee.

CMS records covered by the approved production implementation: **six parents and 30 translation rows**. The 17-row completion changed existing parents and translations: **zero**. Acquired backlinks:
**zero**. Outreach sent: **zero**. Publication, deployment and push: **none**.

## Revised rollout, 25 August 2026

- Rewrite the kept articles to the compact editorial standard before seeding: usually 600-900 words for administrative/process content and 700-1,200 words for clinical safety content. These are working ranges, not ranking targets.
- Keep one search intent and one service CTA family per article. Use only the secondary queries that support that intent; do not insert every keyword returned by OpenSEO.
- The six primary-language CMS records were created first. The initial 13 locale variants and the remaining 17 were added as translation rows in separate guarded transactions on 29 August 2026; all missing variants received the translation/localization and humanization pass before import.
- Review and release the administrative cohort first: Portugal sickness-benefit amount, Ireland Illness Benefit amount/timing, and Czech sickness-pay calculation.
- Release the Portugal driving-certificate, Spain urgent blood-pressure, and Romania blood-pressure-safety cohort only after the relevant legal or clinical review is complete.
- Keep publication approval separate from translation completeness. Five parent records remain drafts and must not be published without the relevant native/legal/clinical approval.

## Research record

Fresh research used the existing Global Health OpenSEO project. Location codes were Portugal `2620`, Ireland `2372`, Czechia `2203`, Spain `2724`, and Romania `2642`. Language codes were `pt`, `en`, `cs`, `es`, and `ro`. The live calls ran on 24 August 2026.

| Market/query | Fresh volume | KD | CPC (USD) | Intent | Recent direction |
| --- | ---: | ---: | ---: | --- | --- |
| PT `baixa médica` | 4,400 | 20 | 2.51 | informational | 3,600 in May-July after 4,400 in April |
| PT `simulador baixa médica` | 1,300 | 0 | 0.13 | informational | 720 in July; lower than spring |
| IE `how much is illness benefit in ireland` | 880 | 2 | unavailable | informational | 880 in June; 1,300 in March-April |
| IE `illness benefit ireland` | 6,600 | 5 | 3.70 | informational | flat at 6,600 March-June |
| IE `what day is illness benefit paid` | 480 | 5 | unavailable | informational | stable near 390-480 |
| CZ `výpočet nemocenské 2026` | 1,600 | 31 | 1.26 | informational | 1,900 in June; lower than spring |
| CZ `nemocenská 2026` | 2,900 | 22 | 0.51 | informational | 2,400 in July; lower than April |
| ES `tensión alta` | 12,100 | 3 | 0.32 | informational | 8,100 in July after 12,100 in April-May |
| ES `tensión alta síntomas` | 5,400 | 9 | 0.47 | informational | 3,600 in June; lower than March-May |
| RO `trucuri care scade tensiunea pe loc` | 9,900 | 0 | 0.24 | informational | 5,400 in June-July after 8,100 in April |
| RO `de la ce tensiune se ia captopril` | 4,400 | 0 | unavailable | informational | 2,400 in June; handled only as myth correction |
| PT `atestado médico para carta de condução` | 1,900 | 0 | 2.38 | informational | 1,600 in June-July after 2,400 in April-May |
| PT `renovação da carta de condução online` | 2,400 | 0 | 0.93 | transactional | flat at 2,400 April-July; separate intent |

The August 19 editorial-plan estimates match the fresh headline figures. They were not used as a fallback. OpenSEO returned live keyword metrics, SERPs, domain suggestions, ranked keywords, Search Console data, and backlink data. Search Console covered 21 May to 21 August 2026; search opportunities covered 24 May to 20 August 2026. Relevant evidence includes the Portugal driving-certificate service receiving impressions for both Portuguese and English queries, the existing Ireland guide already ranking for Illness Benefit queries, and strong visibility for the Czech eNeschopenka process article. Those signals drove the strict topic splits below.

OpenSEO calls used: `whoami`, `list_projects`, `research_keywords`, `get_keyword_metrics`, `get_serp_results`, `find_serp_competitors`, `get_search_opportunities`, `get_domain_keyword_suggestions`, `get_ranked_keywords`, `get_search_console_performance`, `get_backlinks_overview`, and `get_backlinks_profile`.

Credit record: the focused batch used 1,155 credits and remained below the 2,000-credit approval threshold. No tracking campaign, saved keyword batch, project-context mutation, or large site audit was started.

## Keyword-to-section maps

### Portugal: sick-benefit amount

- Primary: `baixa médica`, used in the title, introduction, metadata, and explanation of the benefit calculation.
- Supporting: `subsídio de doença`, `simulador baixa médica`, reference earnings, payment percentages, and 2026 rates.
- Questions: how much is paid, how the reference amount works, when the percentage changes, and why a personal result may differ.
- Entities: Segurança Social, CIT, remuneração de referência.
- Separate opportunities: a calculator and the payment calendar.
- Cannibalization boundary: the published self-declaration article owns SNS24 self-certification and process; this article owns amount and calculation.
- Intentionally excluded: broad app-login and unrelated Segurança Social navigation terms.

### Ireland: payment amount and timing

- Primary: `how much is illness benefit in ireland`.
- Supporting: `illness benefit rates 2026`, `what day is illness benefit paid`, payment timing, tax, and increases for dependants.
- Questions: maximum personal rate, when payment begins, payment day, employer sick pay interaction, and tax.
- Entities: Department of Social Protection, MyWelfare, PRSI, statutory sick leave.
- Separate opportunities: a future current-rates table if official bands change.
- Cannibalization boundary: `/ireland/en/blog/illness-benefit-ireland-how-to-claim` owns eligibility, PRSI and application/IB1; Week 2 answers amount and payment timing and links back to that guide.
- Intentionally excluded: a second general claim guide and promises of eligibility.

### Czechia: 2026 calculation

- Primary: `výpočet nemocenské 2026`.
- Supporting: `nemocenská 2026`, `kolik je nemocenská`, reduction limits, daily assessment base, and `nemocenská prvních 14 dní`.
- Questions: who pays the first 14 days, what changes on day 15, and why a calculator estimate can differ.
- Entities: ČSSZ, MPSV, eNeschopenka, temporary incapacity for work.
- Separate opportunity: an interactive calculator after legal and payroll review.
- Cannibalization boundary: the existing eNeschopenka article owns the administrative process; Week 2 owns the money calculation.
- Intentionally excluded: broad process instructions already covered by the existing guide.

### Spain: symptoms and urgent care

- Primary: `tensión alta` with the symptom/emergency intent stated in the title.
- Supporting: `tensión alta síntomas`, warning signs, repeat measurement, hypertensive emergency, primary-care management, and cardiology referral.
- Questions: when to call 112, whether a high number always causes symptoms, and which clinician handles stable hypertension.
- Entities: ESC/ESH, SEH-LELHA, acute target-organ damage, 112.
- Separate opportunity: `tensión alta como bajarla` belongs to the planned non-emergency treatment/lifestyle article.
- Cannibalization boundary: the Week 1 normal-range article owns normal-value tables; Week 2 owns symptoms and triage.
- Intentionally excluded: `remedios de la abuela` and `infusiones` as treatments. They appear only to correct unsafe claims.

### Romania: immediate safety and myth correction

- Primary: `trucuri care scade tensiunea pe loc`, answered by explaining safe repeat measurement and escalation rather than promising a rapid remedy.
- Supporting: `ce scade tensiunea imediat`, `pastila care scade tensiunea`, and the captopril query, all handled as safety corrections.
- Questions: what to do during a high reading, when to call 112, and whether to take an extra or leftover tablet.
- Entities: ESC/ESH, Romanian Ministry of Health, target-organ damage, 112.
- Separate opportunity: long-term hypertension treatment and monitoring frequency.
- Cannibalization boundary: the Week 1 draft owns normal values by age; Week 2 owns immediate safety.
- Intentionally excluded: doses, leftover medication, folk remedies, and guaranteed rapid lowering.

### Portugal: driving medical certificate

- Primary: `atestado médico para carta de condução`.
- Supporting: Group 1, Group 2, electronic certificate, IMT renewal, and psychological assessment.
- Questions: which group applies, who sends the certificate, when an assessment is needed, and whether the consultation guarantees approval.
- Entities: IMT, Justiça, SNS24, RHLC, medical certificate.
- Separate opportunity: `renovação da carta de condução online` has transactional renewal intent and belongs to a renewal-process guide.
- Cannibalization boundary: the service page owns booking; the article explains the administrative Group 1/2 distinction.
- Intentionally excluded: claims that every age/category needs the same documents.

## SERP and competitor findings

- Portugal sick benefit: SNS24 and Segurança Social lead, followed by DrOnline, Coverflex, Santander and FedFinance. The useful gap is a dated worked calculation that keeps medical certification separate from benefit entitlement.
- Ireland: Citizens Information, MyWelfare and gov.ie dominate; Sicknote.com and employer/HR pages appear below them. The gap is a concise current-rate and payment-timing companion, not another eligibility guide.
- Czechia: Peníze.cz, Kurzy.cz, Moneta, MPSV and ČSSZ rank. The gap is a readable 2026 explanation of employer compensation versus state benefit with a transparent worked method.
- Spain: MedlinePlus, Sanitas, NIH Spanish and hospital pages rank. Several results blur a high reading with an emergency. The article uses symptoms and acute organ damage to make the 112 decision clear.
- Romania: clinic, pharmacy and consumer-health pages rank, with heavy remedy and medication intent. The defensible gap is a protocol-based safety article that refuses dosing.
- Portugal driving certificate: SNS24, DrClick, Hospital da Luz, SPMS and Ordem dos Médicos appear. The gap is a simple Group 1/2 comparison and an explanation of electronic submission.

## Internal links and CTAs

Each locale uses absolute, market-local URLs. The service links were checked against production and were active on 24 August 2026: Portugal `baixa-medica` and `certificado-medico-carta-de-conducao`; Ireland `sick-certificate-ireland`; Czechia `neschopenka-online`; Spain `enfermedades-cronicas-online` and `cardiologo-online`; Romania `boli-cronice-online`. Spain also links primary-care/GP content, and Romania links the live `blood-pressure-chart` tool. Every article links doctors and contact pages. No article links `/health/*` or the missing `/blog/categories/` route. CTAs invite assessment and never guarantee a certificate, benefit, diagnosis, or treatment result.

## Backlink record

The current domain profile on 24 August 2026 was rank 43, 550 backlinks, 390 referring pages and 62 referring domains, with 17 broken backlinks and spam score 7. Many current referring domains are weak or spam-adjacent, so quality and topic fit matter more than volume.

Competing exact-page data was uneven: Peníze.cz's sickness-benefit page showed 336 backlinks and 276 referring domains (spam score 37); the sampled DrMax Romania page showed 168 backlinks/referring domains in its summary but inconsistent row detail and spam score 67. Exact-page data for Coverflex, Sicknote.com, Sanitas and DrClick returned no usable referring-domain rows. These are gaps in the provider dataset, not zero-link claims.

| Article | Prospect URL | Outreach angle | Natural anchor / linkable asset |
| --- | --- | --- | --- |
| PT sick benefit | https://www.expatica.com/pt/working/employment-law/portuguese-labor-law-419435/ | Add a dated calculation beneath the existing sick-pay summary | `how Portugal's sickness benefit is calculated`; 2026 worked example |
| PT sick benefit | https://remote.com/country-explorer/portugal | Deeper employee resource beside mandatory benefits | `2026 Portugal sickness-benefit calculation`; calculation table |
| IE payment | https://www.brightcontracts.ie/blog/2013/10/what-will-the-budget-changes-to-illness-benefit-mean-to-employers/ | Replace stale 2013/14 rates with a current reader guide | `2026 Illness Benefit rates and payment timing`; dated rate box |
| IE payment | https://www.peninsulagrouplimited.com/ie/resource-hub/hr/sick-leave-and-sick-pay/ | Explain the separate DSP payment beside employer sick leave | `how much Illness Benefit pays in 2026`; employer/DSP comparison |
| CZ calculation | https://www.expats.cz/czech-news/article/sick-pay-in-czechia-what-you-are-owed-leave-for-sick-kids-inspector-visits | Update 2024 calculation context | `2026 Czech sick-pay calculation`; day 1-14/day 15+ visual |
| CZ calculation | https://blog.foreigners.cz/employment-guide/ | Add a detailed follow-on for foreign workers | `how Czech sick pay is calculated in 2026`; worked method |
| ES urgent care | https://cinfasalud.cinfa.com/p/hipertension/ | Add a symptom-led 112 decision pathway | `síntomas de tensión alta y cuándo llamar al 112`; red-flag box |
| ES urgent care | https://www.farmaceuticos.com/tu-farmaceutico-informa/consejos-de-salud/urgencias-farmacia/ | Shareable patient companion after a pharmacy reading | `guía para pacientes con tensión alta y síntomas de alarma`; triage flow |
| RO safety | https://www.drmax.ro/articole/hipertensiunea-arteriala-hta-tot-ce-trebuie-sa-stii-despre-aceasta-afectiune | Add a safe myth-correction resource | `ce scade tensiunea rapid și când trebuie sunat la 112`; captopril safety box |
| RO safety | https://www.doc.ro/hipertensiune/ce-trebuie-sa-stii-despre-criza-hipertensiva-sau-puseul-de-tensiune | Current protocol-based companion | `ce faci în siguranță când tensiunea crește brusc`; 112 decision guide |
| PT driving | https://www.expatica.com/pt/living/transportation/portuguese-driving-license-106574/ | Expand the digital-certificate mention | `Portugal driving medical certificate: Group 1 vs Group 2`; comparison table |
| PT driving | https://escolasconducao.com/blog/atestado-medico-carta-conducao | Complement the process guide with the legal group distinction | `diferenças entre os grupos 1 e 2 no atestado médico`; checklist |

Backlink prospects are prospects only. Acquired backlinks: **none**. Outreach sent: **none**.

## Primary source list

- Portugal sickness benefit: https://www.gov.pt/servicos/obter-informacoes-sobre-o-subsidio-de-doenca and https://www.seg-social.pt/ptss/pssd/documento/cmdde8gsx000qi12yzi40plc6?dswid=5276
- Ireland: https://services.mywelfare.ie/en/topics/health-disability-illness/illness-benefit/ and https://www.gov.ie/en/department-of-social-protection/services/illness-benefit/
- Czechia: https://www.mpsv.cz/nemocenske-pojisteni and https://www.cssz.cz/web/cz/nemocenske
- Spain: Spanish Ministry/Community of Madrid clinical guidance plus current ESC/ESH guidance. A clinician must confirm every threshold and escalation statement before publication.
- Romania: Ministry of Health hypertension protocol and official DSU/Fiipregatit emergency guidance. Patient-facing official material is limited, so the copy remains conservative and requires Romanian clinician review.
- Portugal driving certificate: https://justica.gov.pt/Servicos/Revalidar-carta-de-conducao and https://www.imt-ip.pt/sites/IMTT/Portugues/Condutores/RevalidacaoCartaConducao/Paginas/RevalidacaoCartaConducao.aspx

## CMS manifest and publication gates

The safe seeder prints the canonical manifest after its dry run and after creation. It checks the country, active service, registered author/reviewer, base slugs, translation slugs, and title collisions again inside each transaction. Any existing row causes the whole topic to be preserved and skipped.

Production result, 25 August 2026: a fresh six-primary dry run returned six
collision-free `create` actions. The user then explicitly approved creation, and the
same primary-only manifest was applied. A read-only verification pass returned all
six rows as `skip-existing` with status `DRAFT`:

| Topic / locale | CMS ID |
| --- | --- |
| Portugal sickness benefit / PT | `cmt8la5mj0000csjuzvvr49bg` |
| Ireland Illness Benefit payment / EN | `cmt8la96q0002csju6spj0o0n` |
| Czech sickness calculation / CS | `cmt8ladb60004csjuxgxyk4nu` |
| Portugal driving certificate / PT | `cmt8lahc30006csjuw55xnemg` |
| Spain urgent blood pressure / ES | `cmt8laldn0008csjufi90oq5x` |
| Romania blood-pressure safety / RO | `cmt8lapi9000acsju2l7jkq5m` |

No translation row was created in that primary-only transaction. No existing post was
updated. At that readback, all six records were unpublished.

Production translation result, 29 August 2026: after a clean 13-row dry run, the
approved `EN/DE`, `RO/ES/PT/DE`, `EN/DE`, `EN/DE`, `EN/DE`, and `EN` locale sets
were added in one guarded transaction. Readback verified 13 translation rows with
localized metadata, bodies and cover alt text. At that transaction's readback, the
six parent posts remained active `DRAFT` records with null publication and review
dates. The remaining 17 research variants were not part of that initial import.

Remaining translation result, 29 August 2026: the live audit later found exactly 17
absent locale rows. After the Claude Blog translation/localization and humanization
review, a separate exact-matrix importer completed a clean dry run and created those
17 rows in one transaction. It locked the six parents and 13 existing translations,
then verified that none of them changed. The final independent audit returned six
parents, 30 translations, and complete CS/DE/EN/ES/PT/RO coverage for every topic.
Five parents were `DRAFT`; the Spain urgent-blood-pressure parent was `PUBLISHED`
before this completion and was preserved verbatim. All six retained the `Global
Health Medical Team` author byline. Existing keyword evidence covered every topic,
so this completion used no OpenSEO credits.

~~Publication remains blocked until:~~ **SUPERSEDED 2026-09-03 — all six parents were
published on 2026-08-29 and this gate list no longer describes any live hold. Kept as
the record of what the batch required at the time; see the banner at the top of this
file for verified current state.**

- a native editor reviews each locale before a draft parent is published or future translated copy is materially revised;
- the named clinician accepts authorship/review attribution and reviews the article;
- the Ireland editor confirms the narrow payment intent does not compete with the published claim guide;
- current annual benefit figures and legal rules are checked on the day of publication;
- Spain and Romania clinical reviewers approve the 112, medication and target-organ-damage language;
- internal links to adjacent Week 1 drafts are added only after those pages are published/indexable;
- backlink outreach receives separate approval; and
- an administrator changes the CMS status in the normal publishing workflow.
