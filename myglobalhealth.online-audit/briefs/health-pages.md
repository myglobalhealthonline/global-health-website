# Content briefs — the 12 remaining `/health/` pages

Phase 3, item 3.1 of `ACTION-PLAN.md`. Covers the twelve `/health/` slugs that
stay self-canonical after the three sick-cert overlaps were pointed at their
`/services/` twin in `7130d7e1` (2.4b). These are content briefs — SEO
targeting, structure, word budgets, sourcing and linking requirements — not
copy. No medical claim, dosage or treatment guidance is written here; every
brief marks what a clinician must supply.

All current-state numbers (titles, H1s, H2 order, word counts, byline
presence) were re-fetched live on 2026-08-03, not carried over from the
audit. All demand numbers are GSC, `sc-domain:myglobalhealth.online`,
trailing 90 days, `page` and `page,query` dimensions.

## Finding that changes the brief for 8 of the 12 pages

The audit's 3.1 framing was "deepen or reposition, pick one." Live-fetching
the site's own `/services/` pages for these same conditions turns up
something the audit didn't check: **the deepen path is already taken, by a
different page.**

| Condition | `/health/` page (this brief) | Existing deep asset that already covers it |
|---|---|---|
| Diabetes (IE) | 320w, no byline | `/ireland/en/services/chronic-disease-consultation` — ~2,100w, explicitly lists "Type 1 and Type 2 diabetes — monitoring, management, and complication prevention" under Metabolic & Endocrine. Also `/ireland/en/blog/diabetes-a-silent-disease` — 3,846–4,085w, physician byline + reviewer + schema. |
| Hypertension (IE) | 350w, no byline | Same `chronic-disease-consultation` page — "Hypertension and blood pressure management" under Cardiovascular. |
| Migraine (IE) | 320w, no byline | `/ireland/en/services/neurology-specialist-consultation` — ~3,500w, dedicated "Headache & Migraine" section and FAQ entry naming migraine explicitly. |
| Respiratory infections (IE) | 280w, no byline | `/ireland/en/services/acute-medical-consultation` — ~2,100w, dedicated "Respiratory & ENT" section (cold/flu/sinusitis/bronchitis/chest infection/mild asthma). |
| Diabetes (PT) | 350w, no byline | `/portugal/en/services/medicina-geral-e-familiar` (family-and-general-medicine) — ~2,100w, explicitly lists "Type 1 and type 2 diabetes — monitoring, management, and complication prevention." |
| Hipertensão (PT) | 450w, no byline | Same `medicina-geral-e-familiar` page — "Hypertension and cardiovascular risk management." |
| Enxaqueca (PT) | 350w, no byline | No PT neurology-specialist service page exists (Portugal's service list has no neurology slug) — weaker overlap than the other three, see its own brief below. |
| Infeções respiratórias (PT) | 350–400w, no byline | `medicina-geral-e-familiar` mentions "chronic respiratory conditions" and asthma but **not** acute respiratory infections by name — weakest overlap of the four, see its own brief. |

For diabetes, hypertension, migraine (IE) and diabetes, hipertensão (PT):
this is now a three-deep stack on one topic — thin `/health/` page, deep
`/services/` page that already names the condition, and (for diabetes) a
4,000-word blog article with a credentialed byline. That is the same
cannibalisation pattern already fixed for sick-cert in 2.4b, just not an
exact slug collision this time — a topic collision. **Deepening the
`/health/` page here would build a fourth asset to compete with the site's
own third asset.** Repositioning it to feed the existing deep page is the
lower-effort, higher-leverage move, and it is engineering + a content pass,
not new medical writing.

Enxaqueca and infeções respiratórias in Portugal are weaker cases for
reposition — the overlap is partial (Portugal has no neurology service page,
and the general-medicine page doesn't name acute respiratory infections) —
so those two get a lighter-touch reposition brief rather than a straight
redirect-style consolidation.

This also means the audit's own §3.1 framing needs a footnote: "deepen or
reposition" implicitly assumed the `/health/` page was the only content
asset on the topic. It usually isn't.

## Ordering and its basis

Ordered by total trailing-90-day GSC impressions across all six locales of
each slug (demand signal), with the three audience-intent pages assessed on
their own terms per the brief and moved up where they show real, undiluted
query intent that no other page on the site currently serves — unlike the
condition pages, they aren't competing against the site's own deeper assets.
Pages with zero recorded impressions are ordered last and flagged as such
rather than guessed at.

| # | Page | 90-day impressions (all locales) | Clicks | Decision |
|---|---|---|---|---|
| 1 | Ireland — hypertension | 51 | 0 | Reposition |
| 2 | Portugal — infeções respiratórias | 41 | 0 | Reposition (light) |
| 3 | Ireland — international students | 12 | 0 | Strengthen (audience) |
| 4 | Portugal — enxaqueca | 13 | 0 | Reposition (light) |
| 5 | Ireland — expat healthcare | 8 | 0 | Strengthen (audience) |
| 6 | Ireland — arabic-speaking doctor | 4 | 0 | Strengthen (audience) |
| 7 | Ireland — diabetes | 4 | 0 | Reposition |
| 8 | Ireland — online prescription | 2 | 0 | Deepen (genuine gap) |
| 9 | Ireland — migraine | 1 | 0 | Reposition |
| 10 | Portugal — hipertensão | 1 | 0 | Reposition |
| 11 | Portugal — diabetes | 0 recorded | 0 | Reposition |
| 12 | Ireland — respiratory infections | 0 recorded | 0 | Reposition |

Every one of these twelve is low-traffic in absolute terms — this is a
long-tail cleanup pass, not a growth bet. The point of ordering isn't "these
will move the needle," it's sequencing so the pages with the most existing
signal (even at these small numbers) and the clearest structural fix go
first.

---

## 1. Ireland — Hypertension (`/ireland/*/health/hypertension`)

**Current state.** Title "Hypertension Care Ireland | Online Doctor · Global
Health." 350 words, 7 H2s (`Manage high blood pressure from home`, `Book your
review`, `Related health topics`, `Ready when you are`, plus footer trust
H2s). No byline, no reviewer, no `lastReviewed`. 90-day GSC: 51 impressions
across `cs`, `es`, `pt` locales (no `en` impressions recorded), 0 clicks,
average position 45–100.

**What it already ranks for (real queries, from GSC):** "blood pressure
medication online," "blood pressure medicine online doctor," "can i get
blood pressure meds online," "order blood pressure medicine online," "online
blood pressure prescription," "online doctor high blood pressure" — all at
positions 40–100. Every one of these is a **prescription-transaction query**,
not an informational "what is hypertension" query.

**Decision: reposition.** The query data settles this on its own — nobody is
searching to learn about hypertension from this page, they're searching to
get a blood-pressure prescription online. The page's own H2s ("Manage high
blood pressure from home," "Book your review") already read as
service-intent, not explainer-intent — the content structure has been
fighting the "condition page" label the whole time. Reposition as "Blood
pressure management online — Ireland," and route the deep clinical content
(what hypertension is, how it's diagnosed, treatment classes) to
`chronic-disease-consultation`, which already owns that ground at 2,100
words. Do not attempt to out-explain HSE/NHS on hypertension from a 350-word
page competing at position 45–100 — that fight is not winnable and isn't
the fight the traffic wants anyway.

**Target queries.** Primary: "blood pressure medication online Ireland."
Secondary (from GSC, real): "online blood pressure prescription," "blood
pressure medicine online doctor," "order blood pressure medicine online."
No independent keyword-volume tool was run for this brief — GSC impression
counts above are the demand evidence; treat volume as low but real (real
users are typing these, at low frequency, and currently getting served a
page ranking at position 45–100 for it).

**Required sections and word budget (~550 words total):**
- H1 + 60–80w framer: what the page does (ongoing BP management/prescription
  review online), who it's for. *No mechanism-of-disease content here —
  that's the service page's job.*
- 100–120w: how the online BP review works (video call, monitoring
  cadence, what the doctor needs from the patient — home readings, current
  meds). Service-intent, not explainer.
- 80–100w: who this is and isn't appropriate for (stable, already-diagnosed
  hypertension vs. new/uncontrolled — the latter should route to same-day
  acute care, not this page). *Clinician must supply the actual clinical
  triage line.*
- 60w: pricing + what happens after (mirrors the `chronic-disease-consultation`
  page's existing pricing block — do not introduce a second price point for
  the same service).
- 80–100w: link-out block, explicit: "For the full picture on managing a
  chronic condition day to day, see Chronic Disease & Ongoing Care." This
  is the internal link that should carry most of the page's remaining SEO
  weight to the deeper asset.
- FAQ (2–3 Qs, ~120w): the two DSP/prescription-mechanics questions implied
  by the ranking queries ("can I get a BP prescription online in Ireland,"
  "how do I get repeat BP meds without an in-person visit") — answers must
  come from a clinician/compliance review, not drafted here.

**E-E-A-T.** Credit a GP-level reviewer — Dr Tiago Miguel Figueira (IMC
523449) already carries this register-and-review pattern on the Ireland
blog and is a General Practitioner, the correct specialty for chronic BP
management. Add `reviewedBy`/`lastReviewed` matching the blog pattern. Do
**not** state a specific BP threshold, medication class, or monitoring
frequency without clinical sign-off — those are exactly the claims a
YMYL/medical-device-adjacent page gets penalised for getting vague or wrong.

**Internal linking.** Link forward to `chronic-disease-consultation` (primary
target) and to `/ireland/*/doctors` filtered/described as GP-registered.
Link back from: the `chronic-disease-consultation` page's own "Related
conditions" module (if one exists — check before adding, don't duplicate),
and from `treatment-review` if it discusses ongoing prescriptions.

**Schema.** `MedicalWebPage` or `Service` (match whatever type
`chronic-disease-consultation` uses, for consistency) with `Physician`
reviewer object. No `MedicalCondition` schema — that would restate the
"this page explains hypertension" framing being deliberately dropped.

---

## 2. Portugal — Infeções respiratórias (`/portugal/*/health/infecoes-respiratorias`)

**Current state.** Title "Respiratory Infections — Online Doctor in Portugal
| Global Health." 350–400 words. No byline. 90-day GSC: 41 impressions (`en`
75.4 avg position, `de` 73.1), 0 clicks — the query text itself is mangled
in the API's encoding (`infe��o respirat�ria` / `infec��o respirat�ria`),
almost certainly "infeção respiratória" / "infecção respiratória" —
**genuinely informational-adjacent but urgent-symptom-shaped** ("I have a
chest infection, what do I do") rather than pure explainer intent.

**Decision: reposition (light touch).** Unlike the IE hypertension page,
Portugal's `medicina-geral-e-familiar` service page does **not** name acute
respiratory infections explicitly (confirmed live — it mentions chronic
respiratory conditions and asthma, not the acute infections this page's
queries want). So this isn't a clean "point at the deeper asset" fix; the
deeper asset needs to gain that content too, or this page needs to stay the
primary landing spot for the acute-symptom query while linking sideways.
Reposition as a same-day-triage page ("Chest infection, cough, sore throat —
see a doctor today") rather than a disease-explainer, matching the query's
urgency, but keep it as the page of record for this specific intent rather
than routing it away.

**Target queries.** Primary: "infeção respiratória médico online" (inferred
spelling from the mangled GSC rows). Secondary: none with independent
volume confirmed this run — flag for a follow-up GSC pull once the encoding
issue is fixed in the reporting pipeline (a real, separate small bug: this
API is returning mojibake for accented Portuguese query text, worth a
one-line ticket).

**Required sections (~500 words):**
- H1 + 70w: same-day framing, what conditions are covered (upper/lower
  respiratory: cold, sinusitis, bronchitis, chest infection — clinician to
  confirm scope matches what a GP-level video consult can actually triage).
- 100w: how a same-day video assessment for a respiratory infection works,
  red flags that mean "go to urgent care instead" (breathing difficulty,
  chest pain, etc.) — **clinician-supplied red-flag list is mandatory here,
  this is the one place on this page where getting it wrong is dangerous.**
- 80w: what's NOT appropriate for this route (suspected pneumonia requiring
  in-person exam, severe symptoms) with explicit escalation guidance.
- 60w pricing/booking.
- 100w: link block to `medicina-geral-e-familiar` for anyone whose symptoms
  are chronic/recurring rather than acute.
- Short FAQ (~90w): antibiotics-online expectation-setting (a clinician must
  write this — do not let the page imply antibiotics are dispensed on
  request).

**E-E-A-T.** GP reviewer — Dr Tiago Miguel Figueira (OM 77986, Portugal
registration) or another Portugal-registered GP from the current roster
(Dra. Margarida Domingues e Andrade, Dra. Nádia Cavaco — both General/Family
Medicine, OM-registered). Cite Direção-Geral da Saúde (DGS) guidance on
when a respiratory infection needs in-person care, rather than asserting it
unsourced.

**Internal linking.** Link to `medicina-geral-e-familiar`, and to the
Portugal doctors list filtered to General/Family Medicine. Suggest adding an
explicit "acute respiratory infections" line to `medicina-geral-e-familiar`'s
own conditions-covered list so the two pages reinforce rather than compete —
flag to whoever owns that page's content, out of scope for this brief to
edit.

**Schema.** `MedicalWebPage` + `Physician` reviewer, matching the Ireland
pattern once decided.

---

## 3. Ireland — International students (`/ireland/*/health/international-students`)

**Current state.** Title "Doctor for International Students Ireland |
Online · Global Health." 350 words, H2s include the standard trust-signal
block. No byline. 90-day GSC: 12 impressions across `en`, `es`, `ro`, best
position 4.8 (`en`) — **by far the best average position of any page in this
set.** One real query: "international student gp registration" (1
impression, position 8).

**Decision: strengthen as its own thing — do not fold into a service page.**
This is an audience-intent page, not a condition page, and it's the closest
thing in this set to a working page: it already holds a top-10 position on
at least one real query. No `/services/` page targets "international
student" as an audience, and no blog article does either — there is nothing
to cannibalise against and nothing deeper to route to. The audit's framing
("audience pages are a different animal, may be the strongest of the set")
holds up under the GSC data specifically for this page.

**Target queries.** Primary: "international student GP registration
Ireland" (confirmed real query, best-ranking term on the page already).
Secondary, inferred from the intent (not GSC-confirmed — say so plainly):
"GP for international students Ireland," "college health insurance GP
Ireland," "student visa medical requirements Ireland."

**Required sections (~700 words — this one earns the larger budget, it's
the strongest page in the set):**
- H1 + 80w: framing — international/exchange students without an
  established GP, what this service solves.
- 120w: GP registration mechanics for international students specifically —
  what's needed to register with an Irish GP as a non-resident/student,
  how this service substitutes for or complements that. *Clinician/ops
  input needed on the actual registration mechanics — do not guess at HSE
  rules.*
- 100w: what it covers (routine illness, prescriptions, referrals,
  mental-health first contact) — link to relevant service pages rather than
  re-explaining each.
- 80w: insurance/cost context for international students specifically
  (private insurance vs. EHIC/GHIC eligibility depends on nationality —
  **do not state EHIC/GHIC eligibility rules without verification, this is
  the kind of claim that's wrong per-nationality and creates real
  liability**).
- 100w: languages spoken / doctor diversity — this page is a natural
  cross-link target for the arabic-speaking-doctor page and the planned
  language filter (3.8).
- FAQ (~150w): "do I need a PPS number," "can I register with a GP as an
  Erasmus/exchange student," "what if I'm only here for a semester" —
  clinician/ops-verified answers only.
- 70w booking/CTA.

**E-E-A-T.** No single clinician "owns" an audience page the way a GP owns
a condition page — credit the reviewing GP (Dr Tiago Miguel Figueira or
whoever is Clinical Director at time of publish) for the clinical-accuracy
parts, and separately note any registration/insurance guidance was checked
against current HSE/Citizens Information rules with a date stamp, since
that's the part that goes stale, not the medicine.

**Internal linking.** Cross-link both directions with expat-healthcare and
arabic-speaking-doctor (shared "audience, not condition" cluster) and to
`/ireland/*/doctors`. This trio should link to each other explicitly, which
none of them currently do per the live fetch.

**Schema.** `Service` or `MedicalWebPage`, no `MedicalCondition`. Consider
`FAQPage` given the FAQ block.

---

## 4. Portugal — Enxaqueca / migraine (`/portugal/*/health/enxaqueca`)

**Current state.** Title "Migraine Portugal | Online Medical Assessment ·
Global Health." 350 words. Unusually, one H2 is phrased as a qualifying
question ("Is this a new or occasional migraine, or do you have migraines
frequently?") — a genuinely good AI-citability/triage pattern already
present, worth keeping. No byline. 90-day GSC: 13 impressions (`en` "como
diagnosticar enxaqueca" 82 position, "enxaqueca" 55 position; `de` "como
diagnosticar enxaqueca" 56).

**Decision: reposition (light).** Same logic as infeções respiratórias —
Portugal has no neurology service page to route to, so this stays the page
of record for migraine intent in Portugal, but reposition from "explain
migraine" toward "get a migraine assessed/managed online," matching the
site's Ireland pattern where `neurology-specialist-consultation` already
proves the deeper-service-page approach works. If a Portugal neurology
service page is ever built, this becomes a straight reposition-and-link like
#1 above.

**Target queries.** From GSC: "como diagnosticar enxaqueca" ("how to
diagnose migraine" — informational, low position), "enxaqueca" (single
word, very broad, not winnable at 350 words). Given the query mix skews
informational rather than transactional (unlike hypertension), this page
has a weaker case for pure repositioning than #1 and #2 — flag as a
judgment call, not a clean-cut decision, and revisit once a Portugal
neurology page exists.

**Required sections (~550 words):**
- H1 + 70w intro.
- 100w: the existing triage question ("new/occasional vs. frequent") — keep
  and expand into a real branch: what each answer implies for next steps.
- 100w: what an online migraine assessment covers vs. doesn't (frequent/
  chronic migraine needing specialist neurology referral vs. occasional
  migraine manageable at GP level) — **clinician-supplied triage criteria.**
- 80w pricing/booking.
- 100w link-out to General/Family Medicine service page and to a future
  neurology offering if one launches.
- FAQ ~100w on red flags (sudden severe headache ≠ migraine, when to seek
  urgent care) — clinician-mandatory content, do not draft.

**E-E-A-T.** GP-level reviewer minimum (Portugal roster GP); note explicitly
on the page that frequent/complex migraine should see neurology, since
Portugal doesn't yet have a neurology service page to route to — an honest
scope limitation is itself a trust signal on a YMYL page.

**Internal linking.** To Portugal General/Family Medicine page; to Ireland's
`neurology-specialist-consultation` only if cross-market linking is judged
appropriate (see 3.7 in the action plan — cross-silo linking isn't built
yet, don't invent it here).

**Schema.** `MedicalWebPage` + reviewer.

---

## 5. Ireland — Expat healthcare (`/ireland/*/health/expat-healthcare`)

**Current state.** Title "Expat Healthcare Ireland | Online Doctor · Global
Health." 350 words. No byline. 90-day GSC: 8 impressions (`en` position
10.1, `ro` position 10) — second-best position in the set after
international-students. Real query: "mymedical ireland" (both `en` and
`es`) — a **branded/competitor query**, not a generic expat-healthcare
term, worth noting plainly: some of this page's traffic is people looking
for a specific competitor/product, not "expat healthcare" generically.

**Decision: strengthen as its own thing**, same reasoning as
international-students — audience-intent, nothing to cannibalise, decent
existing position. The SXO audit's persona scoring (73/100, "already
strongest") lines up with what the GSC data shows here.

**Target queries.** Primary: "expat healthcare Ireland," "GP for expats
Ireland." The one confirmed real query ("mymedical ireland") is a
competitor-name query and shouldn't be chased directly — but its presence
signals genuine comparison-shopping intent worth serving well on the page
regardless of exact keyword match.

**Required sections (~650 words):**
- H1 + 80w: framing for someone newly arrived without an established GP.
- 120w: what "GP for expats" solves specifically — registering with a GP as
  a non-national resident, EHIC/private insurance context (**verify with
  current HSE rules before publishing, same caution as brief #3**).
- 100w: what the service covers day to day.
- 100w: languages spoken — cross-link to arabic-speaking-doctor and the
  doctor list.
- 80w pricing.
- FAQ ~150w: PPS number, GP visit card eligibility for non-nationals,
  private health insurance recognition — **clinician/ops-verified only.**

**E-E-A-T.** Same pattern as #3 — clinical accuracy reviewed by a GP,
registration/insurance facts dated and sourced to HSE/Citizens Information.

**Internal linking.** Two-way with international-students and
arabic-speaking-doctor.

**Schema.** `Service`/`MedicalWebPage`, `FAQPage`.

---

## 6. Ireland — Arabic-speaking doctor (`/ireland/*/health/arabic-speaking-doctor`)

**Current state.** Title "Arabic-Speaking Doctor Ireland | Online
Consultation · Global Health." 350 words. No byline. 90-day GSC: 4
impressions (`de`, `es`), best position 7 (`de`) — small numbers but a
genuinely good position on what little query volume exists.

**Decision: strengthen — this is the page 3.8 (doctor-language filter
facet) is meant to feed, treat it as a template for that work rather than a
one-off fix.** The roster genuinely supports it: three Ireland doctors
currently list Arabic — Dr Abdelrahman Mustafa (GP), Dr Ahmed Maklad (GP,
also speaks Czech), Dr Fahad Farooq (Neurology Registrar, also speaks Urdu
and Punjabi). This isn't a thin page pretending to have substance — the
underlying supply (three named, credentialed, language-tagged doctors) is
real and citable.

**Target queries.** No query rows in GSC for exact "arabic speaking doctor
ireland" phrasing this period — say so plainly, demand evidence here is
weak/latent rather than confirmed. The audit's own reasoning (the page
existing and holding rank at all confirms latent intent) is the best
evidence available; do not overstate it as proven demand.

**Required sections (~600 words):**
- H1 + 80w intro, in a tone that reads naturally to an Arabic-speaking
  reader even in English (avoid generic "we speak your language" filler —
  name the doctors).
- 150w: introduce the three named doctors by name, specialty, and
  registration number, with a photo/profile link each — this is the
  section that actually differentiates the page from a generic "we have
  interpreters" competitor claim.
- 100w: what's covered (general GP care, neurology via Dr Farooq for
  anyone who lands here for a specialist need).
- 80w pricing/booking.
- FAQ ~100w: is the consultation conducted in Arabic or with a translator
  (clinician/ops to confirm actual delivery mechanism — don't assume
  live-in-Arabic consultation is accurate without checking).
- 90w cross-link to the doctors directory and to expat-healthcare/
  international-students.

**E-E-A-T.** The named-doctor block itself is the E-E-A-T asset here — lean
into it more than a generic reviewer byline. Still add a GP reviewer line
per the site's standard pattern.

**Internal linking.** Two-way with the doctors directory (once/if a language
filter ships per 3.8, this page becomes the natural landing page for that
facet's Arabic filter) and with expat-healthcare/international-students.

**Schema.** `Physician` objects for the three named doctors (reuse whatever
schema pattern their own profile pages already use), `Service`/
`MedicalWebPage` for the page itself.

---

## 7. Ireland — Diabetes (`/ireland/*/health/diabetes`)

**Current state.** Title "Diabetes Care Ireland | Online Doctor · Global
Health." 320 words. No byline. 90-day GSC: 4 impressions (`es`, `pt`), no
clicks.

**Decision: reposition**, per the finding at the top of this doc —
`chronic-disease-consultation` already names diabetes explicitly at 2,100
words, and the Ireland blog already has a 3,846–4,085-word physician-authored
diabetes article (`diabetes-a-silent-disease`). A deepened `/health/diabetes`
would be a fourth diabetes asset. Reposition to "Diabetes care online —
ongoing review and prescriptions," feed the deep content and blog article
via prominent links, and keep this page's job narrow: get someone who
already knows they have diabetes and wants an online review to booking,
fast.

**Target queries.** GSC: no independent query rows recorded this period for
this specific slug beyond the 4 impressions noted — genuinely low/no
confirmed demand, say so plainly rather than inferring generic "diabetes
Ireland" volume that isn't evidenced here.

**Required sections (~500 words):**
- H1 + 70w: ongoing diabetes care/review online, narrow scope.
- 100w: what the review covers (medication review, monitoring discussion) —
  explicitly not new-diagnosis or emergency (route acute concerns
  elsewhere) — **clinician to define the actual triage boundary.**
- 80w: link block — "for full detail on managing diabetes day to day" →
  `chronic-disease-consultation`; "to read about living with diabetes" →
  the blog article. Two distinct link targets, two distinct reasons to
  click.
- 60w pricing/booking.
- FAQ ~120w on repeat prescriptions for diabetes medication specifically.
- 70w: brief signpost to Diabetes Ireland (the actual patient charity) as
  an external authority resource — a link OUT to a non-competing authority
  is itself a trust signal the current page lacks entirely.

**E-E-A-T.** Reviewer: Dr Tiago Miguel Figueira (IMC 523449) or whichever
GP is credited on the blog article — reuse the same physician for
consistency rather than introducing a new name for the thin page.

**Internal linking.** To `chronic-disease-consultation` and to
`diabetes-a-silent-disease`. Ensure the blog article and service page both
link back to this page only if it earns its place as the "book now" quick
path — otherwise the cleaner move (flag to the site owner, out of scope to
decide here) may be canonicalising this page onto `chronic-disease-
consultation` outright, the same treatment sick-cert got in 2.4b.

**Schema.** `MedicalWebPage`, `Physician` reviewer. No standalone
`MedicalCondition` schema, to avoid the page presenting itself as the
canonical diabetes explainer when it deliberately isn't one.

---

## 8. Ireland — Online prescription (`/ireland/*/health/online-prescription-ireland`)

**Current state.** Title "Online Prescription Review Ireland | GP
Consultation · Global Health." 450 words — already the longest page in this
set, with a "How it works" section and an FAQ, structurally the closest to a
real transactional page already. No byline. 90-day GSC: 2 impressions
(`es`, `pt`), query "online prescription ireland" / "online prescriptions
ireland," both 1 impression.

**Decision: deepen — this is the one genuine gap in the set.** Confirmed
live: the `treatment-review` service page explicitly is **not** about
repeat/renewal prescriptions ("Continuation of any treatment is a clinical
decision... distinguishing it from automatic prescription renewals"). So
unlike the four condition pages above, there's no deeper asset already
covering "get my repeat prescription renewed online" — this page owns that
intent alone on the site. Low current demand (2 impressions), but it's real,
undiluted demand with nowhere else to go, and the page is already closest
in shape to the target (has an FAQ, has a "how it works" section) — the
lowest-effort deepen in the set.

**Target queries.** Primary: "online prescription Ireland." Secondary
(inferred, not GSC-confirmed): "repeat prescription online Ireland,"
"renew prescription online doctor Ireland."

**Required sections, growing from 450 to ~900 words:**
- Keep existing H1/intro, "How it works," FAQ structure — it's sound.
- Expand "How it works" with the specific mechanics: what counts as an
  eligible repeat prescription, what doesn't (new medications, controlled
  substances — **clinician/compliance to define the actual eligible-drug
  boundary, this is a genuine regulatory line, not a content-writer
  decision**), turnaround time, how the prescription is delivered
  (pharmacy-direct vs. patient-held).
- New 150w section: what this is NOT (contrast explicitly with
  `treatment-review`, since that page already draws this distinction —
  reuse its own language rather than contradicting it).
- Expand FAQ to 5–6 Qs: eligible medications, turnaround, pharmacy
  delivery, cost, what happens if the doctor declines to renew.
- Add pricing prominently near the top, matching the sick-cert-page pattern
  (price-forward performed well enough in 2.4's competitive read to be worth
  copying here).

**E-E-A-T.** GP reviewer, same pattern as above. This page is closer to a
"transactional service page" than a "condition explainer," so the
`lastReviewed` cadence should track the site's prescribing-policy review
cycle, not a generic annual date — flag to whoever owns that policy.

**Internal linking.** Two-way with `treatment-review` (the two pages should
explicitly disambiguate each other, both directions) and with the doctors
directory.

**Schema.** `Service` + `Offer` (price) + `FAQPage` — this page is the
strongest FAQPage candidate in the whole set given it already has real FAQ
content to extend.

---

## 9. Ireland — Migraine (`/ireland/*/health/migraine`)

**Current state.** Title "Migraine Doctor Ireland | Online Assessment ·
Global Health." 320 words. No byline. 90-day GSC: 1 impression (`de`),
query "migraine specialist ireland," position 64.

**Decision: reposition**, same logic as #1 and #7 —
`neurology-specialist-consultation` already runs a dedicated "Headache &
Migraine" section at ~3,500 words with FAQ coverage. Effectively identical
treatment to the diabetes brief above: narrow this page to fast-path
booking/triage, route depth to the specialist page.

**Target queries.** Only one confirmed row: "migraine specialist ireland"
(1 impression, position 64 — essentially unranked). Treat as no confirmed
demand; the audit's positioning of this as a condition page competing with
Mayo/NHS was always a long shot at 320 words and position 64 confirms it.

**Required sections (~450 words):** mirror brief #7's structure —
short framer, narrow scope (ongoing/diagnosed migraine review, not new
neurological symptom triage — **explicitly route sudden/severe/new
neurological symptoms to urgent care, this is a genuine red-flag boundary a
clinician must set, not a content default**), pricing, and a prominent link
to `neurology-specialist-consultation` for anyone who needs the fuller
specialist workup.

**E-E-A-T.** Credit Dr Fahad Farooq (Neurology Registrar, IMC 421252) as
reviewer — the roster already has the right specialist for this exact page,
unlike the diabetes/hypertension pages which use a GP reviewer.

**Internal linking.** To `neurology-specialist-consultation`, two-way.

**Schema.** `MedicalWebPage`, `Physician` reviewer (Dr Farooq).

---

## 10. Portugal — Hipertensão (`/portugal/*/health/hipertensao`)

**Current state.** Title "Hypertension Portugal | Online Doctor · Global
Health." 450 words — already the longest PT page in the set. No byline.
90-day GSC: 1 impression (`de`), query "médico online pressão alta,"
position 5 — small sample but a strong position on a real transactional
query ("online doctor high blood pressure").

**Decision: reposition**, same finding as #1 — `medicina-geral-e-familiar`
already names "Hypertension and cardiovascular risk management" explicitly.
Given this page is already 450 words and already ranks well (if thinly) on
a transactional query, this is the lowest-effort brief in the set: tighten
toward the transactional framing already working, add the link-out, don't
rebuild from scratch.

**Target queries.** Primary: "médico online pressão alta" (confirmed,
position 5). Treat this position as worth protecting, not risking with a
scope change that drifts away from what's already working.

**Required sections (~500 words):** same shape as brief #1 (hypertension
IE) — service-intent framing, triage boundary for stable-vs-new hypertension
(clinician-supplied), pricing, FAQ, and a link block to
`medicina-geral-e-familiar` for the fuller chronic-disease picture.

**E-E-A-T.** Portugal GP reviewer (Dr Tiago Miguel Figueira, OM 77986, or
another General/Family Medicine-registered doctor from the PT roster).

**Internal linking.** To `medicina-geral-e-familiar`, two-way.

**Schema.** `MedicalWebPage`, `Physician` reviewer.

---

## 11. Portugal — Diabetes (`/portugal/*/health/diabetes`)

**Current state.** Title "Diabetes Portugal | Online Doctor · Global
Health." 350 words. No byline. 90-day GSC: **zero recorded impressions in
the trailing 90 days across all six locales** — say this plainly rather than
inferring demand that isn't there.

**Decision: reposition**, same rationale as Ireland diabetes (#7) —
`medicina-geral-e-familiar` already explicitly names Type 1/Type 2 diabetes
management. With zero measured demand on top of the cannibalisation
argument, this is the clearest "shrink and redirect the SEO weight, don't
invest more words" case in the set.

**Required sections (~450 words):** same shape as #7 — narrow to
ongoing-review framing, link block to `medicina-geral-e-familiar`, pricing,
short FAQ, external link to a Portuguese diabetes-patient authority
(Associação Protectora dos Diabéticos de Portugal or equivalent — verify
the correct current body before citing).

**E-E-A-T.** Portugal GP reviewer, matching #10.

**Internal linking.** To `medicina-geral-e-familiar`, two-way.

**Schema.** `MedicalWebPage`, `Physician` reviewer.

---

## 12. Ireland — Respiratory infections (`/ireland/*/health/respiratory-infections`)

**Current state.** Title "Respiratory Infections — Online Doctor Ireland."
280 words — the shortest page in the entire set. No byline. 90-day GSC:
**zero recorded impressions across all six locales.**

**Decision: reposition**, same rationale as Portugal's equivalent page (#2)
but with a cleaner deeper-asset match: `acute-medical-consultation`
explicitly runs a "Respiratory & ENT" section (cold, flu, sinusitis,
bronchitis, chest infection, mild asthma) at ~2,100 words — a direct,
confirmed content match, unlike the partial PT overlap in #2. Zero measured
demand plus a clean deeper match makes this the most confident "shrink,
don't deepen" call in the set.

**Required sections (~450 words):** same-day-triage framing (matching #2's
structure), explicit red-flag/escalation section (**clinician-mandatory,
same caution as #2 — breathing difficulty, chest pain, high fever in a
child, etc. must come from clinical sign-off**), pricing, FAQ on
antibiotics expectations, and a prominent link to `acute-medical-
consultation`.

**E-E-A-T.** GP reviewer, same pattern as the rest of the Ireland set.

**Internal linking.** To `acute-medical-consultation`, two-way — and
suggest (out of scope to implement here) that `acute-medical-consultation`
add an inbound link back down to this page as its "same-day, symptom-first"
quick-entry point, the way a hub might link to a narrower landing page.

**Schema.** `MedicalWebPage`, `Physician` reviewer.

---

## Sitewide notes for whoever implements these

- **None of the twelve pages currently carries a byline, reviewer, or
  `lastReviewed` date** — confirmed on every one via live fetch, not
  assumed from the audit. This is the single most consistent gap across the
  set and should be fixed as one shared template change (add the same
  author/reviewer block component the blog already uses) rather than
  per-page.
- **Translation vs. genuinely market-specific content:** the structural
  brief (section order, word budgets, schema) is identical across the IE/PT
  pairs covering the same condition (diabetes, hypertension) — that part is
  translate-and-localise. What must be genuinely written per market, not
  translated: the external-authority link (HSE/Diabetes Ireland vs. DGS/
  Portuguese equivalent), the regulator name in the reviewer credential
  (IMC vs. Ordem dos Médicos), and any insurance/registration mechanics
  text (Irish PPS/GP-visit-card rules are not Portugal's SNS rules). Each
  of these six locales per page also needs its own translation pass of
  whatever English/Portuguese master gets approved — that's separate work
  from this brief and not estimated here.
- **Where a "reposition" brief says link to a deeper `/services/` page**,
  confirm before publishing whether that service page's own "Conditions
  Managed" language should be expanded to explicitly reference back — a few
  are one bullet point away from a two-way match (e.g. `medicina-geral-e-
  familiar` naming acute respiratory infections, not just chronic ones).
  That's a small, separate content edit on the service-page side, flagged
  here, not written here.
