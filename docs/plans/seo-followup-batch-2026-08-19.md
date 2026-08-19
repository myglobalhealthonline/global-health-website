# SEO follow-up batch — 2026-08-19 (EXT-AUDIT-002)

Working document for the batch that follows commit `553bc088`. Sections 1 and 2
are verified findings that change what should be done. Sections 3–5 are
proposals and drafts — nothing in them has been sent, published, or applied.

Canonical status still lives in `docs/plans/seo-control-state.md`; the ledger row
for this batch is §26 there.

**Verification legend used throughout:** *Verified* = I fetched it from live
production or the live third-party API on 2026-08-19 and the output is quoted.
*Assumed* = reasoning from repository code or from data I did not re-fetch.
*Unverified* = plausible but not checked; the user must confirm before acting.

---

## 1. Deploy verification — `553bc088` is NOT deployed (verified)

**Status: not live. Task 1's browser check was therefore skipped, not passed.**

`553bc088` is present on `origin/Dev-hassaan`, but production has not picked it up.

Googlebot-UA fetch of `https://www.myglobalhealth.online/portugal/en`,
2026-08-19, `<script>` blocks stripped:

| Probe | Expected after deploy | Actual |
| --- | ---: | ---: |
| `Rated by real patients` (the reviews `h2`) | 1 | **0** |
| `doctify` anywhere in the raw HTML | ≥1 | **0** |
| `Excellent` / `patient reviews` (widget chrome) | ≥1 | **0** |

The fourteen `h2` elements the page does serve are the hero, "Who we help",
"Why choose Global Health", partners, "How does it work?", FAQs, disclaimer,
"Licensed care, checked locally" and two service cards — no reviews heading
among them. `frontend/app/[country]/[lang]/page.tsx` is one of the eleven call
sites of the reviews wrapper, so the section is expected on this URL; its
absence is the pre-fix `ssr: false` behaviour, unchanged.

**Action:** deploy `Dev-hassaan`, then re-run the two checks. The Doctify
language fix (SEO-011) cannot be visually confirmed until then either.

---

## 2. Clinical-reviewer byline — the stated cause is wrong, and the gap is 38 pages, not 2

### 2.1 What the sweep found (verified)

All 116 English service URLs were pulled from `https://www.myglobalhealth.online/sitemap.xml`
and fetched with a Googlebot UA; `<script>` blocks stripped; presence of the
literal byline label `Clinically reviewed by` recorded.

**116 checked · 78 have a byline · 38 do not · 0 fetch errors.**

The 38 split perfectly along country lines:

| Country | English service pages | Missing byline |
| --- | ---: | ---: |
| Ireland | 23 | 0 |
| Portugal | 23 | 0 |
| Czechia | 15 | 0 |
| Romania | 17 | 0 |
| **Spain** | 20 | **20 (all)** |
| **Brazil** | 18 | **18 (all)** |

A clean 100%/0% split by country is not what a per-service data gap looks like.

### 2.2 Root cause (verified in code)

`frontend/app/[country]/[lang]/services/[serviceSlug]/page.tsx:339`:

```ts
const reviewer = allDoctors.find((d) => d.isFeatured) ?? null;
```

The visible byline is fed by `reviewer` (lines 654–659). `reviewer` is the
country's **featured doctor / "Clinical Director"**, not the service's own
reviewer field.

`Service.reviewerDoctorId` resolves separately into `contentReviewer`
(line 349), which is consumed only at line 384 → `reviewedByPhysician` → the
page's JSON-LD. **It never reaches the rendered byline.** Setting
`reviewerDoctorId` on the two named services would change the structured data
and leave the visible page exactly as it is today.

`isFeatured` is not a `Doctor` column. `backend/src/modules/doctors/doctors.service.ts:541`
resolves it per request from `getFeaturedDoctorId(countryCode)`, which reads
`Setting["featured_doctor:<countryCode>"]`
(`backend/src/modules/doctors/featured-doctor.service.ts`).

Confirmed live: `/portugal/en/doctors`, `/ireland/en/doctors`, `/czechia/en/doctors`
and `/romania/en/doctors` each render a "Clinical Director" spotlight;
`/spain/en/doctors` and `/brazil/en/doctors` render none. Spain and Brazil have
**no `featured_doctor` Setting row**. That is the entire cause of all 38 missing
bylines.

Two corrections to the task brief that follow from this:

- `parar-de-fumar-online` is a **Brazil** slug, not Portugal. Portugal's
  stop-smoking page is `deixar-de-fumar`, and it already carries a byline.
- Blog posts are unaffected because they use a genuinely per-post
  `BlogPost.reviewerDoctorId`. Verified live: the Spanish post
  `/spain/en/blog/sick-leave-anxiety-spain` shows "Clinically reviewed by
  Dr. Eduardo Daniel Rodríguez Olivas" while every Spanish *service* page shows
  nothing. Same market, same doctor roster, different mechanism.

`ClinicalReviewer` rendering nothing without a real reviewer remains correct and
should not be touched.

### 2.3 The fix is two admin clicks, not a data backfill

**Screen:** admin → Doctors → open the doctor → the per-country Clinical
Director control (`/admin/doctors/<id>`, rendered at
`frontend/app/(portal)/(admin)/admin/doctors/[id]/page.tsx:324–336`). The button
reads **"Set Director (ES)"** / **"Set Director (BR)"**. It is radio-style
per country: setting a new doctor replaces the previous one.

**Brazil — Dr. Renato Sarmento.** No judgement call: he is the only doctor on
the Brazilian roster. CRM 170837/SP, Family and Community Medicine, which also
matches the generalist convention used in Ireland, Portugal and Czechia.
Profile: `/brazil/en/doctors/dr-renato-sarmento`.

**Spain — recommend Dra. María Fernanda Ocampo Mora.** CGCOM 291409735, profile
`/spain/en/doctors/dr-maria-fernanda-ocampo-mora`. Reasoning: of the thirteen
Spanish profiles, only six currently render a CGCOM verification link, and of
those six she is the one whose bio is actually general and family medicine
("extensive experience in emergency medicine, general and family medicine"). The
other two verified "General Medicine" profiles are specialists by practice —
Dra. Luz Marina Zuluaga Ríos is angiology and peripheral vascular disease,
Dra. María Silvina Irale Tunkiewicz is a paediatrician with 20+ years in
paediatric primary care. A generalist is the right fit for a byline that will
appear on all twenty Spanish service pages, from dermatology to psychiatry.

