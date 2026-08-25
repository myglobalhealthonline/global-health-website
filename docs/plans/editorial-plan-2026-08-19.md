# Editorial plan — 43 article candidates, 8-week decision horizon

Companion to `docs/plans/seo-followup-batch-2026-08-19.md` §4, which holds the
research this schedule is built from. Ledger: `docs/plans/seo-control-state.md`.

Written 2026-08-19 to answer two questions:

> *We'll do 6 articles a week — 36 counting locales. Will it help us rank?*
> *Should we use different keywords for different locales?*

---

## 1. Short answers

**Will it help?** Yes, but not evenly, and not because of the volume. The gains
come from *which* topics you pick, not how many URLs you publish. On this site
the evidence for that is unusually clear — see §2.

**Different keywords per locale?** The right rule is one level up from
keywords: **vary the topic by country, and translate into a locale only where
there is a real migrant population that speaks it.** Blanket 6× translation is
where this site is currently wasting most of its editorial effort.

**One caution before the plan.** 6 topics a week means about **12 clinician
sign-offs a week** — a named author and a named reviewer per article, which is
what `BlogPost` requires and what the Article schema publishes. That is the
binding constraint on this whole plan, not the writing. If the clinical team
cannot sustain it, the honest move is to publish fewer articles, not to loosen
the byline rule.

---

## 2. What the existing blog already proves

77 blog rows are live; 72 appear in Search Console for the 90 days to
2026-08-16. That is a real experiment already run, so the plan below is built
on it rather than on assumptions.

| | URLs | Clicks | Impressions | Clicks per URL |
| --- | ---: | ---: | ---: | ---: |
| Native locale (`ireland/en`, `portugal/pt`, `czechia/cs`, …) | 16 | 21 | 4,982 | **1.31** |
| All other locales | 56 | 14 | 2,456 | 0.25 |
| **Total** | **72** | **35** | **7,438** | 0.49 |

Three things fall out of that, and they shape everything below.

### 2.1 Topic choice outweighs everything else

Two Ireland articles — `sick-certificate-ireland-employee-rights` (2,020
impressions) and `illness-benefit-ireland-how-to-claim` (1,121) — produce
**42% of all blog impressions from 2 of 72 URLs.** Both are administrative
processes with high, year-round, country-specific demand.

Against that, Portugal's blog earns 4 clicks in 90 days despite Portugal being
the second-strongest market, because the Portuguese topics chosen were
`diabetes` and `hipercolesterolemia` — generic conditions, no local specificity,
competing against national health services and every pharmacy chain in the
country. `portugal/pt/blog/diabetes-a-doenca-silenciosa` has **1 impression in
90 days**.

The lesson is not "write more". It is: **write the thing only a licensed clinic
operating in that country can credibly explain.**

### 2.2 Locale variants do earn — but only along migration corridors

40% of blog clicks come from non-native locales, so the fan-out is not waste.
But the winners are all the same shape:

| URL | Clicks | Position |
| --- | ---: | ---: |
| `ireland/ro/…/illness-benefit-irlanda-cum-soliciti` | 2 | 6.1 |
| `ireland/es/…/illness-benefit-irlanda-como-solicitarlo` | 2 | 8.6 |
| `czechia/de/…/neschopenka-krankschreibung-in-tschechien` | 2 | 4.3 |
| `ireland/de/…/illness-benefit-irland-so-beantragen` | 1 | 3.6 |
| `portugal/de/…/krankmeldung-selbsterklaerung-portugal` | 1 | 2.7 |

Every one is **a country's administrative process, explained in the language of
a community that actually lives there** — Romanians and Spaniards working in
Ireland, Germans living in Czechia and Portugal.

The losers are the opposite shape — generic conditions translated for the sake
of completeness:

