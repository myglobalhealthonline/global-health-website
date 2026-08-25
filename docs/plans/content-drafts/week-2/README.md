# Week 2 editorial batch

Prepared 24 August 2026. These are AI-assisted local working drafts. Every kept locale requires a native-language editor and the medical articles require clinician review before publication. **No Week 2 CMS records exist yet.** The production dry run created no rows and changed no existing content.

Local source coverage: every one of the six topics has EN, PT, ES, CS, RO and DE copy, for a 36-variant research archive. The production-preparation manifest is now restricted to the exact 19 evidence-backed variants in the canonical editorial plan: `pt/en/de` for both Portugal topics, `en/ro/es/pt/de` for Ireland, `cs/en/de` for Czechia, `es/en/de` for Spain, and `ro/en` for Romania. The 17 unapproved variants remain in the TypeScript research source only and are not emitted as standalone HTML or accepted by the seeder. The article jurisdiction remains the topic market; the language variant does not replace the applicable local law, benefit system, emergency pathway or service route.

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

CMS records created or changed by this implementation: **zero**. Acquired backlinks:
**zero**. Outreach sent: **zero**. Publication, deployment and push: **none**.

## Revised rollout, 25 August 2026

- Rewrite the kept articles to the compact editorial standard before seeding: usually 600-900 words for administrative/process content and 700-1,200 words for clinical safety content. These are working ranges, not ranking targets.
- Keep one search intent and one service CTA family per article. Use only the secondary queries that support that intent; do not insert every keyword returned by OpenSEO.
- Create the six primary-language CMS drafts first. The other 13 approved locale variants remain local until native-language review is available.
- Review and release the administrative cohort first: Portugal sickness-benefit amount, Ireland Illness Benefit amount/timing, and Czech sickness-pay calculation.
- Release the Portugal driving-certificate, Spain urgent blood-pressure, and Romania blood-pressure-safety cohort only after the relevant legal or clinical review is complete.
- Do not seed the 17 unplanned locale variants. Preserve them locally as research material unless later Search Console or migration-corridor evidence justifies a new locale decision.

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

Production dry-run result, 24 August 2026: all six base posts and 30 translation rows were collision-free and eligible for `DRAFT` creation. CMS records created from this Week 2 pack: **none**. Later translation completion for two pre-existing draft posts did not seed these six Week 2 topics. The Week 2 production mutation remains pending fresh direct user approval, so there are no Week 2 CMS IDs to report yet and no existing records were changed by this seeder.

Publication remains blocked until:

- a native editor reviews each of the 19 kept locale drafts before that locale is published;
- the named clinician accepts authorship/review attribution and reviews the article;
- the Ireland editor confirms the narrow payment intent does not compete with the published claim guide;
- current annual benefit figures and legal rules are checked on the day of publication;
- Spain and Romania clinical reviewers approve the 112, medication and target-organ-damage language;
- internal links to adjacent Week 1 drafts are added only after those pages are published/indexable;
- backlink outreach receives separate approval; and
- an administrator changes the CMS status in the normal publishing workflow.