If the owner prefers a different Spanish doctor, the only constraint that
matters is that the byline will appear on every Spanish service page, so it
should be someone whose credentials read sensibly across the whole catalogue.

**Do not** add a code fallback that shows the service's `reviewerDoctorId` when
no Clinical Director is set. That would silently change what 78 already-correct
pages display.

### 2.4 Full list of the 38 pages (for reference — they all clear at once)

Setting the two Settings rows fixes every URL below simultaneously, in all six
locales, not just `/en`.

**Brazil (18):** `atestado-medico-online`, `consulta-clinica-online`,
`consulta-pele-online`, `controle-peso-online`, `doencas-cronicas-online`,
`musculoesqueletico-online`, `parar-de-fumar-online`, `pediatria-online`,
`queda-cabelo-online`, `renovacao-receita-online`, `saude-da-mulher-online`,
`saude-do-homem-online`, `saude-idoso-online`, `saude-mental-online`,
`saude-sexual-ist-online`, `saude-viagem-online`, `segunda-opiniao-medica`,
`solicitacao-exames-online`

**Spain (20):** `caida-cabello-online`, `cardiologo-online`,
`consulta-medica-online`, `consulta-piel-online`, `control-peso-online`,
`dejar-de-fumar-online`, `derivaciones-pruebas-online`,
`dermatologia-especialista-online`, `enfermedades-cronicas-online`,
`justificante-medico-online`, `medicina-viaje-online`,
`musculoesqueletico-online`, `pediatria-online`, `psicologo-online`,
`psiquiatra-online`, `renovacion-tratamiento-online`, `salud-femenina-online`,
`salud-masculina-online`, `salud-mental-online`, `segunda-opinion-medica`

### 2.5 Separately worth a look (not in scope, not actioned)

`/brazil/en/blog/online-medical-certificate-brazil` is clinically reviewed by
MUDr. Khoiamul Islam, a Czech-registration doctor, on a Brazilian article. A
Brazilian reviewer would be the stronger E-E-A-T signal. Owner's call.

---

## 3. Off-site authority — target list