| URL | Impressions | Position |
| --- | ---: | ---: |
| `czechia/ro/…/diabetes-ticha-nemoc` | 2 | 100.5 |
| `czechia/pt/…/diabetes-ticha-nemoc` | 20 | 43.2 |
| `spain/es/…/diabetes-una-enfermedad-silenciosa` | 7 | 46.9 |

**24 of the 72 live blog URLs have 2 impressions or fewer.** That is a third of
the blog doing nothing at all, and almost all of it is translation-for-the-sake-of-it.

### 2.3 English earns everywhere

English is not just Ireland's native locale. `czechia/en/…/neschopenka-czech-sick-note-explained`
has 296 impressions, `portugal/en/…/autodeclaracao-de-doenca-ou-baixa-medica`
168 at position 4.7. Expats search in English regardless of where they live.
English is worth publishing in every market.

---

## 3. The locale rule

Instead of 6 locales for every article, fan out by evidence:

| Market | Always publish | Add when the topic is administrative / legal | Skip unless proven |
| --- | --- | --- | --- |
| **Ireland** | `en` | `ro`, `es`, `pt`, `de` | `cs` |
| **Portugal** | `pt`, `en` | `de` | `cs`, `ro`, `es` |
| **Czechia** | `cs`, `en` | `de` | `pt`, `es`, `ro` |
| **Spain** | `es`, `en` | `de` | `pt`, `ro`, `cs` |
| **Romania** | `ro`, `en` | — | all others |
| **Brazil** | `pt`, `en` | — | all others |

This turns "6 topics × 6 locales = 36 URLs a week" into roughly **6 topics ×
3–5 locales = 20–26 URLs a week**, drops the translations the data shows earn
nothing, and cuts translation cost by about a third — without losing a single
click that the current blog actually gets.

**Two rules that go with it:**

- **Never translate a generic condition article across markets.** A diabetes
  explainer in five languages is five pages competing with national health
  services. A sick-note process article in five languages is five pages
  competing with nobody.
- **Do per-locale keyword work only for the locales you keep.** `illness
  benefit` in Romanian is not a translation of the English phrase — Romanians
  in Ireland search a mix of Romanian and English terms. Check each kept locale
  in Search Console after publishing rather than guessing up front; the sample
  above is small (1–2 clicks per URL) and should be re-read once these articles
  have 90 days of data.

---

## 4. What to realistically expect

Being straight about this, because "will it help us rank" deserves a real
answer rather than a yes.

**Where it will clearly work.** The clusters in §5 with genuine demand and *no
page at all* — Portuguese self-certification, Czech sick pay, Romanian blood
pressure, Irish ADHD and haemochromatosis. Nothing on the site currently
addresses them. Expect first movement in 4–8 weeks and meaningful positions in
3–6 months.

**Where it will help partially.** Terms where the site already appears at
position 40–80. Content typically lifts these into the 10–25 range. Getting
into the top 5 on the competitive ones needs the off-site work, not more
articles — the backlink profile is rank 43 with 59 referring domains, of which
three are genuine. That ceiling is documented in `docs/client/off-site-authority-plan-2026-08-19.html`
and no amount of publishing moves it.

**Where volume actively hurts.** This is a YMYL medical site going from 77 blog
rows to roughly 200 in seven weeks. Google's quality systems are sensitive to
exactly that pattern when the added pages are thin. Six well-sourced,
clinician-reviewed articles a week is fine. Six lightly-rewritten ones a week,
fanned out to 36 URLs, is the profile of a site that gets quietly demoted.
**The locale rule in §3 exists partly to keep this from happening.**

**What would make this fail.** Missing the clinician bylines. Every article
below needs a named author, a named reviewer, and a real `lastReviewedAt`. A
fabricated review-count claim has already reached production on this site once.
If a byline is not available, the article does not publish — it waits.

---

## 5. The schedule — 42 topics over 7 weeks, plus a Week 8 decision

Six topics a week. Each week deliberately spans several markets so no market
waits seven weeks for its first article. Ordered by expected value: weeks 1–2
are the clusters with the highest demand and the least existing competition
from the site itself.

