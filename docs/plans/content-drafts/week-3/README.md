# Week 3 editorial batch — one article per market

Prepared 7 September 2026. AI-assisted working drafts, primary language only.
**Seeded to production as six `DRAFT` BlogPost rows on 7 September 2026**
(`backend/scripts/seed-week3-blog-drafts-2026-09.ts --apply`, seededBy
`seed-week3-blog-drafts-2026-09`). Nothing is published. Every draft needs
native-language editing and the clinical drafts need clinician review; the
Brazil row has no reviewer doctor assigned yet.

Source of truth for the content: `backend/scripts/content/blog-week3-2026-09/`.
The `.html` files beside this README are previews produced by
`node --import tsx scripts/render-week3-blog-drafts-2026-09.ts --write`
(`--check` verifies they are current). **They mirror production's
calm-editorial presentation** (live since `9971db26`, 2026-08-26): the body is
run through the frontend's own `calmEditorialBlogHtml` / `prepareBlogArticleHtml`
and wrapped in the page hero, "On this page" sidebar and CTA, with the blog CSS
block and root tokens inlined verbatim from `frontend/app/globals.css`. The
retired dark-hero stylesheet embedded by `blog-seo-2026-08/template.ts` is
stripped exactly as production strips it. Content edits go in the TypeScript
module, then `render --write` and `update-week3-blog-drafts-2026-09.ts --apply`
(hash-guarded: never overwrites a row edited in the CMS, never touches a
published row). The seeder is dry-run by default and skips any slug/title collision.

## The six topics

| Market | File | Primary keyword (vol · KD) | Secondary keywords | Service CTA | Read |
| --- | --- | --- | --- | --- | --- |
| IE | `ie-adhd-assessment.en.html` | `adhd assessment ireland` (1,900 · 0) | `adult adhd assessment ireland` 480; `private assessment for adhd ireland` 260 | `mental-health-consultation` | ~5 min |
| PT | `pt-baixa-psicologica.pt.html` | `baixa psicológica` (1,900 · 0) | `baixa psicológica paga a 100` 880; `baixa por burnout paga a 100` 320 | `saude-mental` | ~5 min |
| CZ | `cz-neschopenka-vychazky.cs.html` | `neschopenka vycházky` (390 · 0) | `kontrola nemocenské po 22 hodině` 590; `neomezené vycházky na neschopence` 170 | `neschopenka-online` | ~5 min |
| ES | `es-como-bajar-tension.es.html` | `como bajar la tensión` (2,900 · 0) | `tensión alta como bajarla rápidamente` 1,600; `como bajar la tensión de forma natural` 720 | `enfermedades-cronicas-online` | ~5 min |
| RO | `ro-tensiune-mica.ro.html` | `tensiune mica` (4,400 · 0) | `ce sa faci cand ai tensiune mica` 2,900; `ce ridica tensiunea mica` 2,900 | `medic-online-romania` | ~5 min |
| BR | `br-atestado-comparecimento.pt.html` | `atestado de comparecimento` (8,100 · 0) | `declaração de comparecimento abona falta` 2,900; `declaração de comparecimento serve como atestado` 1,900 | `atestado-medico-online` | ~5 min |

Read time is the prose a reader actually reads (intro, sections, FAQs) at
200 wpm; each is 930–1,050 words of prose, 1,340–1,480 words including hero
chrome, link block, source list and disclaimer.

Topic selection follows `editorial-plan-2026-08-19.md` §2 (country-specific,
service-adjacent, no generic-condition translations) and §7.3 (Ireland ADHD,
Portugal burnout leave and Spain evidence-based BP were the named net-new
candidates). Brazil is one article, not a cohort, and remains a deferred market.
Myth-shaped queries in ES and RO (`remedios de la abuela`, `infusiones`,
`apă cu zahăr`, `vitamine`) are corrected inside the article, never served.

## Research record

OpenSEO project `GlobalHealthNew`, 7 September 2026. Starting balance 12,496
credits. Calls: `research_keywords` × 7 seeds (IE 2372/en, PT 2620/pt,
CZ 2203/cs, ES 2724/es, RO 2642/ro, BR 2076/pt × 2), `get_serp_results` × 6
queries at depth 10. No crawl, no project state change, no backlink call.
Estimated month volumes are from that pull and must not be mixed with Search
Console impressions.

SERP shape per market: IE — charity + private-clinic local pack, no neutral
public/private explainer; PT — bank and HR blogs, AI Overview; CZ — ČSSZ, law
blogs, finance press, AI Overview; ES — Mayo/NIH/FEC, AI Overview; RO — clinic
chains and pharmacy blogs, AI Overview; BR — gov.br, TST, JusBrasil, AI Overview.

Primary-source research was done by six parallel researcher passes on the same
day. Every fact used carries an access date of 7 September 2026 in the article.
Items the researchers could not verify from a primary page were dropped rather
than softened. Known re-check items before publication:

- IE: hse.ie, adhdirl.ie and adhdireland.ie were unreachable on the research
  day; the programme facts rest on the peer-reviewed evaluations and the ISHA
  summary. Re-fetch the HSE programme page and the ADHD Ireland price range.
- PT: seg-social.pt and diariodarepublica.pt block direct fetches; percentages
  and waiting period were confirmed from the indexed Guia Prático text. Re-read
  the 2026 Guia before seeding.
- CZ: the ČSSZ FAQ states checks are not limited to working hours; no ČSSZ text
  names "22:00" specifically, and the article says so.
- ES: the "≈1 mmHg per kg" weight figure is attributed to international
  guidelines (ACC/AHA origin), not to ESC 2024; the 7.23/5.58 mmHg exercise
  figure is from the PMC review of ESC 2024.
- RO: the 500 ml water bolus wording was only partially verified and is
  written as "un pahar mare, băut repede".
- BR: planalto.gov.br and tst.jus.br bodies were unreachable; laws are cited
  from the Câmara dos Deputados originals and the TST explainer from its
  indexed text. Note the April 2026 Lei 15.377 change is included.

## Locale rule for later fan-out

Per `editorial-plan-2026-08-19.md` §3, if these are approved: IE `en` (+ `ro`,
`es`, `pt`, `de` only if treated as administrative — ADHD is clinical, so `en`
only unless GSC shows otherwise); PT `pt` + `en` (+ `de`); CZ `cs` + `en`
(+ `de`, it is administrative); ES `es` + `en`; RO `ro` + `en`; BR `pt` + `en`.
Do not translate before native review of the primary draft.

## Status

- Drafts written and rendered: 6/6.
- Renderer `--check`: passing. `tsc --noEmit` on backend: no errors in the new files.
- Blog-reviewer pass (7 September 2026) on the first render scored 63–77/100.
  Every deduction for missing schema, OG tags, canonical, images and the
  anonymous byline is a property of the standalone HTML format, which the CMS
  renderer supplies at publish time, and of the deliberate draft disclaimers.
  The actionable findings — non-native phrasing, over-parallel triads and
  uncited claims — were fixed in the TypeScript source and the HTML re-rendered.
  Remaining uncited statements were removed rather than kept.
- CMS records created: **6 DRAFT** (IE `cmtqt4twk0000e0ju7tbsbuly`, PT
  `cmtqt4y960002e0juqqz9i01g`, CZ `cmtqt52f50004e0jugistr9vm`, ES
  `cmtqt56ko0006e0ju9bucdgfo`, RO `cmtqt5apk0008e0ju26kiv9qr`, BR
  `cmtqt5ec2000ae0juz1vxys7x`). Published: **0**. Translations: **0**.
- Ledger entry in `docs/plans/seo-control-state.md`: **not yet written**.
