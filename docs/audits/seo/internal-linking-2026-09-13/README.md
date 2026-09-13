# Internal-linking proposal — 13 September 2026

For the receiving implementation agent: [implementation handover](IMPLEMENTATION-HANDOVER.md).

Repair broken or misleading links first, then add seven relevant links to existing pages. No new pages are needed. Many service↔article and service↔tool links already exist, including the strongest Romanian calorie and Irish Illness Benefit clusters.

**Proposal only:** no website content, production records or deployment changed. Internal links can improve discovery, relevance and navigation. They cannot guarantee rankings or directly increase a backlink-based Domain Rating.

## Evidence and limitations

- OpenSEO project GlobalHealthNew: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
- Fresh GSC through OpenSEO: **14 August–10 September 2026**, final web data, page dimension, **1,516 rows across two completed pagination calls**. Last response hasMore=false. These are URL-market segments across all searcher countries, not country-resident traffic. No sitewide blended position is used.
- GA4 property **547083375**, Europe/Dublin, Organic Search, **10–12 September**: **128 landing-page sessions, 13 key events, zero recorded purchase transactions**, 75 returned rows. Seven sessions have landing page “(not set)”. Event breakdown: **12 begin_booking events from 9 users; 1 booking_confirmed event from 1 user**. These are not 13 completed bookings; no recorded purchase does not prove no revenue.
- GA4 collection was restored September 9. Three days cannot establish reliable conversion winners or a before/after trend. Spanish anxiety article: 4 sessions; Czech pressure tool: 3; Romanian calorie tool: 2; Irish claim/payment guides: 1 each. Consent and reporting coverage also limit attribution.
- OpenSEO's latest stored audit completed **September 9**, only **50 pages**, mostly Ireland services. Its link counts do not establish incoming-link counts or a six-market link graph. No full crawl or paid keyword research was started; the OpenSEO calls used here are credit-free.
- **60 public fetches covering 59 distinct requested URLs**, including one repeated lab-hub failure. Captured main-content anchors, final URLs, canonicals and robots. This is a targeted sample, not a full orphan audit. Header/footer and client-only navigation were not comprehensively assessed; live appointment slots were not checked.
- Romanian calculator query/page check: 117 disclosed rows. “calculator calorii” alone: **19 clicks / 1,475 impressions / position 7.5**, supporting the page's informational intent. Private queries mean query totals need not match page totals.

## Best measured pages to support

Same 28-day GSC window. Page position averages multiple queries; it is a prioritisation signal, not one keyword's rank.