Volume figures are Google Ads monthly search volume for the market and language
shown, from OpenSEO. Where a row cites impressions instead, that is Search
Console for the 90 days to 2026-08-16 — impressions are not search volume and
the two are not interchangeable. **KD** is keyword difficulty out of 100.

---

### Week 1 — the biggest administrative clusters

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PT | Autodeclaração de doença: como funciona e quando não chega | `autodeclaração de doença` | 12,100 · 0 | `services/baixa-medica` | Segurança Social; SNS24; the enabling Decreto-Lei |
| 2 | IE | Illness Benefit in Ireland: eligibility, rates and the IB1 form | `illness benefit ireland` | 6,600 · 5 | sick-cert + GP consultation | Dept of Social Protection; Citizens Information; MyWelfare |
| 3 | ES | Tensión arterial normal: tabla por edad y sexo | `tensión arterial normal` | 33,100 · 10 | `services/cardiologo-online` | ESC/ESH 2024; SEH-LELHA; Soc. Española de Cardiología |
| 4 | RO | Cât este tensiunea normală în funcție de vârstă | `cat este tensiunea normala in functie de varsta` | 6,600 · 0 | cardiology; BP tool | ESC/ESH 2024; Soc. Română de Cardiologie; Min. Sănătății |
| 5 | CZ | E-neschopenka: jak funguje krok za krokem | `neschopenka` | 2,400 · 10 | `services/neschopenka-online` | ČSSZ; MPSV; ePortál ČSSZ docs |
| 6 | IE | How to get a sick cert online — what employers can and cannot refuse | `sick cert online` | 880 · 0 | sick-cert service | Citizens Information; Dept of Social Protection; Medical Council remote-certification guidance |

*Locales:* 1 → pt, en, de · 2 → en, ro, es, pt, de · 3 → es, en, de ·
4 → ro, en · 5 → cs, en, de · 6 → en, ro, es, pt, de

---

### Week 2 — money and entitlement follow-ups

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | PT | Baixa médica: quanto se recebe e como é calculada | `baixa médica` | 4,400 · 20 | baixa-medica | Segurança Social subsídio de doença tables (state the year) |
| 8 | IE | How much is Illness Benefit, and when is it paid? | `how much is illness benefit in ireland` | 880 · 2 | sick-cert; GP | Dept of Social Protection rate tables |
| 9 | CZ | Kolik je nemocenská a jak se počítá | `výpočet nemocenské 2026` | 1,600 · 31 | neschopenka-online | ČSSZ calculation rules; MPSV |
| 10 | ES | Tensión alta: síntomas y cuándo acudir a urgencias | `tensión alta` | 12,100 · 3 | cardiology; GP | ESC/ESH 2024; SEH-LELHA |
| 11 | RO | Ce scade tensiunea rapid — și ce nu | `trucuri care scade tensiunea pe loc` | 9,900 · 0 | cardiology; chronic disease | ESC/ESH 2024; SRC |
| 12 | PT | Atestado médico para carta de condução: grupos 1 e 2 | `atestado médico para carta de condução` | 1,900 · 0 | `services/certificado-medico-carta-de-conducao` | IMT — Regulamento da Habilitação Legal para Conduzir; DGS; Ordem dos Médicos |