Refreshed from OpenSEO on 2026-08-19: **rank 43, 520 backlinks, 59 referring
domains** (the brief's 57 is two weeks stale), spam score 7.

### 3.1 Read the profile before adding to it

The 59 domains are not 59 opportunities that happened to be missed. Sorted by
volume, the profile is:

| Referring domain | Backlinks | Domain rank | Spam | What it is |
| --- | ---: | ---: | ---: | --- |
| wix.to | 195 | **70** | 0 | Wix's own link shortener — legacy site (see 3.2) |
| boycat.co | 95 | 8 | 14 | article-syndication |
| lalinguanostra.com | 81 | 0 | 0 | article-syndication |
| craneflower.net | 25 | 0 | 0 | article-syndication |
| globalguestgg.wixsite.com | 18 | 18 | 0 | own legacy Wix subdomain (root now 404s) |
| bib.az | 17 | 0 | 2 | directory |
| viesearch.com | 10 | 16 | 15 | directory |
| coombecommunitypharmacy.ie | 2 | 8 | 10 | **real Irish pharmacy** |
| askspud.ie | 1 | 0 | 0 | **real Irish site** |

Roughly 240 of the 520 backlinks arrived between 2026-05-21 and 2026-08-01 from
eleven article-directory and link-farm domains (`freearticlesmania.com`,
`articlescad.com`, `articlewaves.com`, `yruz.one`, `robuta.com`,
`five.co.in` at spam 30, `peruactivo.com`, `dailystorypro.com`,
`tokemonkey.com`, `blogsgod.com`, `facerelation.com`). Referring domains went
42 → 53 in a single month, May 2026. That pattern is a purchased or syndicated
link burst.

**Ask before doing anything else:** did anyone buy links or run a syndication
campaign around May 2026? Google normally ignores rather than penalises this, so
**do not file a disavow** unless Search Console shows a manual action — a
needless disavow can cost real equity. But it explains why 59 referring domains
have bought so little ranking, and it means "grow the number of referring
domains" is the wrong goal. Two or three genuinely relevant health domains are
worth more than the last thirty combined.

### 3.2 The highest-value action needs no outreach at all

`wix.to` is domain rank **70** — far and away the strongest referrer, and the
source of 37.5% of all backlinks. All 195 of its links point at legacy
`/booking-calendar/<slug>` URLs on the current domain.

Verified live, 2026-08-19:

| Legacy URL | Resolves to |
| --- | --- |
| `/booking-calendar/pt-medicare-consulta-do-viajante-1` | `/portugal/pt/book` |
| `/booking-calendar/ro-consultație-de-cardiologie` | `/romania/ro/book` |
| `/booking-calendar/baja-medica` | `/ireland/en/book` |

Two problems, both fixable without contacting anyone:

1. **All 195 links funnel into six generic `/book` pages.** The equity from the
   site's strongest referring domain never reaches any of the 116 service pages
   that actually compete for commercial queries. Slug-level remapping —
   `pt-medicare-consulta-do-viajante-1` → `/portugal/pt/services/consulta-do-viajante`,
   `ro-consultație-de-cardiologie` → `/romania/ro/services/<cardiology slug>` —
   redistributes it onto pages that can rank.
2. **`baja-medica` is a Spanish service landing on `/ireland/en/book`.** A
   wrong-market redirect.

**Cost:** engineering time only. **Value:** highest on this list.

**Status: implemented and verified. See §7.**

### 3.3 Partners who already link to you one-way

Verified 2026-08-19: `/portugal/en` renders partner logos linking out to
`https://www.medicare.pt/` and `https://www.synlab.pt/`. Neither appears in the
site's `sameAs`, and no other market shows a commercial partner. The link flows
outward only.

| Target | What to ask for | Cost | Requires | Expected value |
| --- | --- | --- | --- | --- |
| **Medicare Portugal** (medicare.pt) | Listing on their partner/network page linking to `/portugal/pt` | Free — existing commercial relationship | Account-manager email | **High.** Topically perfect, Portuguese, commercial rationale already exists |
| **SYNLAB Portugal** (synlab.pt) | Same, plus a link from any "collection partners" page to `/portugal/pt/tests` | Free — existing relationship | Account-manager email | **High**, same reasons |
| **Randox** (Ireland lab partner, per `project_ie_labtests_randox_july2026`) | Partner listing → `/ireland/en/tests` | Free if the relationship is live | Confirm the partnership is current | Medium-high |
| **Doctify** (doctify.com/practice/global-health-ireland) | Confirm the practice profile links back to the site, dofollow | Free — paid tenant already | Check the profile; ask support if absent | Medium. Health-vertical relevance |

Reciprocal partner links are the single most defensible category here: real
commercial relationships, real relevance, nothing to disclose.

### 3.4 Regulator and professional-body listings, by market

Regulator registers are the most trustworthy links a clinical site can hold, but
most register *doctors*, not practices, and many emit no outbound link at all.
Marked accordingly. **URL status is from a HEAD/GET check on 2026-08-19; `403`
means a bot block, i.e. the domain is live but refused my request.**

#### Ireland

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| ICGP member directory | `https://www.icgp.ie/` (200) | Membership fee | An ICGP-member GP on the roster | Medium — .ie, authoritative, but doctor-level |
| Medical Council register | `https://www.medicalcouncil.ie/` (200) | Free | Already applies to registered doctors | Low as a link (no outbound), high as a citation target from your own pages |
| ADHD Ireland | `https://adhdireland.ie/` (403, live) | Free or partner fee | Offering ADHD assessment | **High** — pairs directly with the ADHD cluster in §4 |
| Irish Haemochromatosis Association | `https://www.haemochromatosis-ir.com/` (403, live) | Free or membership | Offering the HFE gene test | **High** — Ireland has the world's highest carrier rate and you already rank (badly) for `haemochromatosis gene test` |
| Golden Pages | `https://www.goldenpages.ie/` (403, live) | Free tier / paid upgrade | NAP details | Low-medium — generic, but a real .ie citation |
| Silicon Republic / Irish Tech News / BusinessPlus.ie | — | Free (editorial) | A genuine story: funding, market entry, clinician count | Medium-high, and unrepeatable |

#### Portugal

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| **ERS provider register** | search `https://www.ers.pt/pt/prestadores/servicos/pesquisa-de-prestadores/` (live); registration `https://www2.ers.pt/dmz/registo-prestador.aspx` | Free — statutory | Portuguese provider licensing, which you should already hold | **Highest in PT.** Government domain, and it is a compliance obligation regardless of SEO. Verify the entry exists and is current |
| Ordem dos Médicos | `https://www.ordemdosmedicos.pt` | Free | Doctor-level only | Citation value, not link value |
| Saúde Bem-Estar | `https://www.saudebemestar.pt/` (200) | Editorial / possibly paid | A named clinician willing to be quoted | Medium |
| Atlas da Saúde | `https://www.atlasdasaude.pt/` (200) | Editorial | Same | Medium |
| APMGF (family medicine assoc.) | `https://www.apmgf.pt` — already in `sameAs` | Membership | A member GP | Medium |

#### Spain

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| Doctoralia España | `https://www.doctoralia.es/` (403, live) | Freemium; paid tiers | Per-doctor profiles | **High reach** — dominant ES health directory. Links are typically nofollow; value is referral traffic and entity corroboration, not PageRank |
| Top Doctors España | `https://www.topdoctors.es/` (403, live) | Paid, editorially screened | Specialist credentials | Medium-high |
| Provincial Colegios de Médicos (via CGCOM) | `https://www.cgcom.es` | Free — statutory | Already applies to your registered doctors | Citation value |
| Consejo General de la Psicología (COP) | — | Membership | Your two psychologists are already COP-registered | Medium |
| CuidatePlus (Marca) / ConSalud.es | — | Editorial | Named clinician commentary | Medium |

#### Czechia

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| **NRPZS** (national provider register, ÚZIS) | `https://nrpzs.uzis.cz` — **unverified: returned no response from my network on both IPv4 and IPv6; `https://www.uzis.cz/` responds 200.** Confirm before acting | Free — statutory | A Czech provider licence | Potentially highest in CZ: `.cz` government register |
| Firmy.cz (Seznam) | `https://www.firmy.cz/` (200) | Free tier / paid | Czech business details | **High** — Seznam is a genuinely significant Czech search engine, not just a directory |
| ČLK register | `https://www.lkcr.cz/` (200) | Free — statutory | Doctor-level | Citation value |
| Známý lékař | `https://www.znamylekar.cz/` (403, live) | Freemium | Per-doctor profiles | Medium-high — CZ equivalent of Doctoralia |

#### Romania

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| Colegiul Medicilor din România | `https://www.cmr.ro/` (200) | Free — statutory | Doctor-level | Citation value |
| ROmedic | `https://www.romedic.ro/` (200) | Freemium | Clinic listing | Medium-high — main RO health directory |
| CNAS provider list | `cnas.ro` | Free | A CNAS contract, which you may not have | Verify applicability first |

#### Brazil

| Target | URL | Cost | Requires | Value |
| --- | --- | --- | --- | --- |
| Doctoralia Brasil | `https://www.doctoralia.com.br/` (403, live) | Freemium | Per-doctor profiles | High reach; nofollow |
| SBIS (health informatics society) | `https://www.sbis.org.br/` (200) | Membership | Relevant if you hold or seek SBIS-CFM telemedicine certification | Medium, and it doubles as a trust badge |
| CFM / CRM-SP registers | `portal.cfm.org.br` | Free — statutory | Dr Sarmento's CRM 170837/SP already qualifies | Citation value |

Brazil is the weakest market to invest outreach in right now — one doctor on the
roster, no Clinical Director, and the GSC picture in §4.6 shows the brand term
is contested by unrelated Brazilian entities.

### 3.5 Wikidata expansion — Q140363271

The entity is already unusually well populated: `P31` business, `P856` official
website, `P17` Czechia, `P2541` operating areas (IE, PT, ES, RO, CZ, BR),
`P452` industry ×3, `P159` HQ ×3, `P571` inception 2023, `P1128` 85 employees,
`P1448` legal name "Global Guest s.r.o.", `P112` founder, `P973` Crunchbase,
`P4264` LinkedIn, `P2013` four Facebook pages, `P2003` five Instagram accounts,
`P18` image.

Genuine gaps, all free and self-service:

| Add | Value on hand |
| --- | --- |
| YouTube channel ID | `@GlobalHealth-y9o` (in the site's `sameAs`) |
| TikTok username | `globalhealth.online` (in `sameAs`) |
| Logo (distinct from `P18` image) | Site logo asset |
| Official email / phone | Public contact details |
| Czech company identifier (IČO) for Global Guest s.r.o. | Public register |

Confirm the exact property IDs on Wikidata before saving — I have not checked
them against the current property list, and a wrong P-number is worse than a
missing statement.

**Do not attempt a Wikipedia article.** Notability requires significant coverage
in independent reliable sources; 59 referring domains, most of them syndication
farms, will not survive an AfD, and a deleted article is a lasting negative
signal. Revisit only after real press coverage exists.

### 3.6 Recommended order

1. ~~Remap the 195 legacy `/booking-calendar/*` redirects to service pages (§3.2).~~ **Done — §7.**
2. Ask Medicare PT and SYNLAB PT for reciprocal links (§3.3).
3. Verify the ERS Portugal register entry, and the NRPZS Czechia entry once the
   URL is confirmed (§3.4).
4. Wikidata gap-fill (§3.5).
5. ADHD Ireland and the Irish Haemochromatosis Association — but only once the
   matching articles in §4.1 exist, so there is something worth linking to.
6. Firmy.cz, ROmedic, Doctoralia ES/BR profiles.

Nothing above has been sent or submitted. Everything outbound is the owner's to
send.

---

## 4. Editorial depth — proposed topics

Chosen from Search Console query data for `sc-domain:myglobalhealth.online`,
2026-05-16 → 2026-08-16, `dataState=all`, pulled per country. Volume figures are
Google Ads keyword volume from OpenSEO `research_keywords`, at the country and
language shown. Where no volume figure is given, the demand evidence is GSC
impressions in that 90-day window and it is labelled as such — impressions are
not search volume and the two are not interchangeable.

Market priority by 90-day clicks: Ireland 123 · Portugal 49 · Czechia 42 ·
Spain 19 · Brazil 11 · Romania 5. Romania is proposed ahead of Spain and Brazil
anyway, because it already holds positions 5–10 on a cluster nobody has written
for.

**Publishing gate — applies to every row below.** `BlogPost` requires
`authorDoctorId` and `reviewerDoctorId`, and the public page emits Article
schema with a Physician `author` and `reviewedBy`. **No draft may publish
without a named, consenting clinician in both roles, and `lastReviewedAt` must
be the date that clinician actually reviewed it.** Do not invent an author, a
reviewer, a review date, a statistic, or a patient review. A fabricated
review-count claim reached production once already
(`project_trust_section_locale_gap_july2026`); this is the same failure mode.

Existing posts, so nothing below duplicates them: Ireland 6, Portugal 3,
Czechia 2, Romania 2, Spain 2, Brazil 2.

---

### 4.1 Ireland — 10 topics

The sick-certification and welfare cluster is the largest single opportunity on
the entire site: high demand, low difficulty, and the site currently sits at
position 34–68 across it.

| # | Article | Target query (volume · KD) | Links to | Must cite |
| --- | --- | --- | --- | --- |
| 1 | How to get a sick cert online in Ireland — what employers can and cannot refuse | `sick cert online` (880 · KD 0); GSC 73 impr at pos 34 | `/ireland/en/services/<sick-cert service>` | Citizens Information (Statutory Sick Pay); Dept of Social Protection; Medical Council guidance on remote certification |
| 2 | Illness Benefit in Ireland: eligibility, rates, and the IB1 form | `illness benefit ireland` (6,600 · KD 5); `ib1 form` (2,400 · KD 0); `illness benefit form` (1,600 · KD 1) | sick-cert + GP consultation | Dept of Social Protection; Citizens Information; MyWelfare |
| 3 | How much is Illness Benefit, and when is it paid? | `how much is illness benefit in ireland` (880 · KD 2); `what day is illness benefit paid` (480 · KD 5) | as above | Dept of Social Protection rate tables (cite the year) |
| 4 | Long-term sick leave rights in Ireland | GSC 40 impr across `long-term sick leave rights ireland` variants, pos ~68 | sick-cert service | Citizens Information; Workplace Relations Commission; `long-term illness benefit` (390 · KD 15) |
| 5 | Medical certificate for stress or mental-health leave | GSC 23 impr at pos 27 | mental-health consultation | HSE mental health; WRC; Medical Council |
| 6 | Adult ADHD assessment in Ireland: routes, waiting times, cost | `adhd assessment ireland` (1,900 · KD 0); `adhd ireland` (5,400 · KD 15); `private assessment for adhd ireland` (260 · KD 3); `adhd diagnosis ireland cost` (110) | mental-health / psychiatry | NICE NG87; HSE ADHD pathway; College of Psychiatrists of Ireland |
| 7 | Haemochromatosis in Ireland: why the HFE gene test matters here | `haemochromatosis in ireland` (260 · KD 3); `haemochromatosis treatment` (390 · KD 22); GSC 39 impr at pos 77 | `/ireland/en/tests` | HSE; Irish Haemochromatosis Association; NICE/EASL iron-overload guidance |
| 8 | Reading a blood-pressure chart: what the numbers mean | GSC: `blood pressure chart` 27 impr pos 15.5, `blood pressure chart ireland` 14 impr pos 7.6 — already close | GP consultation; chronic-disease service | ESC/ESH 2024 hypertension guideline; HSE; Irish Heart Foundation |
| 9 | Vitamin D and B12 testing at home: when it is worth it | GSC ~50 impr across `at home vitamin d test`, `b12 test kit`, `b12 blood test` | `/ireland/en/tests` | HSE/FSAI vitamin D guidance; NICE B12 deficiency guideline |
| 10 | AMH testing and ovarian reserve: what the result does and does not tell you | GSC ~30 impr across `amh test`, `amh test ireland`, `amh blood test` | `/ireland/en/tests`; women's health | NICE fertility guideline CG156; ESHRE |

Deliberately excluded: bacterial-vaginosis treatment queries (`bv medication`,
12 impr, pos 76). Real demand, but prescription-treatment content in a market
where you rank at 76 is a poor trade against the regulatory care it needs.

---

### 4.2 Portugal — 9 topics

Portugal's demand is dominated by two document clusters — the driving-licence
medical certificate and sick leave — plus travel medicine, where the site
already has a service page and no supporting content.

| # | Article | Target query (volume · KD) | Links to | Must cite |
| --- | --- | --- | --- | --- |
| 1 | Autodeclaração de doença: como funciona e quando não chega | `autodeclaração de doença` (12,100 · KD 0); `validar autodeclaração de doença` (4,400 · KD 0); `autodeclaração de doença 1 dia` (880) | `/portugal/pt/services/baixa-medica` | Segurança Social; SNS24; the Decreto-Lei establishing self-declaration |
| 2 | Baixa médica: quanto se recebe e como é calculada | `baixa médica` (4,400 · KD 20); `simulador baixa médica` (1,300 · KD 0); `baixa médica valores` (720) | baixa-medica service | Segurança Social subsídio de doença tables; note the year |
| 3 | Atestado médico para carta de condução: grupos 1 e 2 | `atestado médico para carta de condução` (1,900 · KD 0); `atestado médico carta condução` (590); GSC 34 impr on `exame medico carta condução` at pos 44 | `/portugal/pt/services/certificado-medico-carta-de-conducao` | IMT — Regulamento da Habilitação Legal para Conduzir; DGS; Ordem dos Médicos |
| 4 | Atestado médico de incapacidade multiuso: quem tem direito | `lista de doenças para atestado multiusos` (1,900 · KD 0); `atestado multiusos benefícios` (1,300); `atestado multiusos vitalício` (1,300) | certificados-medicos | Tabela Nacional de Incapacidades; DGS; Segurança Social |
| 5 | Baixa por burnout e baixa psicológica: o que muda | `baixa psicológica paga a 100` (880 · KD 0); `baixa por burnout paga a 100` (390) | `/portugal/pt/services/saude-mental` | Segurança Social; DGS mental-health norms; Ordem dos Psicólogos |
| 6 | Consulta do viajante: vacinas, prazos e o que levar | `consulta do viajante` (5,400 · KD 3); `consulta do viajante online` (1,000 · KD 5); GSC 20 impr at pos 71 | `/portugal/pt/services/consulta-do-viajante` | DGS travel health; INSA; WHO IHR vaccination requirements |
| 7 | Infeção respiratória: quando é preciso ver um médico | GSC 72 impr across `infeção/infecção respiratória` at pos 70–81 — largest badly-ranked PT informational term | consulta-medica; medicina-geral-e-familiar | DGS norms; SNS24 triage; ECDC seasonal guidance |
| 8 | Enxaqueca: diagnóstico e quando referenciar | GSC 16 impr on `enxaquecas` at pos 76 | `/portugal/pt/services/consulta-medica` | DGS Norma on cefaleias; European Academy of Neurology guideline |
| 9 | Tabela de tensão arterial: registar e interpretar em casa | GSC: `tabela de medição de tensão arterial` 14 impr pos 10; `tabela registo tensão arterial` 10 impr, 1 click, pos 7 — already near the top | cardiology; chronic-disease service | ESC/ESH 2024; Fundação Portuguesa de Cardiologia (already in `sameAs`); DGS |

Note on the `atestado médico online` seed: it surfaces `sns24` (90,500),
`portal sns 24` (14,800) and `portal do utente` (14,800). Those are navigational
queries for the state health service. **Do not target them** — the intent is to
reach SNS24, not to find a private clinic, and the traffic would not convert.

---

### 4.3 Czechia — 8 topics

Czechia is the best clicks-per-effort market on the site (42 clicks from 502
impressions). The `neschopenka` cluster is the anchor, and `neschopenka anglicky`
is an unusually clean signal: English-speakers in Czechia trying to understand a
Czech sick note.

| # | Article | Target query (volume · KD) | Links to | Must cite |
| --- | --- | --- | --- | --- |
| 1 | E-neschopenka: jak funguje krok za krokem | `neschopenka` (2,400 · KD 10); `elektronická neschopenka` (1,600 · KD 0); `e neschopenka` (1,600 · KD 0) | `/czechia/cs/services/<sick-note service>` | ČSSZ; MPSV; the ePortál ČSSZ documentation |
| 2 | Czech sick note explained in English (expat guide) | GSC `neschopenka anglicky` 12 impr at pos 11 — already close | same service, `/czechia/en/` | ČSSZ English pages; MPSV |
| 3 | Kolik je nemocenská a jak se počítá | `výpočet nemocenské 2026` (1,600 · KD 31); `kolik je nemocenská` (1,000 · KD 30); `kalkulačka nemocenská` (1,000 · KD 34) | sick-note service | ČSSZ calculation rules; MPSV rate tables — state the year |
| 4 | Vycházky během neschopenky: pravidla a kontroly | `neschopenka vycházky` (390 · KD 0); `kontrola nemocenské po 22 hodině` (590 · KD 0); `jak získat neomezené vycházky` (210) | sick-note service | ČSSZ; zákon o nemocenském pojištění |
| 5 | Krevní tlak podle věku: tabulka a co znamená | `krevní tlak podle věku` (2,400 · KD 0); `správný krevní tlak podle věku` (880); `krevní tlak tabulka` (590 · KD 12); GSC 25 impr at pos 10.7 | GP / cardiology service | ESC/ESH 2024; Česká kardiologická společnost; ÚZIS |
| 6 | Jak snížit vysoký tlak — co funguje a co ne | `jak snížit krevní tlak okamžitě` (1,300 · KD 0); `vysoký tlak příznaky` (1,300 · KD 0); `jak snížit krevní tlak bez léků` (260) | GP / chronic-disease | ESC/ESH 2024; ČKS. **Explicitly correct the folk remedies** (`babské rady na vysoký tlak`, 880) rather than repeating them |
| 7 | Cukrovka 2. typu: příčiny, příznaky, kdy na vyšetření | GSC 58 impr across `diabetes` / `diabetes mellitus` / `cukrovka příčiny` at pos 37–48 | chronic-disease service | Česká diabetologická společnost; ÚZIS; EASD/ADA consensus |
| 8 | Vyšetření ADHD u dospělých v ČR | GSC ~30 impr across `adhd test`, `vyšetřeni adhd`, `test na adhd`, `adhd dospělí test zdarma` | psychiatry / mental-health service | NICE NG87; Česká psychiatrická společnost |

Ignore `libor hlavatý` and `mudr hlavatý české budějovice` (104 impressions
combined). That is a different doctor at a different practice; the impressions
are brand confusion, not demand for you.

---

### 4.4 Romania — 8 topics

Romania has the fewest clicks but the best latent position: the `scrisoare
medicală` cluster already ranks at 2–10 with no dedicated article behind it, and
the blood-pressure cluster is enormous.

| # | Article | Target query (volume · KD) | Links to | Must cite |
| --- | --- | --- | --- | --- |
| 1 | Scrisoarea medicală: ce este, cât e valabilă, cine o eliberează | `scrisoare medicala` (1,000 · KD 0); `scrisoare medicala model` (260); `scrisoare medicala anexa 43` (320); GSC 12 impr at pos 5.4 | `/romania/ro/services/<medical-letter service>` | CNAS; Ministerul Sănătății (Ordin privind Contractul-cadru); Colegiul Medicilor din România. Existing post `medical-letter-romania` should be expanded or interlinked, not duplicated |
| 2 | Tabel cu valori tensiune arterială în funcție de vârstă | `cat este tensiunea normala in functie de varsta` (6,600 · KD 0); `tabel cu valori tensiune arteriala` (2,900); `calculator tensiune arteriala` (1,900); GSC 21 impr at pos 12 | cardiology service; BP tool | ESC/ESH 2024; Societatea Română de Cardiologie; Ministerul Sănătății |
| 3 | Ce scade tensiunea rapid — și ce nu | `trucuri care scade tensiunea pe loc` (9,900 · KD 0); `ce scade tensiunea imediat` (4,400); `ce trebuie sa bei cand ai tensiunea mare` (3,600) | cardiology; chronic-disease | ESC/ESH 2024; SRC. **Highest-volume cluster in any market on this list, and it is almost entirely folk remedies — treat it as myth-correction, never as endorsement.** `de la ce tensiune se ia captopril` (4,400) must be handled as "do not self-medicate; here is when to seek care", with no dosing advice |
| 4 | Tensiune mică: cauze și ce să faci | `ce ridica tensiunea mica` (2,900 · KD 0); `ce sa faci cand ai tensiune mica` (2,900); `tensiune mica 9 cu 6` (1,600) | GP consultation | ESC/ESH 2024; SRC |
| 5 | La ce oră se măsoară tensiunea arterială | `la ce ora se masoara tensiunea arteriala` (1,600 · KD 0); `pulsul si tensiunea normala` (1,600) | BP tool; cardiology | ESH home-BP-monitoring guidance; SRC |
| 6 | Testarea ADHD la adulți în România | `test adhd adulti` (390 · KD 0); GSC ~40 impr across `testare adhd adulti`, `test adhd copii online`, `test adhd adulti gratis` (pos 10.6), `asrs v1.1 romana` (pos 8.4) | psychiatry / psychology | NICE NG87; Colegiul Psihologilor din România; the ASRS v1.1 instrument itself |
| 7 | Test genetic pentru boala celiacă: cui i se recomandă | GSC 19 impr across `test genetic boala celiaca` (pos 17.6) and `predispozitie genetica boala celiaca` (pos 25.6) | `/romania/ro/tests` | ESPGHAN/ESsCD coeliac guidelines; Ministerul Sănătății |
| 8 | Analiza AMH: când se recoltează și ce arată | GSC ~25 impr across `dozare amh`, `amh cand se recolteaza`, `amh pret`, `analiza amh pret` | `/romania/ro/tests`; women's health | ESHRE; NICE CG156 |

---

### 4.5 Spain — 8 topics

Spain's GSC picture is dominated by service-intent queries (`medicos online`,
112 impressions at position 20), which belong to the service pages, not the
blog. The informational headroom is narrower but the volumes are very large.

| # | Article | Target query (volume · KD) | Links to | Must cite |
| --- | --- | --- | --- | --- |
| 1 | Tensión arterial normal: tabla por edad y sexo | `tensión arterial normal` (33,100 · KD 10); `tensión arterial normal mujer` (1,300 · KD 10); `tensión arterial normal adultos` (880 · KD 18); GSC 16 impr at pos 29 | `/spain/es/services/cardiologo-online` | ESC/ESH 2024; SEH-LELHA; Sociedad Española de Cardiología |
| 2 | Tensión alta: síntomas y cuándo acudir a urgencias | `tensión alta` (12,100 · KD 3); `tensión alta síntomas` (5,400 · KD 9); `tensión alta cuando ir a urgencias` (1,900 · KD 0) | cardiology; GP consultation | ESC/ESH 2024; SEH-LELHA |
| 3 | Cómo bajar la tensión: qué está respaldado por evidencia | `tensión alta como bajarla` (3,600 · KD 4); `como bajar la tensión` (2,900 · KD 1); `cómo reducir la presión arterial en 5 minutos` (2,400 · KD 0) | cardiology; `enfermedades-cronicas-online` | ESC/ESH 2024; SEH-LELHA. **`remedios de la abuela para bajar la tensión` (1,900) and `infusiones para bajar la tensión` (1,900) are myth queries — correct them, do not serve them** |
| 4 | Tensión baja: causas, síntomas y qué hacer | `tensión baja síntomas` (8,100 · KD 2); `síntomas tensión baja` (6,600 · KD 0); `tensión baja como subirla` (4,400 · KD 0) | GP consultation | ESC/ESH 2024; SEMERGEN |
| 5 | Sistólica y diastólica: qué significa cada número | `sistólica y diastólica` (1,600 · KD 48); `presión sistólica` (880 · KD 2); `tensión diastólica alta` (1,600 · KD 14) | cardiology; BP tool | ESC/ESH 2024 |
| 6 | Test de TDAH en adultos: qué mide y qué no | GSC 12 impr on `test tdah adultos` at pos 47 | `/spain/es/services/psiquiatra-online` | NICE NG87; Sociedad Española de Psiquiatría; the ASRS instrument |
| 7 | Consulta de dermatología online: qué se puede y qué no valorar a distancia | GSC 24 impr across `atencion dermatologica online`, `consulta dermatologo online` | `/spain/es/services/dermatologia-especialista-online` | AEDV (Academia Española de Dermatología); EADV teledermatology position | 
| 8 | Cuándo una consulta médica online basta y cuándo no | GSC: `consulta medica online` 35 impr pos 50; `consulta medica online particular` 29 impr pos 40 | `/spain/es/services/consulta-medica-online` | Ministerio de Sanidad telemedicine guidance; CGCOM position on telemedicine |

The existing post `online-dermatologist-spain` overlaps row 7 — expand that one
rather than publishing a second.

### 4.6 Brazil — deferred, with reasons

Brazil is not proposed for an 8–10 article programme yet. Three blockers, all
verifiable:

1. **No Clinical Director** (§2), so no service page carries a byline.
2. **One doctor on the roster.** Ten articles need a credible author/reviewer
   rotation; one doctor cannot carry it without the bylines looking synthetic.
3. **The brand term is contested.** Of Brazil's 564 GSC impressions, `clinic
   global health` (428), `clinic global health ms clinic /#/ auth login` (216)
   and `clinic.globalhealth` (167) are navigational queries for unrelated
   entities, as are the `help global brazil` and `minha clinica help global`
   sets. Impression volume here is brand collision, not demand.

If Brazil is worked anyway, the two clusters with real informational intent are
ECG interpretation (`como ler um eletrocardiograma` and variants, ~25
impressions at position 17–50) and men's telehealth (`consulta online saúde
masculina`, 15 impressions at position 15). Both would need a Brazilian
clinician author.

---

## 5. Doctify support message — DRAFT, not sent

### 5.1 Evidence I verified myself, 2026-08-19

I re-ran the language probe independently rather than relying on the commit
message, and extended it from eleven codes to fifteen.

Endpoint: `https://www.doctify.com/get-script?widget_container_id=probe&type=horizontal-widget&layoutType=layoutXL&tenant=athena-ie&language=<CODE>&profileType=practice&slugs=global-health-ireland&background=transparent`

| Code | Response bytes | Chrome labels present |
| --- | ---: | --- |
| `en` | 25,538 | `Excellent`, `based on`, `patient review` |
| `de` | 25,559 | `Ausgezeichnet`, `Patientenbewertung` |
| `pt`, `pt-PT`, `pt-BR`, `es`, `es-ES`, `cs`, `cs-CZ`, `ro`, `ro-RO`, `fr`, `it`, `nl`, `pl` | **25,447 each** | **none** |

The thirteen unsupported codes return a **byte-identical** payload, each
containing one empty `<span></span>` where the label belongs. Identical length
across four language families is the significant detail: this is not thirteen
incomplete translation files, it is a single "unknown language → empty string"
branch. It also means there is no English fallback — the widget renders a bare
rating number with no words around it.

### 5.2 Draft message

> **Subject:** Widget label translations for pt / es / cs / ro — tenant `athena-ie`
>
> Hello,
>
> We run the Doctify review widget on myglobalhealth.online under tenant
> `athena-ie`, practice slug `global-health-ireland`. Our site serves six
> languages and we would like the widget's own labels to match the page
> language, but we can only get them to render in English and German.
>
> To narrow it down before contacting you, we fetched `get-script` directly
> across fifteen language codes with everything else held constant:
>
> `https://www.doctify.com/get-script?widget_container_id=probe&type=horizontal-widget&layoutType=layoutXL&tenant=athena-ie&language=<CODE>&profileType=practice&slugs=global-health-ireland&background=transparent`
>
> - `en` returned 25,538 bytes with "Excellent", "based on" and "patient review" populated.
> - `de` returned 25,559 bytes with "Ausgezeichnet" and "Patientenbewertung" populated.
> - `pt`, `pt-PT`, `pt-BR`, `es`, `es-ES`, `cs`, `cs-CZ`, `ro`, `ro-RO`, `fr`, `it`, `nl` and `pl` each returned a byte-identical 25,447-byte response with the label spans empty.
>
> The empty spans rather than an English fallback are what affects us: on our
> Portuguese, Spanish, Czech and Romanian pages the widget renders a bare
> rating number with no "Excellent", no "based on N patient reviews" and no
> "Source: Doctify" — so the rating appears without any context explaining what
> it is or where it came from.
>
> Three questions:
>
> 1. Is there a language code we have not tried that returns populated labels
>    for Portuguese, Spanish, Czech or Romanian — a different casing, a locale
>    format, or an internal code that differs from the ISO one?
> 2. If those languages exist but are not enabled for our tenant, can they be
>    switched on for `athena-ie`?
> 3. If they are genuinely not available yet, is there a roadmap date, and in
>    the meantime could unsupported codes fall back to the English labels
>    rather than returning empty spans? A rating number with no words around it
>    is worse for our users than an English label would be.
>
> We are currently mapping every non-`en`/`de` locale to `en` on our side so the
> widget at least renders complete English chrome, and we would rather show the
> real language.
>
> Happy to provide request/response captures if useful.
>
> Thanks,
> [name]
> Global Health — myglobalhealth.online

Not sent. The owner sends anything that goes out.

---

## 6. Not done, and why

- **DMARC / SPF / DKIM alignment.** Assigned elsewhere. No DNS touched. The
  dependency stands as recorded in `seo-control-state.md` §25: SPF authorises
  only Migadu with a hard fail and DKIM publishes only Migadu selectors, while
  `backend/src/lib/email/send-email.ts` sends via the Gmail API or SendGrid, so
  raising `p=none` before fixing the sending path would break appointment,
  prescription and invoice mail.
- **No writes against production.** `backend/.env` points at production; every
  database question in this batch was answered from live public pages, the
  public JSON-LD, and repository code. No script was run against it.
- **No `Service.reviewerDoctorId` values were set.** §2 shows that would not fix
  the reported symptom.
- **The Clinical Director rows were not set**, because that is a write against
  the production database. It is two clicks in admin — §2.3.

---

## 7. Implemented — legacy `/booking-calendar/*` link equity (§3.2)

Only one item in this batch was fixable in code. It is done, in
`frontend/next.config.ts`, with `frontend/tests/unit/booking-calendar-legacy-redirects.test.ts`
as the guard. Not committed, not deployed.

### 7.1 What changed

All 195 `wix.to` backlink targets were pulled and de-duplicated — 195 distinct
`/booking-calendar/<slug>` paths, all bare (no locale prefix). Each was matched
by hand against the live sitemap. **94 have a real equivalent and now redirect
straight to it**; the other 101 have no live counterpart and keep a `/book`
fallback, because a redirect into a 404 is worse than a redirect to a booking
page.

Two tables were added above the existing market-prefix rules, since first match
wins:

- **Service mapping (93 pairs + 1 hub).** e.g. `sick-leave` →
  `/ireland/en/services/sick-certificate-ireland`, `pt-cons-cessação-tabagica` →
  `/portugal/pt/services/deixar-de-fumar`, `ro-consultație-pentru-migrenă` →
  `/romania/ro/services/consultatie-neurologie`, `pracovní-neschopnost` →
  `/czechia/cs/services/neschopenka-online`. `ie-gp-family-medicine` goes to
  `/ireland/en/gp-consultation-online`, which is not a `/services/` page.
- **Market fallback for the rest.** Two wildcard rules for `konsultace-*` /
  `konzultace-*`, plus 23 spelled-out Spanish and Portuguese slugs.

Deliberately excluded:

- **The 18 `-prescription` slugs.** Those flows are hidden behind a flag; pointing
  links at them would surface pages meant to stay unlisted.
- **Specialties with no live service page** — urology, venereology, geriatrics,
  endocrinology, gastroenterology, immunoallergology, pneumology, rheumatology,
  genetics.
- **Six genuinely ambiguous slugs** — `consulta-de-genética`,
  `consulta-ortopédica`, `consulta-pediátrica` and their `-1` duplicates are
  spelled identically in Portuguese and Spanish, so there is no market marker to
  read. They stay on the Ireland fallback.
- **Locale-prefixed variants.** All 195 inbound links use the bare form; the
  existing generic rules still catch any locale-prefixed stragglers.

`baja-medica` → `/ireland/en/book`, the wrong-market redirect flagged in §3.2,
is fixed: it now goes to `/spain/es/services/justificante-medico-online`. The
Portuguese `baixa-medica`, one letter away, goes to
`/portugal/pt/services/baixa-medica`.

### 7.2 The bug this nearly shipped with

**Next matches redirect `source` values against the encoded pathname.** A
literal `ã`, `ț` or `é` in a `source` therefore never matches a real request:
the rule compiles, passes type-checking, ships, and silently does nothing while
the slug falls through to the `/book` rule.

Caught by running the rules against a local dev server rather than reading them:
of 30 probe slugs, **all 14 ASCII ones matched and all 16 accented ones missed**,
landing on `/ireland/en/book`. The fix is `encodeURIComponent(legacySlug)` at
construction time, which keeps the source table readable with real accents. This
matters because roughly half the mapped slugs are accented — a review-only pass
would have shipped a table that did nothing for them.

### 7.3 Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` (frontend) | clean |
| All 195 legacy slugs driven through a local dev server, percent-encoded as a browser sends them | 195/195 redirect 301/308; **0 wrong destinations, 0 non-redirects** |
| Slugs now landing on a service page | **94/195** |
| Unmapped slugs still on a market `/book` | 101/101 — no regression |
| All 67 distinct destinations fetched from production | **67/67 return 200** |
| `booking-calendar-legacy-redirects.test.ts` | 6/6 pass |
| Same test with `encodeURIComponent` removed | 2/6 fail — the guard actually catches the bug |
| `npx vitest run tests/unit` | 277 passed, 5 skipped, **1 pre-existing failure** |

Market spread of the `/book` fallback before and after, which is the secondary
win — Wix left most non-Irish slugs unprefixed, so they were all defaulting to
Ireland's English booking page:

| Fallback | Before | After |
| --- | ---: | ---: |
| `/ireland/en/book` | 75 | **39** |
| `/portugal/pt/book` | 13 | 27 |
| `/czechia/cs/book` | 0 | 14 |
| `/romania/ro/book` | 11 | 11 |
| `/spain/es/book` | 2 | 10 |

**The one failing unit test is pre-existing and unrelated.**
`tests/unit/portal-breadcrumb-routes.test.ts` reports two portal breadcrumb
trails pointing at parent pages that do not exist
(`/admin/memberships/[planId]/levels`, `/account/corporate/book`). It reads only
the `app/` directory tree and never imports `next.config`; this batch's diff is
confined to redirect rules and one new test file. Flagged separately.

---

## 8. Implemented — every linked URL swept for dead ends (SEO-014)

§7 fixed the `wix.to` slugs. This widened the same treatment to the rest of the
backlink profile: the 520 backlinks reduce to **36 distinct target paths**, and
each was fetched from production.

**Seven were returning a hard 404.**

| Path | Was | Now |
| --- | --- | --- |
| `/services-1-4` | 404 | `/ireland/en` |
| `/pricing-plans/checkout-1` | 404 | `/ireland/en/pricing` |
| `/product-page/haemochromatosis-test` | 404 | `…/genetic-haemochromatosis-test` |
| `/product-page/vitamin-d-blood-test` | 404 | `…/vitamin-d-test` |
| `/product-page/vitamin-b12-blood-test` | 404 | `…/vitamin-b12-test` |
| `/product-page/thyroid-home-blood-test` | 301 into a 404 | `/ireland/en/lab-tests` |
| `/pt/portugal/traveler/'s-consultation` | 404 | `…/consulta-do-viajante` |

`/services-1-4` is the one named in §5 of this document — the broken link from
Coombe Community Pharmacy. **It now resolves.** The outreach email in the client
plan is still worth sending, because their link should point at a page we
choose rather than rely on a redirect, but the visitor no longer hits an error.

### 8.1 Two root causes

**No `/product-page/:slug` catch-all had ever existed**, even though
`/home-health-tests` has had one all along. Three slugs sat in the
`/home-health-tests` alias table and not in the `/product-page` one, so with
nothing to break their fall they 404'd rather than reaching the lab hub.

**A redirect can be present, correct-looking, and dead at the far end.**
`/product-page/thyroid-home-blood-test` pointed at
`/ireland/en/lab-tests/thyroid-function-test`, which has never been published —
a 301 straight into a 404. Worse, `legacy-url-cleanup.test.ts` asserted that
exact destination, so the test was holding the bug in place. Sweeping all 136
literal redirect destinations in `next.config.ts` against production found this
was the only dead one.

### 8.2 A regression I introduced and caught

The first version of the catch-all swallowed
`/es/product-page/beauty-focus-multibeauty`, which is registered in
`lib/seo/gone-content.ts` and must answer **410 Gone**. A catch-all redirect
silently turns a 410 into a 301 and keeps a retired URL alive in the index.
Caught by the existing suite, not by review.

Both new catch-alls now use `slugMatcherExcludingGone("product-page")` — the
helper the doctor-alias rules already use. Verified live: the retired product
still answers 410. Any future catch-all over a legacy Wix prefix needs the same
treatment.

### 8.3 Also retargeted

- `/{locale}/portugal/traveler's-consultation` — **eight referring domains, the
  largest non-homepage cluster in the whole profile** — was landing on
  `/portugal/pt/see-a-specialist`, because only the bare, non-locale-prefixed
  apostrophe form had a rule. Now reaches
  `/portugal/pt/services/consulta-do-viajante`.
- `/post/hand-foot-and-mouth-disease-signs-and-treatment` was falling to the
  blog index although the article is published under exactly that slug.

### 8.4 Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| 24 redirect assertions against a local dev server, incl. 10 regression cases | 24/24 |
| All 36 linked paths re-swept | **0 broken (was 7)**; 22 land on a precise page (was 20) |
| All 136 literal redirect destinations fetched from production | 1 dead found, now fixed |
| Retired product still answers 410 | confirmed |
| `npx vitest run tests/unit` | 282 passed, 5 skipped, 1 pre-existing unrelated failure |

The 13 paths that still land on a hub are correct: seven retired blog posts
with no current equivalent, a thyroid test that does not exist, the pricing
page, the homepage, and two specialist hubs at the right level.