| Page | Clicks | Impressions | Position |
| --- | ---: | ---: | ---: |
| [/romania/ro/tools/calorie-calculator](https://www.myglobalhealth.online/romania/ro/tools/calorie-calculator) | 47 | 3721 | 8.8 |
| [/ireland/en/blog/illness-benefit-ireland-how-to-claim](https://www.myglobalhealth.online/ireland/en/blog/illness-benefit-ireland-how-to-claim) | 9 | 2378 | 11.7 |
| [/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing](https://www.myglobalhealth.online/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing) | 10 | 1921 | 8.8 |
| [/brazil/pt/tools/calorie-calculator](https://www.myglobalhealth.online/brazil/pt/tools/calorie-calculator) | 7 | 2250 | 8.7 |
| [/spain/es/tools/blood-pressure-chart](https://www.myglobalhealth.online/spain/es/tools/blood-pressure-chart) | 5 | 1831 | 19.2 |
| [/spain/es/blog/baja-laboral-por-ansiedad-como-funciona](https://www.myglobalhealth.online/spain/es/blog/baja-laboral-por-ansiedad-como-funciona) | 13 | 1022 | 11.9 |
| [/czechia/cs/tools/blood-pressure-chart](https://www.myglobalhealth.online/czechia/cs/tools/blood-pressure-chart) | 20 | 901 | 11.2 |
| [/portugal/pt/tools/blood-pressure-chart](https://www.myglobalhealth.online/portugal/pt/tools/blood-pressure-chart) | 8 | 668 | 8.5 |

Romania's calculator is the strongest informational entry point in this sample. Spain's pressure tool has room around page two. Ireland's benefit pages already have useful links. Brazil's calculator has substantial impressions but few clicks; links alone may not solve its CTR.

## Repairs before expansion

1. **Czech diabetes article:** body consultation CTA to `/cs/czech-republic/diabetologick%C3%A1-konzultace` returned **404**. Another generic booking CTA points to the root. Propose the actual chronic-disease service, accurately labelled general care, not a diabetologist appointment.
2. **Brazil diabetes article:** body booking CTA to `/br/clinica-geral` returned **404**. A separate bottom CTA already reaches the chronic-disease service. Repair the body destination.
3. **Portugal hypertension guide:** `services/hypertension-consultation` returned **404**. Remove that unsupported offer unless equivalent staffed care is confirmed. Its existing family-medicine and cardiology aliases redirect to verified canonical services; update them directly.
4. **Ireland blood-test article:** links to `/ireland/en/lab-tests`, which returned **404/noindex twice**. GSC still records 4 clicks / 509 impressions in the earlier window. Diagnose temporary availability versus intentional removal before restoring the hub or removing the offer. Do not substitute an unrelated consultation. No new links to the hub proposed.
5. **Spanish anxiety article:** “Consulta de salud mental” currently links to the private medical-justification service. The actual general mental-health service is live/indexable. Retarget that particular CTA after applicable supply/review checks; preserve accurate document links and the public-service/mutua statutory sick-leave explanation.

These are current rendered findings; the older stored audit did not establish their present state.

## Exact link proposals

**Seven additions, four repairs, one retarget, one placement improvement.** P0 fixes navigation first; P1/P2 are editorial priorities, not estimated ranking uplift. All listed sources/destinations were HTTP 200; proposed destinations self-canonical and indexable. New destinations were absent from captured source main-content anchors.

| # / Priority | Source | Destination and suggested anchor | Action and placement |
| --- | --- | --- | --- |
| 1 · P0 | [/czechia/cs/blog/diabetes-ticha-nemoc](https://www.myglobalhealth.online/czechia/cs/blog/diabetes-ticha-nemoc) | [Konzultace chronického onemocnění](https://www.myglobalhealth.online/czechia/cs/services/chronicka-onemocneni) | **repair** — Replace the broken legacy diabetes-consultation CTA in the follow-up section. Describe general chronic-disease review, not a diabetologist appointment. |
| 2 · P0 | [/brazil/pt/blog/diabetes-doenca-silenciosa](https://www.myglobalhealth.online/brazil/pt/blog/diabetes-doenca-silenciosa) | [Acompanhamento de doenças crônicas](https://www.myglobalhealth.online/brazil/pt/services/doencas-cronicas-online) | **repair** — Replace the broken /br/clinica-geral body CTA; a separate bottom CTA already reaches this correct service. |
| 3 · P0 | [/portugal/pt/health/hipertensao](https://www.myglobalhealth.online/portugal/pt/health/hipertensao) | [Consulta de Cardiologia](https://www.myglobalhealth.online/portugal/pt/services/consulta-cardiologia) | **repair** — Use the canonical URL for the existing cardiology link; remove the separate 404 hypertension-consultation offer unless an equivalent staffed service is confirmed. |
| 4 · P0 | [/portugal/pt/health/hipertensao](https://www.myglobalhealth.online/portugal/pt/health/hipertensao) | [Consulta de Medicina Geral e Familiar](https://www.myglobalhealth.online/portugal/pt/services/medicina-geral-e-familiar) | **repair** — Replace the existing family-and-general-medicine redirect URL with its observed final canonical destination. |
| 5 · P1 | [/spain/es/blog/baja-laboral-por-ansiedad-como-funciona](https://www.myglobalhealth.online/spain/es/blog/baja-laboral-por-ansiedad-como-funciona) | [Consulta de salud mental](https://www.myglobalhealth.online/spain/es/services/salud-mental-online) | **retarget** — Retarget only the existing mental-health-labelled CTA, currently pointing to justificante-medico-online. Keep document links accurate and preserve the public/mutua sick-leave explanation. Confirm appointment supply and applicable Spain review holds before publication. |
| 6 · P1 | [/romania/ro](https://www.myglobalhealth.online/romania/ro) | [Calculator de calorii](https://www.myglobalhealth.online/romania/ro/tools/calorie-calculator) | **add** — Add one useful-tools resource link near weight-management information; retain the existing service CTA. |
| 7 · P1 | [/spain/es/tools/blood-pressure-chart](https://www.myglobalhealth.online/spain/es/tools/blood-pressure-chart) | [Qué significan los valores de tensión arterial](https://www.myglobalhealth.online/spain/es/blog/tension-arterial-normal-tabla-edad-sexo) | **add** — Add beneath the explanation of results. The article already links back to the tool. |
| 8 · P1 | [/spain/es/blog/como-bajar-la-tension-que-funciona-segun-la-evidencia](https://www.myglobalhealth.online/spain/es/blog/como-bajar-la-tension-que-funciona-segun-la-evidencia) | [Consultar la tabla de tensión arterial](https://www.myglobalhealth.online/spain/es/tools/blood-pressure-chart) | **add** — Add in the measurement/interpretation section; keep emergency instructions prominent. |
| 9 · P1 | [/portugal/pt/health/hipertensao](https://www.myglobalhealth.online/portugal/pt/health/hipertensao) | [Tabela de tensão arterial](https://www.myglobalhealth.online/portugal/pt/tools/blood-pressure-chart) | **add** — Add beside the paragraph about understanding readings. Repair the broken service link on this page first. |
| 10 · P2 | [/portugal/pt/tools/blood-pressure-chart](https://www.myglobalhealth.online/portugal/pt/tools/blood-pressure-chart) | [Acompanhamento da hipertensão](https://www.myglobalhealth.online/portugal/pt/health/hipertensao) | **add** — Add a reading-resource link alongside the existing care choices after repairing the guide's dead service link. |
| 11 · P2 | [/brazil/pt](https://www.myglobalhealth.online/brazil/pt) | [Calculadora de calorias](https://www.myglobalhealth.online/brazil/pt/tools/calorie-calculator) | **add** — Add a useful-tools resource beside weight-management information. Keep the care link; do not market calculations as personalised medical advice. |
| 12 · P2 | [/czechia/cs](https://www.myglobalhealth.online/czechia/cs) | [Tabulka krevního tlaku](https://www.myglobalhealth.online/czechia/cs/tools/blood-pressure-chart) | **add** — Add a useful-tools resource beside chronic-care information, without another sitewide footer list. |
| 13 · P2 | [/ireland/en/blog/illness-benefit-ireland-how-to-claim](https://www.myglobalhealth.online/ireland/en/blog/illness-benefit-ireland-how-to-claim) | [Illness Benefit payment rates and timing](https://www.myglobalhealth.online/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing) | **reposition** — This link already exists in related articles. Place one descriptive link where the claim guide discusses payments; do not describe this as a missing link or add repeated CTAs. |

Homepage suggestions are relevant resource links beside existing care topics, not missing-navigation defects. Keep service choices visible. Proposed native-language anchors are editorial drafts; retain market review requirements where clinical copy changes.

## Already present — keep these

- Romania calorie tool ↔ weight-management service; medical-letter article ↔ referral/investigation service.
- Brazil calorie tool ↔ weight-management service; test-request article ↔ test-request service.
- Czech pressure tool ↔ chronic-disease service; ADHD tool ↔ general mental-health service; calorie/BMI tools ↔ weight-management service.
- Ireland sick-cert service → claim, payment and employee-rights guides; benefit articles → sick-cert assessment.
- Portugal cardiology ↔ pressure tool; driving-certificate article ↔ its service.
- Spain chronic-disease service → pressure articles and tool. Two pressure articles already link to the tool; the lowering-pressure article does not.

Do not duplicate these links or create a keyword footer. Correct author/reviewer links can cross markets and should not be rewritten as service links.

Spain's pressure tool already promotes cardiology, but the latest ledger records no open cardiology appointment. This proposal does not expand that promotion. Spain's clinical/supply holds and Brazil's exact-packet approval boundaries still apply; this report is not clinical approval.

## Rollout and measurement

Repair the confirmed faults first. For new additions, start with **three clusters: Romanian calories, Spanish blood pressure and Portuguese hypertension**. Keep Ireland's already-linked benefit cluster on watch; its contextual placement improvement is optional.

Recheck source text, existing anchors and destination availability before publication because concurrent content releases can change them. Use normal crawlable links, canonical destinations, descriptive anchors and the same market/language. Avoid internal UTM parameters or promises of diagnosis, guaranteed certificates or unavailable specialists.

Record the exact edited cohort and publication date in the canonical ledger. Verify rendered links immediately. At **28 and 56 days after publication**, compare matched GSC query/page cohorts, clicks and impressions, with GA4 organic sessions and separately named booking events as supporting outcomes. Other content releases and seasonality prevent attributing before/after gains solely to links.

## Files and proof

[Exact CSV](proposed-links.csv) · [JSON proposals](proposed-links.json) · [OpenSEO/GSC/GA4 responses](evidence.json) · [Romanian query check](query-check.json).

Public parsed captures: [initial pages](live-pages.json), [targets](live-targets.json), [follow-up](live-followup.json), [legacy resolutions](live-legacy.json), [repair targets](live-repair-targets.json). No credentials, patient records or raw third-party HTML retained.

[Read-only collector](check-live.mjs) reuses the repository's existing HTML parser. Validation passed for all 13 rows: observed 200 sources/targets, indexable self-canonical destinations, matching market/language; seven additions and one retarget absent from captured main anchors; the Irish repositioned link confirmed already present.