> **#11 needs care.** `pastila care scade tensiunea` (4,400) and `de la ce
> tensiune se ia captopril` (4,400) sit in this cluster. Write it as
> myth-correction and "here is when to seek care" — **no dosing advice, no
> endorsement of folk remedies.** Same applies to #10's neighbours
> `remedios de la abuela para bajar la tensión` (1,900) and
> `infusiones para bajar la tensión` (1,900).

*Locales:* 7 → pt, en, de · 8 → en, ro, es, pt, de · 9 → cs, en, de ·
10 → es, en, de · 11 → ro, en · 12 → pt, en, de

---

### Week 3 — the conditions with local specificity

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | IE | Haemochromatosis in Ireland: why the HFE gene test matters here | `haemochromatosis in ireland` | 260 · 3 (+39 impr at pos 77) | `/ireland/en/lab-tests` | HSE; Irish Haemochromatosis Association; EASL iron-overload guidance |
| 14 | IE | Adult ADHD assessment in Ireland: routes, waiting times, cost | `adhd assessment ireland` | 1,900 · 0 | mental health; psychiatry | NICE NG87; HSE ADHD pathway; College of Psychiatrists of Ireland |
| 15 | RO | Scrisoarea medicală: ce este, cât e valabilă, cine o eliberează | `scrisoare medicala` | 1,000 · 0 | medical-letter service | CNAS; Min. Sănătății (Contract-cadru); Colegiul Medicilor |
| 16 | CZ | Krevní tlak podle věku: tabulka a co znamená | `krevní tlak podle věku` | 2,400 · 0 | GP; cardiology | ESC/ESH 2024; Česká kardiologická společnost; ÚZIS |
| 17 | ES | Tensión baja: causas, síntomas y qué hacer | `tensión baja síntomas` | 8,100 · 2 | GP consultation | ESC/ESH 2024; SEMERGEN |
| 18 | PT | Consulta do viajante: vacinas, prazos e o que levar | `consulta do viajante` | 5,400 · 3 | `services/consulta-do-viajante` | DGS travel health; INSA; WHO IHR requirements |

> **#15 is the single best position-to-effort ratio on this list.** Romania
> already ranks 5.4 on `scrisoare medicala` with no dedicated article behind
> it. Expand or interlink the existing `medical-letter-romania` post rather
> than publishing a second one that competes with it.

*Locales:* 13 → en, pt, ro · 14 → en, ro, es, pt · 15 → ro, en ·
16 → cs, en, de · 17 → es, en, de · 18 → pt, en, de

---

### Week 4 — process detail and the second tier

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 19 | PT | Atestado multiusos: quem tem direito e o que muda | `lista de doenças para atestado multiusos` | 1,900 · 0 | certificados-medicos | Tabela Nacional de Incapacidades; DGS; Segurança Social |
| 20 | CZ | Vycházky během neschopenky: pravidla a kontroly | `kontrola nemocenské po 22 hodině` | 590 · 0 | neschopenka-online | ČSSZ; zákon o nemocenském pojištění |
| 21 | IE | Long-term sick leave rights in Ireland | 40 impr at pos ~68 | `long-term illness benefit` 390 · 15 | sick-cert | Citizens Information; WRC |
| 22 | RO | Testarea ADHD la adulți în România | `test adhd adulti` | 390 · 0 (+40 impr, `test adhd adulti gratis` at pos 10.6) | psychiatry; psychology | NICE NG87; Colegiul Psihologilor; the ASRS v1.1 instrument |
| 23 | ES | Cómo bajar la tensión: qué está respaldado por evidencia | `tensión alta como bajarla` | 3,600 · 4 | cardiology; `enfermedades-cronicas-online` | ESC/ESH 2024; SEH-LELHA |
| 24 | CZ | Czech sick note explained in English (expat guide) | `neschopenka anglicky` — 12 impr at pos 11 | — | neschopenka-online | ČSSZ English pages; MPSV |

*Locales:* 19 → pt, en · 20 → cs, en, de · 21 → en, ro, es, pt ·
22 → ro, en · 23 → es, en, de · 24 → en only

---

### Week 5 — mental health, measurement, referral

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | PT | Baixa por burnout e baixa psicológica: o que muda | `baixa psicológica paga a 100` | 880 · 0 | `services/saude-mental` | Segurança Social; DGS mental-health norms; Ordem dos Psicólogos |
| 26 | IE | Medical certificate for stress or mental-health leave | 23 impr at pos 27 | — | mental-health consultation | HSE mental health; WRC; Medical Council |
| 27 | ES | Test de TDAH en adultos: qué mide y qué no | `test tdah adultos` — 12 impr at pos 47 | — | `services/psiquiatra-online` | NICE NG87; Soc. Española de Psiquiatría; ASRS |
| 28 | RO | La ce oră se măsoară tensiunea arterială | `la ce ora se masoara tensiunea arteriala` | 1,600 · 0 | BP tool; cardiology | ESH home-BP-monitoring guidance; SRC |
| 29 | CZ | Jak snížit vysoký tlak — co funguje a co ne | `jak snížit krevní tlak okamžitě` | 1,300 · 0 | GP; chronic disease | ESC/ESH 2024; ČKS — **correct the folk remedies** (`babské rady na vysoký tlak`, 880), do not repeat them |
| 30 | IE | Reading a blood-pressure chart: what the numbers mean | `blood pressure chart ireland` — 14 impr at pos 7.6 | — | GP; chronic disease | ESC/ESH 2024; HSE; Irish Heart Foundation |

*Locales:* 25 → pt, en · 26 → en, ro, es, pt · 27 → es, en ·
28 → ro, en · 29 → cs, en · 30 → en, ro, es, pt

---

### Week 6 — testing and diagnostics

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 31 | IE | Vitamin D and B12 testing at home: when it is worth it | ~50 impr across `at home vitamin d test`, `b12 test kit` | — | `/ireland/en/lab-tests` | HSE/FSAI vitamin D guidance; NICE B12 deficiency guideline |
| 32 | IE | AMH testing and ovarian reserve: what the result does and does not tell you | ~30 impr across `amh test`, `amh test ireland` | — | `/ireland/en/lab-tests`; women's health | NICE CG156; ESHRE |
| 33 | RO | Analiza AMH: când se recoltează și ce arată | ~25 impr across `dozare amh`, `amh cand se recolteaza` | — | `/romania/ro/lab-tests`; women's health | ESHRE; NICE CG156 |
| 34 | RO | Test genetic pentru boala celiacă: cui i se recomandă | 19 impr, `test genetic boala celiaca` at pos 17.6 | — | `/romania/ro/lab-tests` | ESPGHAN / ESsCD coeliac guidelines; Min. Sănătății |
| 35 | CZ | Cukrovka 2. typu: příčiny, příznaky, kdy na vyšetření | 58 impr across `diabetes`, `cukrovka příčiny` at pos 37–48 | — | chronic-disease service | Česká diabetologická společnost; ÚZIS; EASD/ADA consensus |
| 36 | PT | Infeção respiratória: quando é preciso ver um médico | 72 impr at pos 70–81 — largest badly-ranked PT informational term | — | consulta-medica; medicina-geral-e-familiar | DGS norms; SNS24 triage; ECDC seasonal guidance |

*Locales:* 31 → en, pt · 32 → en, ro, pt · 33 → ro, en ·
34 → ro, en · 35 → cs, en · 36 → pt, en

---

### Week 7 — the remainder

| # | Market | Article | Target query | Vol · KD | Links to | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| 37 | ES | Sistólica y diastólica: qué significa cada número | `sistólica y diastólica` | 1,600 · 48 | cardiology; BP tool | ESC/ESH 2024 |
| 38 | ES | Cuándo una consulta médica online basta y cuándo no | `consulta medica online` — 35 impr at pos 50 | — | `services/consulta-medica-online` | Min. de Sanidad telemedicine guidance; CGCOM position |
| 39 | ES | Consulta de dermatología online: qué se puede valorar a distancia | 24 impr across `consulta dermatologo online` | — | `services/dermatologia-especialista-online` | AEDV; EADV teledermatology position |
| 40 | PT | Enxaqueca: diagnóstico e quando referenciar | 16 impr on `enxaquecas` at pos 76 | — | `services/consulta-medica` | DGS Norma on cefaleias; European Academy of Neurology |
| 41 | PT | Tabela de tensão arterial: registar e interpretar em casa | `tabela de medição de tensão arterial` — 14 impr at pos 10 | — | cardiology; chronic disease | ESC/ESH 2024; Fundação Portuguesa de Cardiologia; DGS |
| 42 | CZ | Vyšetření ADHD u dospělých v ČR | ~30 impr across `adhd test`, `vyšetřeni adhd` | — | psychiatry; mental health | NICE NG87; Česká psychiatrická společnost |

> **#39 overlaps the existing `online-dermatologist-spain` post.** Expand that
> one instead of publishing a second.

*Locales:* 37 → es, en · 38 → es, en · 39 → es, en ·
40 → pt, en · 41 → pt, en · 42 → cs, en

---

### The 43rd, and Brazil

**#43 — IE: Long-term illness scheme and entitlements** (`long-term illness
entitlements` 170; `long-term illness benefit ireland` 140 · KD 15) carries
into week 8 with a fresh Search Console pull, because by then weeks 1–2 will
have changed what the data says.

**Brazil gets no articles in this plan, deliberately.** It has one doctor on
the roster, no Clinical Director set, and its Search Console impressions are
dominated by brand collision with unrelated Brazilian companies — `clinic
global health` (428), `clinic.globalhealth` (167), `help global brazil`. That
is not demand for this business. Revisit when the Brazilian team is larger. If
Brazil is worked anyway, the two clusters with real intent are ECG
interpretation (`como ler um eletrocardiograma`, ~25 impressions at positions
17–50) and men's telehealth (`consulta online saúde masculina`, 15 impressions
at position 15) — both need a Brazilian clinician author.

---

## 6. Rules for every article

**Bylines — non-negotiable.**
- A named `authorDoctorId` and a named `reviewerDoctorId`, both real, both
  consenting, both registered in a relevant jurisdiction.
- `lastReviewedAt` is the date that clinician actually reviewed it, never a
  publication date standing in for one.
- No invented author, reviewer, review date, statistic, or patient review. If
  the byline is not ready, the article waits.
- Prefer a reviewer registered in the market the article is about. The existing
  `brazil/en/blog/online-medical-certificate-brazil` is reviewed by a
  Czech-registration doctor — a weaker signal than it needs to be.

**Sources.** Every clinical claim cites a named primary source — a regulator, a
national health service, or a published guideline — linked, and with the
version or year stated where the number changes annually (benefit rates,
thresholds, guideline editions).

**Internal linking.** Each article links to the service page named in its row,
using the service's own language. Do not link into `/health/*`: those pages are
deliberately excluded from navigation and listings under the internal-linking
spec's Rule 6.

**Localisation.** Translate the *topic*, not the *page*. A Romanian version of
an Irish Illness Benefit article is written for Romanians living in Ireland —
same law, different reader, and often different search terms rather than a
literal translation of the English ones.

**Measurement.** Re-pull Search Console 30 and 90 days after each week's batch.
Two things to watch: whether the kept locales in §3 earn anything (the sample
behind that table is 1–2 clicks per URL and deserves re-testing), and whether
any article is cannibalising a service page for the same query.

---

## 7. Execution update — 25 August 2026

This update supersedes the volume and sequencing assumptions below without
discarding the original keyword research. A production CMS check, a fresh
Search Console comparison, an OpenSEO crawl/backlink review, and a live
competitor review all point to the same operating change: publish a smaller
cohort, measure it, and improve authority in parallel.

### 7.1 Current delivery state

- Week 1 has four live topics: Portugal autodeclaração, Ireland Illness
  Benefit, Czech eNeschopenka, and Ireland sick certificate. The Spain and
  Romania blood-pressure posts remain production drafts pending review.
- Week 2 has 36 standalone HTML copies locally but **zero production CMS
  records**. The local full-language set is research material, not the
  production publishing plan.
- The exact evidence-backed Week 2 locale matrix contains **19 variants**, not
  36. Start with the six primary-language drafts, then add only the 13 approved
  translations that receive native-language review.

### 7.2 Compact article standard

Google does not reward an arbitrary word count. Use enough space to answer the
intent safely and completely, with these working ranges rather than hard SEO
minimums:

- administrative/process articles: usually 600–900 words;
- clinical and safety-sensitive articles: usually 700–1,200 words;
- one primary intent and one exact service CTA family per page;
- the direct answer in the first 80–120 words;
- 3–5 useful contextual internal links for a short article;
- 2–4 FAQs only where they answer distinct, evidenced questions;
- named clinician author/reviewer, real `lastReviewedAt`, primary sources, and
  native-language review remain mandatory.

Do not insert every OpenSEO keyword. The primary query belongs in the title,
H1, opening answer, and a natural heading. Secondary queries belong only where
they help the same intent. Unrelated terms require a different page or no page.

### 7.3 Revised phase order

**25 August–8 September:** finish the two Week 1 reviews; reduce and rewrite
Week 2; create primary-language drafts only after explicit production approval;
publish the administrative cohort before the clinical-safety cohort; validate
post-25-August `begin_booking`, `begin_checkout`, and `purchase` data; and run
one real authority/outreach action for each priority administrative cluster.

**Weeks 3–5:** run no more than three active clusters at once, normally two new
articles and one existing-page improvement. Keep Ireland ADHD assessment,
Spanish evidence-based blood-pressure management, Portugal burnout leave, and
Ireland mental-health medical certificates as the strongest net-new
candidates. Improve the existing Romania medical-letter, Portugal travel,
Czech eNeschopenka/English sick-note, dermatology, ADHD-tool, and
blood-pressure-tool pages instead of creating competing articles.

**Week 6:** keep the Ireland laboratory cluster behind the registered
8 September measurement gate. Use the live `/lab-tests` routes and verify that
each exact product and market pathway exists
before drafting. Do not create another broad Czech diabetes article while the
existing Czech diabetes post owns that topic.

**Weeks 7–8:** treat Spain dermatology and online-vs-in-person as updates or
localisations of existing content. Fold systolic/diastolic, blood-pressure
table, and ADHD-definition queries into their existing tools or owner pages.
Reassess the Ireland Long-Term Illness Scheme separately from employment sick
leave after the 30 September measurement pass. Brazil remains deferred until
clinical capacity and non-brand search demand improve.

### 7.4 Decision gates

- At 30 days, judge indexation, query ownership, impressions, and early rank
  movement. Do not call a page a failure because it has no conversion on a
  small sample.
- At 60 days, judge clicks, CTR relative to position, internal commercial-path
  use, and whether another page is competing for the same intent.
- At 90 days, use qualified organic landings plus `begin_booking`,
  `begin_checkout`, and `purchase` to decide what to scale, refresh,
  consolidate, or stop.
- Publication count is not a KPI. The operating KPIs are reviewed/indexable
  pages, earned search demand, useful commercial paths, conversion signals,
  and acquired relevant referring domains.

---

## 8. Honest summary

Six topics a week can help once review capacity and post-deployment measurement
support that pace. For the current two-week cleanup phase, the §7 limit of
three active clusters takes precedence. Three things are worth saying plainly:

1. **36 URLs a week is the wrong target.** Six topics is a later ceiling, not a
   weekly quota.
   The locale rule in §3 turns that into 20–26 URLs and loses nothing the
   current blog measurably earns. Week 2's exact planned matrix is 19 URLs.
2. **Content raises positions; it does not raise authority.** Several of these
   will reach page one. The competitive head terms will not, until the
   off-site work in `docs/client/off-site-authority-plan-2026-08-19.html`
   produces real links. Those two tracks run in parallel and neither
   substitutes for the other.
3. **The clinical review capacity is the plan.** Everything else is
   negotiable; that is not. If 12 sign-offs a week is not realistic, cut to
   three or four topics a week and keep the standard.
