# SEO control state — canonical

**Last operational update: 2026-09-01.** Historical audit files remain snapshots;
this ledger is the source of truth for current status, dated gates and future work.

**This file is the single source of truth for the SEO workstream.** It carries the
remediation ledger, the organic-growth roadmap, and the indexation watchlist. Every
other SEO document in this repository is historical evidence, not current status.

Rebaselined: **2026-08-12** (task `SEO-RESET-001`, superseding the same-day
`SEO-CONTROL-001` pass; extended the same day by `SEO-FOUNDATION-001`, a
whole-site technical and shared-template completion audit — see §5 and §7) — this
date is when the control-state document and its evidence
were last refreshed, **not** the latest date GSC has data for. GSC lags ~3 days; every
GSC window in this file ends on the most recent date available at extraction time
(**2026-08-11** for the §1/§2 baseline, `dataState=all`), never on the rebaseline date
itself. The earlier `SEO-CONTROL-001` windows ended 2026-08-09; that two-day shift is
why §1 and §2 numbers differ slightly from the versions this document carried before.
Property: `sc-domain:myglobalhealth.online` · Site: `https://www.myglobalhealth.online`

The active forward plan (§27) is surfaced first for operators; the numbered baseline,
ledger and historical evidence follow from §0.

### 27.17 Portugal Ireland-parity implementation and publication gate (2026-09-01)

- A 75-row completion matrix now covers every live canonical `/portugal/pt` sitemap
  URL: 23 services, 16 doctor profiles, seven tools, four health guides, seven
  health articles and 18 hub, static or legal pages. Each row has one unique primary
  keyword, focused variants, live and proposed metadata, H1, deslop status,
  factual/clinical disposition and measured HTTP, canonical, `pt-PT` hreflang and
  robots/indexability, HTML/OG locale, valid page-applicable JSON-LD and booking-CTA
  checks. The final matrix has no duplicate primary or proposed
  title and no mechanically repeated `online online` or `Portugal Portugal` variant.
- The 28 previously approved recommendations remain a separate exact-copy manifest.
  A one-record-only, dry-run-first updater maps its 27 database-owned records to PT
  `PageContentTranslation`, `ServiceTranslation` or `DoctorMarketTranslation` rows.
  Every source mapping passed a production read-only dry run. The writer requires a
  source fingerprint, an exact match to the audited title/description, three distinct
  dated clinical/compliance/content-owner approvals, allowlisted HTTPS official
  sources, exact approved-copy hash, per-record token and credential-free database
  identity confirmation (protocol, host, effective port and database name),
  then rechecks and verifies inside a Serializable transaction. A clinical reviewer
  must match an active verified Portugal doctor record, professional body and active
  Portugal specialty. Compliance and content-owner approvals must match active,
  email-verified authorized users. Doctor writes additionally require the subject
  doctor or recorded delegation and a verified, hash-bound fact-register row whose
  canonical URL, doctor identity and registration match the live profile.
- **Clinically gated production copy remains unchanged.** All 28 clinical-register
  rows are `blocked_pending_review`; factual verification remains `no`. All 16 live
  doctor profiles are listed in a fact register as pending official verification.
  No service/profile metadata, bio, FAQ, clinical description, credential or
  availability claim was published. The Portugal hand-foot-mouth article's
  Ireland/HSE wording is held for clinical correction.
- Portugal-only pricing and FAQ metadata, H1 and visible lede corrections are live.
  A cache-busted production readback on deployment
  `b0cebff87d49540ce3205c41adf45f65bf2dfa45` matched both targeted routes. The
  pricing route still exposed plan-only CTA, heading, trust and onboarding copy with
  an empty catalogue, so a repository follow-up now hides those sections until plans
  exist and prevents upstream catalogue failures from becoming false 404s after the
  feature gate passes. Commit `48832d9c` is deployed and rendered-verified in Railway
  Development; the public custom domain still serves `b0cebff8`, so production
  promotion remains pending. Google's stored crawls from 2026-08-15
  (FAQ) and 2026-07-19 (pricing) predate the new copy; recrawl remains pending and a
  finalized 2026-08-01 to 2026-08-29 GSC refresh returned no query rows for either URL.
  Other current static/legal copy was retained where the live review found no
  justified change.
- The owner-authorized non-clinical HOME CTA was applied through its existing guarded
  one-field updater: the PT label is now `Marcar consulta`. Source/host checks,
  transactional readback and a post-write idempotent dry run passed. Public HTML
  returned 200 with the Portuguese CTA, no old English CTA, the self-canonical and
  `pt-PT` hreflang. This was the only production content write in the batch; its
  sanitized receipt is `seo/portugal/raw/production-write-receipt-2026-09-01-home-cta.json`.
- The Portugal reconciliation script is now read-only. It validates the 28 draft
  rows, 75 live-page rows, 28 blocked review rows and 16 pending doctor records,
  including unique keyword ownership and removal of guarantee wording from proposed
  metadata.

### 27.16 Czechia clinical rollout package prepared (2026-09-01)

- The 31 eligible clinical recommendations now have source-pinned, dry-run-first
  implementation payloads: three PageContent records, 15 service locale targets,
  five doctor-profile metadata records, one existing blog record and seven tool
  metadata/H1 records. Doctor biographies, clinical algorithms and unsupported FAQs
  remain unchanged.
- Every updater pins the production record identity, timestamp and source hash,
  preserves non-target locales and operational fields, rechecks inside a Serializable
  transaction and verifies exact saved state. English targets additionally require a
  recorded native reviewer. The two FAQ replacements remain limited to neschopenka
  and treatment renewal. Apply also requires Czech record ownership; a shared blog
  or incomplete six-locale service set aborts before a write.
- The clinical register now has explicit reviewer identity, review timestamp,
  approved-copy SHA-256 and native-review fields. The real `--apply` entry points
  read that register and refuse a write unless the matching row is approved and its
  recorded hash and reviewer data match the command. All 37 register rows remain
  `pending`, so no production write was attempted.
- Production dry-runs matched all 31 intended targets. Focused approval, content,
  source-protection, exact-readback and cross-market tests passed 51/51; backend
  type-check and the Czech artifact validator passed. Focused backend ESLint was not
  runnable because this checkout does not have the configured executable installed.
- The doctor-directory PageContent H1/lede is wired through the existing route only
  when country/locale is `cz`/`cs` and both fields exactly equal the approved pair.
  Pending, stale or other-market content keeps the existing i18n hero.
- A fresh 28-day Search Console page pull returned 172 Czechia page rows through
  2026-08-29. URL Inspection passed the ten sampled home, directory, service,
  doctor, article and tool URLs as indexed, with the Google-selected canonical
  matching the declared canonical. This is a baseline refresh, not authorization to
  publish clinically gated copy.

### 27.15 Czechia page-by-page local optimization package (2026-09-01)

- A 50-row completion matrix now covers every current `/czechia/cs` sitemap URL plus
  `/czechia/en` and `/czechia/en/services/lekar-online-praha`. It records one primary
  keyword, focused variants, live originals, proposed metadata/H1/description,
  bio/FAQ disposition, deslop, technical state, CTA/internal-link action and factual
  comparison for each page.
- All 481 keyword-master rows retain an owner URL present in the matrix. Low-volume
  terms stay mapped without creating pages or forcing unrelated service intent.
- Live checks on 2026-09-01 returned 200, self-canonical, `index, follow`,
  self-hreflang and route-appropriate structured data for all 50 URLs. The FAQ route's
  schema and tabs use the same source groups; inactive groups are user-visible after
  tab selection. Replay evidence is
  `seo/czechia/raw/live-page-seo-snapshot-2026-09-01.csv`.
- Repeated same-day, instant-confirmation and automatic-document wording is flagged
  for safe clinical-discretion/live-calendar replacement. Doctor bios and all verified
  clinical, registration, pricing, formula and legal facts remain unchanged.
- Owner implementation authorization for baseline `8af7a7e7` was recorded on
  2026-09-01. The 14 non-clinical static rows now use a `cz` + `cs`-only frontend
  overlay for the approved metadata and six changed H1s; other countries and locales
  retain their existing sources. Legal bodies and unchanged H1s were not rewritten.
- Cache-bypassed public readback on 2026-09-01 verified all 14 static URLs as HTTP
  200 with the approved title, meta description and H1, a self-canonical,
  `index, follow`, self-hreflang and route-appropriate JSON-LD. Booking and existing
  non-commercial link behavior remained intact. The matrix now records these rows as
  `live_verified_2026-09-01`; the pre-deployment original snapshot remains preserved
  as dated evidence. Production evidence is
  `seo/czechia/raw/static-page-production-readback-2026-09-01.csv`.
- **Clinically gated production copy remains unchanged.** The 31 eligible clinical recommendations are
  source-pinned guarded drafts whose apply commands remain blocked by the pending
  clinical register. Only the neschopenka and treatment-renewal services have exact
  FAQ replacements. The three GP/24-7/travel holds and two reviewed-no-change
  articles remain binding.
  Evidence: `seo/czechia/11-page-by-page-optimization.md` and
  `seo/czechia/page-by-page-completion-matrix.csv`.

### 27.14 Czechia review-gated service drafts (2026-09-01)

- Repository-only Czech drafts now cover the two eligible P0 service records:
  `/czechia/cs/services/neschopenka-online` and
  `/czechia/cs/services/obnoveni-lecby`. Their existing slugs, FAQ records,
  price, duration, booking state, assignments, visibility and publication state
  stay outside the content mutation surface.
- The neschopenka service keeps transactional assessment intent; the published
  eNeschopenka article keeps ČSSZ process intent. Treatment renewal owns
  `obnovení receptu online` and makes clear that an eRecept is not automatic.
  Unsupported same-day, guaranteed-document and volatile entitlement statements
  were removed from the drafts. Official ČSSZ/ePreskripce references and 155/112
  escalation are included where relevant.
- A dedicated updater defaults to dry-run, accepts one allowlisted slug, verifies
  exact record ID, `updatedAt`, source fingerprint and FAQ IDs, then requires the
  exact approved-copy hash, review date, verified-eligibility Czech reviewer ID and confirmation
  token before `--apply`. It rechecks the live record inside a Serializable
  transaction. Dry-runs matched full six-locale service and FAQ source hashes
  `880fd7d…834cc` and `8bd6489…e74ad8`. The updater now materializes existing
  non-target fallback values before a Czech base-field change, preventing Czech copy
  from leaking into another locale. Global service reviewer/date
  fields also remain unchanged because they are not locale-scoped; the external
  clinical register remains the approval record.
- **Production remains unchanged.** Recorded clinical approval remains unresolved,
  so no apply command was run.
  The clinical review register remains `pending`. The GP/24-7 and travel decision gate remains
  on or after **2026-09-08**. The English Prague service, other service pages,
  doctor biographies, routes, redirects, canonicals, sitemap and schema were not
  changed.
- The existing eNeschopenka article copy was not rewritten because it already
  separates informational intent and links to the service. Its public API record
  exposes a doctor-relation mismatch against the visible author/reviewer attribution;
  this needs source verification before any CMS correction and was not guessed.
- Verification passed: 13 focused content/updater tests, backend full suite,
  type-check, build, touched-file lint, Czech artifact validation, JSON parsing and
  `git diff --check`. Independent code, TypeScript and security reviews reported no
  remaining findings for the repository-only result.

### 27.13 Czechia final-data refresh and GA4 scope correction (2026-08-31)

- Final GSC data for `2026-05-31`–`2026-08-28` returns 141 clicks and 7,702
  impressions for Czechia page rows. Privacy-thresholded Czech-searcher query rows
  return 58 clicks / 2,871 impressions; they are not complete country totals.
  Priority ownership remains unchanged; the GP/article decision gate stays on or
  after **2026-09-08**.
- The prior Czech evidence described 24 GA4 organic sessions as a Czechia baseline.
  That figure is sitewide. Czechia organic landing-page rows account for 4 sessions,
  2 engaged sessions and no key events or transactions in the refreshed window. A
  Czechia-wide unique-user count is unavailable from this report. The country package
  now records the corrected scope.
- URL Inspection passed 11 of 12 priority URLs as indexed. Nine returned matching
  declared and Google-selected canonicals; two omitted the declared-canonical field.
  `/czechia/cs/services/druhy-nazor-praha` is unknown to Google but is a live P2
  service. Monitor a repeated inspection; do not change its route, sitemap, canonical
  or indexation controls from a single observation.
- No content, CMS/database, redirect, sitemap, robots, hreflang or route change was
  authorized. All clinically material Czech rewrites remain pending review. Exact
  calls and limitations: `seo/czechia/raw/focused-refresh-2026-08-31.json`.

### 27.12 Czechia refresh — local evidence and locale-link fix (2026-08-31)

- Fresh complete GSC data through **2026-08-27** confirms Czechia is no longer in a
  "missing page" state. `/czechia/cs`, `/czechia/cs/gp-consultation-online`,
  `/czechia/cs/services/neschopenka-online`, `/czechia/cs/services/obnoveni-lecby`,
  `/czechia/cs/services/lekar-online-praha`, and multiple Czech blog URLs are live
  and indexed. The immediate bottleneck is commercial query ownership and authority,
  not route absence.
- New Czech evidence pack added under `seo/czechia/` on 2026-08-31. Treat those
  files as current batch evidence only; this ledger remains canonical for next
  actions and status.
- Local frontend fix implemented for blog reviewer doctor links: non-English
  articles were linking the visible clinical-reviewer name to
  `/{country}/en/doctors/{slug}` rather than the article locale. Updated
  `frontend/lib/content/blog-post-page.tsx` to use a shared locale-aware doctor
  profile path builder, with focused test coverage. Deployment verification
  remains pending.
- Travel-medicine legacy URL behavior remains a recrawl / indexing-lag watch item.
  No redirect change is reopened by this batch. Re-measure Czech GP and travel
  ownership on or after **2026-09-08**.

### 27.11 Booking availability visibility — local implementation (2026-08-29)

- Public doctor, specialist, consultation, and service pages remain lifecycle- and
  publication-driven when online booking is paused. Availability does not change
  robots, canonical, hreflang, sitemap membership, `lastmod`, or crawlable profile
  and detail links.
- Entity-specific booking actions now consume an authoritative country + service +
  doctor policy and verified compatible slot. A normal non-working day therefore
  remains bookable when a real next working-day slot exists; unavailable and known
  returning states render non-navigating disabled controls.
- Public booking reads and writes, including forged/deep-linked, cart, appointment,
  reschedule, and doctor follow-up paths, enforce the same country, lifecycle,
  assignment, pause, and full-slot-overlap rules. Structured data omits false
  `InStock` offers and `ReserveAction` when the matching action is unavailable.
- Admin and doctor portal controls can schedule or clear a durable pause without
  deleting slots or cancelling existing appointments. Public cache tags are
  invalidated for affected markets.
- Post-review hardening preserves doctor/service editorial `updatedAt` values when
  pause fields change, so sitemap `lastmod` remains invariant. Public rosters remain
  complete but rank `BOOKABLE`, then `RETURNING`, then `UNAVAILABLE`, placing “Not
  accepting online bookings” cards last without removing their crawlable links.
- This is a **local implementation record, not deployment evidence**. The production
  migration, live checks, critical end-to-end proof, and two-week GSC observation
  remain open. Notification signup was not exposed because consent, unsubscribe,
  and idempotent delivery are not implemented.

### 27.10 Ireland public-copy humanization (2026-08-26)

- Ireland home, doctors, plans, about, contact, tool, doctor-profile and public
  service copy was reviewed for formulaic em-dash-heavy wording across EN, PT, ES,
  CS, RO and DE. Static copy was rewritten contextually; titles use ordinary title
  separators and prose uses sentences, commas or explanatory colons as appropriate.
- A guarded production pass updated only text-bearing fields on active public Ireland
  services, published page content, active Ireland doctor profiles and their visible
  FAQs. Prices, duration, assignments, booking state, visibility and publication state
  were outside the mutation surface.
- The final full-scope production preview returned zero remaining eligible em-dash or
  known fragment repairs. A separate grammar audit found and repaired the recurring
  sentence fragments left by an overlapping writer before verification.
- Frontend regression coverage now checks the six Ireland locales for the home,
  about, contact and public pricing copy plus the shared doctor/service messages used
  on those routes. Rendering may briefly show stale content until the 60-second Next
  data-cache revalidation completes or the frontend commit is deployed.

---

## 27. SEO-EDITORIAL-001 — selective short-form content growth and audit reconciliation (2026-08-25)

The six-market technical remediation program remains complete and in monitoring.
This section registers a separate owner-directed editorial experiment. It does not
reopen closed technical findings, and local HTML files do not count as CMS drafts,
published pages, indexed pages or measured outcomes.

### 27.1 Evidence that changes the plan

- Production holds 24 Week 1 blog records: 23 live locale records and one Romanian
  blood-pressure draft. The published Spanish blood-pressure record received the
  owner-approved patient-value correction on 2026-08-25. Six Week 2 primary-language
  records remain `DRAFT`; none was published by this work.
- On 2026-08-25 the local Week 2 primary-language cohort was reduced to the compact
  publication ranges and revalidated at: Portugal sickness-benefit 898 words, Ireland
  Illness Benefit payment 893, Czech sickness-pay calculation 897, Portugal driving
  certificate 899, Spain urgent blood-pressure 1,199, and Romania rapid blood-pressure
  safety 1,198. All six now pass the local content gates for sections, FAQs, linking
  and medical-safety wording.
- In the disclosed 28-day Search Console rows ending 2026-08-22, blogs produced
  64 clicks and 8,120 impressions, versus 5 clicks and 1,092 impressions in the
  comparison window. That supports continued content work, not indiscriminate volume.
- The 2026-08-25 OpenSEO crawl completed 100 URLs with no critical findings, but its
  sample contained no blog, tool or doctor URLs. It cannot validate those families.
- The backlink snapshot showed 62 referring domains. Several head terms are authority
  problems, so publishing more copy cannot substitute for relevant editorial links.
- The complete 36-locale Week 2 matrix now exists in production as six primary
  `BlogPost` records plus 30 `BlogTranslation` rows. The first 13 translations and
  the remaining 17 were added in separate guarded transactions after owner approval
  on 2026-08-29. The final live audit found five parents still `DRAFT` and the Spain
  urgent-blood-pressure parent `PUBLISHED`; neither translation import changed a
  parent status.
- The conversion funnel was verified in production on 2026-08-25. Only events after
  that deployment can be used to judge whether blog traffic becomes leads or revenue.

### 27.2 Implementation calendar

| Date | Implementation | Decision gate |
| --- | --- | --- |
| 2026-08-25 to 2026-09-08 | Finish the two Week 1 reviews; compact the six primary-language Week 2 articles; create CMS drafts only after explicit production approval; execute one real authority action per priority administrative cluster | Six primary CMS drafts created after approval on 2026-08-25; no translations published and no blanket 36-URL import |
| ~2026-09-01 | Run the registered Czech travel-medicine and Portugal doctor recrawl checks | Act only on a measured exception |
| ~2026-09-04 | Run the Brazil Sarmento recrawl check | Keep Brazil editorial expansion deferred unless clinical capacity and non-brand demand improve |
| ~2026-09-06 | Run the Romania doctor and second-opinion signal checks | Prefer improving an owner page over creating a competing article |
| **~2026-09-08** | Re-measure Ireland labs, Czech GP ramp, Spain dermatology and SEO-DOC-004; review the first editorial cohort's indexation and query ownership | Do not change the lab cluster before this gate |
| **~2026-09-30** | Measure country FAQs and legacy consolidation; run the first meaningful 30-day editorial review | Scale only pages with clear query ownership and useful commercial paths |
| ~2026-11-13 | Recheck Brazil/Romania generic commercial SERP walls and the first cohort's 60-to-90-day evidence | Refresh, consolidate, scale or stop from evidence, not publication count |

### 27.3 Publication contract

- Week 2's owner-approved CMS matrix is now all 36 locale variants: six primary
  records plus five translations per topic. Publication and clinical/native review
  remain separate gates; adding a translation row does not authorize a draft parent
  to be published.
- Administrative/process articles should usually fit 600–900 words; clinical or
  safety-sensitive articles usually need 700–1,200. These are working ranges, not
  ranking requirements.
- Answer the primary intent in the first 80–120 words. Use one service CTA family,
  three to five relevant internal links, and two to four non-duplicative FAQs only
  when useful.
- Use the primary query naturally in the title, H1, opening answer and one heading.
  OpenSEO secondary terms belong only where they answer the same intent. Do not insert
  every discovered keyword or create unrelated sections to chase density.
- Canonical `Global Health Medical Team` byline, preserved linked clinician
  provenance, a named clinical reviewer, a real review date, primary sources and
  native review remain publication gates. Never invent a byline, review,
  statistic or date.
- Production creation, publishing and external outreach remain separate actions that
  require the relevant owner approval.

### 27.4 Measurement gates

- **30 days:** indexation, query ownership, impressions and early ranking movement.
- **60 days:** clicks, CTR relative to position, commercial-path use and cannibalisation.
- **90 days:** qualified organic landings plus `begin_booking`, `begin_checkout` and
  `purchase`; decide what to scale, refresh, consolidate or stop.

Publication count and keyword count are not KPIs. The operating KPIs are reviewed,
indexable pages; earned demand; useful commercial paths; post-deployment conversion
signals; and relevant referring domains acquired.

### 27.5 Work this update does not reopen

- no blanket title or description rewrite;
- no tool CTA rebuild without page-level evidence;
- no mass `noindex` of locale variants;
- no lab-cluster content or linking change before the 2026-09-08 gate;
- no prescription content while the Google Ads trade-off remains binding;
- no rewriting historical audit counts to make them look current.

Current audit navigation is maintained in `docs/audits/seo/README.md`; the
plain-language implementation report is
`docs/audits/seo/seo-roadmap-review-2026-08-25.html`.

### 27.6 Local editorial preparation completed (2026-08-25)

- The two Week 1 production drafts were reviewed through read-only production
  access. Their CMS bodies exactly matched local source hashes, their safety and
  service-link checks passed, and both remain `DRAFT` with null publication and
  review dates. Native clinical acceptance remains outstanding.
- Week 2 kept all 36 source variants as research material at this preparation stage,
  while executable selection then permitted exactly the initial approved 19. The six primary-language articles were
  compacted first to 824-1,157 words and passed focused structure, metadata, link,
  intent and clinical-safety tests.
- Exactly 19 standalone HTML copies were rendered from the initial approved manifest. The
  safe seeder defaults to the six primaries and requires `--approved-locales` for
  the initial 13 approved translations. The later 17-row completion used the separate
  exact-matrix importer recorded in §27.12.
- Focused OpenSEO keyword, SERP, owner-page Search Console and domain-level backlink
  checks were refreshed on 2026-08-25. No broad crawl was run. The narrow backlink
  response reported 37 links from 36 referring domains and is not used to overwrite
  the dated broader profile. The evidence keeps Ireland payment separate from its
  claim guide, Czech calculation separate from the eNeschopenka guide, and the
  Spanish/Romanian articles safety-led.
- The six primary-language Week 2 rows were subsequently created as production
  `DRAFT` records after explicit approval; see §27.7. Nothing was published,
  deployed, pushed or sent externally. Native-language, clinician and current-rule
  review still gate publication.

### 27.7 Six primary-language CMS drafts created (2026-08-25)

The production seeder was rerun without `--apply` immediately before mutation. It
returned six `create` actions and no collisions. After explicit user approval, the
same default primary-only cohort was applied. A read-only verification pass then
returned all six rows as existing `DRAFT` records:

- PT sickness benefit `cmt8la5mj0000csjuzvvr49bg`;
- IE payment/timing `cmt8la96q0002csju6spj0o0n`;
- CZ sickness calculation `cmt8ladb60004csjuxgxyk4nu`;
- PT driving certificate `cmt8lahc30006csjuw55xnemg`;
- ES urgent blood pressure `cmt8laldn0008csjufi90oq5x`;
- RO blood-pressure safety `cmt8lapi9000acsju2l7jkq5m`.

No translation record was created, no pre-existing record was updated, and no draft
was published. The next authorized action is human/native/clinical review inside the
normal CMS workflow, not status promotion.

### 27.8 Blog cover-media completion (2026-08-25)

The Blog image workflow was applied to the August editorial inventory after an
owner-reported missing-cover check. The original 12-cover SEO set was regenerated or
refreshed in production, then eight additional covers were created for the two Week 1
blood-pressure records and the six primary-language Week 2 CMS drafts. Every image
uses a stable media key, a topic-specific editorial brief and a primary-locale alt
description; localized alt descriptions are stored for later translation rows.

Production was queried before and after the scoped writes. The final state is 30
active `BlogPost` records: 23 `PUBLISHED` and seven `DRAFT`, with zero missing or
inactive cover assets. All 30 linked media endpoints returned HTTP 200, an image
content type and a non-empty body. The live Spanish blood-pressure article also
rendered its expected new cover in served HTML. This media work did not change any
draft status, create translation rows or grant publication approval; the review gate
in §27.7 remains in force.

### 27.9 Patient-value correction pass and draft synchronization (2026-08-25)

All eight primary articles in the active Week 1 and Week 2 cohort were reviewed for
patient usefulness rather than keyword presence alone. The corrections add direct
answers, worked calculations, decision tables, escalation routes, document and
consultation checklists, and clearer boundaries between medical care and government
benefit, licensing or tax decisions. Time-sensitive claims now point to current
official sources, and unsupported completed-review wording was removed from the
approved local variants.

The exact 19 approved Week 2 standalone HTML copies were regenerated from the source
modules and passed the renderer check. Editorial tests passed 13/13, backend type-check
passed, and 27 distinct internal links used by the eight primary articles returned
HTTP 200 in focused production checks; no broad crawl was rerun.

After a successful dry run, the six Week 2 primary production records were updated in
one guarded transaction and independently re-read as `DRAFT`, unpublished and without
translation rows:

| Primary draft | Record | Saved body hash (SHA-256) |
| --- | --- | --- |
| PT sickness benefit | `cmt8la5mj0000csjuzvvr49bg` | `6129a2d99ee367a504a05693ef1f7445e023e99a5c73a32472795b7c58e4cebb` |
| IE Illness Benefit payment | `cmt8la96q0002csju6spj0o0n` | `e2dc454414402125e8d280346bc5f025910aa6a37c66ed138fa0b62407f118ef` |
| CZ sickness-pay calculation | `cmt8ladb60004csjuxgxyk4nu` | `1639ce7ad7e035c4e32b45ff0478df30af4c0ed6344cb5f1e2ce8f38095de5cf` |
| PT driving certificate | `cmt8lahc30006csjuw55xnemg` | `bbbe0d607d0115a4fd9434d4e0e83d42ac97fe1af3a85a8ed516b2866f8167d5` |
| ES urgent blood pressure | `cmt8laldn0008csjufi90oq5x` | `f1f9ee282796611d6e88fd051c8cf71544a2f6f306714c965744a473c10733bc` |
| RO rapid blood-pressure safety | `cmt8lapi9000acsju2l7jkq5m` | `7d78dd0826282b953a53931b32674e8238d86f546de81503ada7e68c366130a3` |

The Romanian Week 1 record `cmt5txspa0002s8julxban3bz` was also dry-run, updated and
re-read as `DRAFT`, unpublished and byte-equivalent to the corrected local source
(`ec41f2c3a7b7357ba84a562bb3939bf905267e1fd7f286c3cc49220e848d4bcb`);
its five existing translation rows were not changed. After separate explicit approval,
the Spanish Week 1 record `cmt5txqqn0000s8ju2rz5zg1u` was updated through a second
exact-record dry run and guarded transaction. It remained `PUBLISHED`, retained its
publication and review timestamps and five translation rows, and its saved body hash is
`5eba6fafff66d8fae86907c51686ad928cfbc8da55c6df62c12b8401c9f7bd6c`.
The public API and a cache-busted rendered route both returned HTTP 200 with the
corrected quick-reference heading. This pass did not publish a draft, create or edit
translation rows, deploy, push or send outreach.

### 27.10 Approved Week 2 translations added (2026-08-29)

The 13 approved non-primary Week 2 variants were rebuilt from the compact primary
articles with the Claude Blog translation workflow and a humanization pass. The
administrative translations render at 843-900 words; the clinical translations at
1,125-1,199. Each keeps the topic market's law, benefit system, emergency route,
official sources and service CTA. Existing keyword evidence covered every topic, so
no additional OpenSEO credits were used.

A scoped importer tied to the six exact parent IDs completed a clean production dry
run, then created all 13 `BlogTranslation` rows in one transaction. It locks the six
parents before rechecking draft state and source hashes, rejects any existing or
partial translation set, sanitizes HTML through the production blog sanitizer, and
uses the reviewed per-locale cover alt descriptions. Readback verified the exact
13-row matrix and, at that transaction's readback, confirmed that all six parents
remained active `DRAFT` records with null publication and review dates. No unapproved locale, status change, publication,
deployment, push or outreach occurred.

Focused editorial and importer tests passed 14/14, and backend type-check passed.
Native-language, legal and clinical review still gate publication.

### 27.11 Blog byline standardization to Global Health Medical Team (2026-08-29)

All current production blog posts now use `Global Health Medical Team` as the
stored and rendered author byline. The guarded production batch covered the exact
30-post inventory in one transaction: 24 `PUBLISHED` records and six `DRAFT`
records. It also normalized 121 embedded hero-author cards across post bodies and
translation bodies so the visible in-article byline matches the page chrome and
schema output.

The mutation surface was intentionally narrow. The script updated only
`BlogPost.authorDisplayName` plus the embedded author-card HTML, and then re-read
the inventory to confirm every post now carries the canonical byline. Existing
`authorDoctorId` and `reviewerDoctorId` relationships were preserved exactly,
including rows that already lacked an author-doctor link. No publication status,
review date, slug, body copy beyond the byline card, translation matrix, cover
media, deployment, push or outreach changed.

Frontend byline and structured-data helpers now present the medical-team byline as
the article author while retaining the linked clinician reviewer as the
`reviewedBy` entity. Focused frontend tests passed 14/14, the production script
tests passed 2/2, frontend and backend package type-checks passed, and the final
production readback verified all 30 blogs and all 121 embedded bylines with zero
clinical-link drift.

### 27.12 Remaining Week 2 translations completed (2026-08-29)

An exact live locale audit found 17 missing rows across the six Week 2 parents. All
17 already had full EN/PT/ES/CS/RO/DE source variants and topic-level keyword
evidence, so no additional OpenSEO credits were used. The Claude Blog translation,
localization and humanization workflows were applied to the missing variants. The
review corrected stale Czech wording for Irish Illness Benefit waiting days, several
Romanian mistranslations, mixed-English emergency/medication warnings, and literal
Czech, Portuguese, Spanish and German phrasing while preserving every jurisdiction,
threshold, source, internal link and service CTA.

The guarded importer enforces the exact 13-existing/17-missing matrix, locks all six
parents and all 13 existing translations, rejects slug collisions and creates only
new `BlogTranslation` rows. Its production dry run first detected that the Spain
urgent-blood-pressure parent had been published concurrently. The importer was then
hardened to preserve the current `PUBLISHED` parent and its existing EN/DE copies
verbatim, while continuing to require source equivalence for the five draft parents.
A second dry run passed; the apply transaction created exactly 17 rows. Readback
proved all six parents and all 13 existing translations unchanged.

The independent final production audit returned six parents, 30 translations and
complete CS/DE/EN/ES/PT/RO coverage for every topic. Five parents are `DRAFT`; the
Spain parent is `PUBLISHED`. Every parent retains the canonical `Global Health
Medical Team` author. The all-36 editorial and clinical-safety suite plus importer
tests passed 15/15, backend type-check passed, and review found no blocking issue.
No deployment, push, outreach, parent update, existing-translation update or
publication action was part of this completion.

A final whole-corpus audit returned 30 blog parents, 151 translation rows and **zero
missing supported locales**. One older hand-foot-and-mouth article still has a
redundant same-language EN translation in addition to its complete locale set; that
is a separate data-quality anomaly, not a missing translation, and was left unchanged.

### 27.13 Draft author attribution made team-only (2026-08-29)

The six current Week 2 drafts already stored and rendered `Global Health Medical
Team`, but each still carried a non-null `authorDoctorId`. That secondary CMS field
made the draft attribution contradictory even though the visible byline was correct.
A scoped, row-locked production migration cleared `authorDoctorId` on exactly those
six `DRAFT` records and did not change the canonical display name.

Readback verified all six drafts now have team-only authorship. Their six named
`reviewerDoctorId` links, 30 translation rows, bodies, slugs, statuses, publication
and review dates, metadata, cover assets and CTA services were preserved. The focused
tests passed 3/3, the full backend test command now includes the seven content-script
test files by default and passed, and backend type-check passed.

---

## 0. Operating rules

> **Before beginning any new SEO remediation or growth batch, refresh the relevant
> OpenSEO/GSC data and verify live production behavior. Historical audit counts are
> context, not the current source of truth.**

> **After every implemented/deployed SEO batch, update the canonical remediation
> ledger and growth roadmap in this file before proceeding to the next batch.**

Supporting rules:

- **Keep global control separate from country evidence.** `seo/README.md` is the
  workspace router; `seo/<country>/` holds detailed dated audits, keywords,
  competitors, content opportunities, technical analysis and raw exports. This file
  alone owns current status, priorities, deadlines and next actions. New country work
  saves its evidence in the country package and adds only a concise dated decision and
  link here. Sections 10–21 and 28–35 are a legacy exception: their embedded country
  evidence remains in place to preserve the decision trail, but new detailed market
  evidence follows the country-first rule. Cross-market findings stay here rather
  than being copied six times.
- **Do not rerun the full ~1,000-page crawl for every batch.** Reserve a full crawl for
  validating global technical architecture, establishing a periodic baseline, or
  following substantial sitewide change. For one page, one query cluster, one country,
  one redirect family, one metadata template, or one indexing question, use a focused
  OpenSEO/GSC pull plus a live production check.
- **Distinguish three states in every finding**: what production serves right now, what
  Google has stored from its last crawl, and what an older audit recorded. They diverge
  routinely, and conflating them is the main way stale work gets redone.
- **When old and new data disagree, new verified data wins.** Keep the old number only
  as labelled historical context.
- **An OpenSEO/MCP recommendation is a hypothesis.** Verify it against GSC, a live SERP,
  and the actual site architecture before it enters the roadmap.
- **This clone is shared with concurrent sessions — treat it as a standing
  condition, not an incident.** Other sessions' uncommitted work appears in the
  working tree without warning, and has changed mid-session more than once. So:
  run `git status` before staging, **stage by explicit path**, and never
  `git add -A` / `git add .` in this repo. A tidy-looking commit that sweeps in
  another session's half-finished backend edit is the failure mode this prevents.
  Corollary: `git log` is the source of truth for what shipped — a session's own
  account of what it committed or pushed can be wrong, and was on 2026-08-14
  (SEO-DOC-006 was reported unpushed while already present on `origin/main`).

---

## 1. Sitewide organic baseline

Re-extracted **2026-08-12** (`SEO-RESET-001`), via `get_search_console_performance`
(Search Console Search Analytics), `dataState=all`. **Last date with any GSC data:
2026-08-11.** Windows are 28 days each so that the current and prior periods are
directly comparable. Sitewide totals are summed from the `date` dimension; the 3-month
row is summed from the `device` dimension (3 rows) rather than 92 date rows — same
totals, and it yields the device split noted below. Average position is
impression-weighted from those rows.

| Window | Dates | Clicks | Impressions | CTR | Avg position |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-15 → 2026-08-11 | **719** | **33,579** | **2.14%** | **18.5** |
| Prior 28d | 2026-06-17 → 2026-07-14 | 414 | 10,860 | 3.81% | 13.1 |
| Last 3 months | 2026-05-12 → 2026-08-11 | 1,617 | 54,877 | 2.95% | 16.1 |

> **Superseded as a reporting format, not as data (2026-08-15, §22.2).** The blended
> average position column is retired from future entries — while indexation is still
> expanding it measures how much got indexed, not how well anything ranks. Report
> segments instead. The numbers below stand as recorded.

**Read this correctly.** Clicks grew 74% period-over-period, which is real. Impressions
grew 209%, which is faster, so CTR fell and average position deepened. Nothing in the
click series suggests a ranking loss — the mechanism was diagnosed and closed in
SEO-GROWTH-012 (see below).

**The surge has not reversed, and its worst CTR days have passed.** Daily impressions
peaked 2026-08-09 (2,723 impressions, 20 clicks, position 25.9) and have since settled
at 2,491 (08-10) and 2,029 (08-11) with clicks recovering to 35 and 28 and position
improving to 17.2 and 14.7. The two-day tail is the healthiest part of the window: the
same volume at materially better positions. Treat 08-10/08-11 as possibly incomplete
(`dataState=all`).

**Device split, last 3 months (new observation this pass).** Mobile: 1,102 clicks /
24,693 impressions / 4.46% CTR / position 10.5. Desktop: 501 clicks / 29,785
impressions / 1.68% CTR / position 20.7. Tablet: 14 / 399 / 3.51% / 15.2. Desktop draws
*more* impressions than mobile at half the CTR and twice the depth. This is recorded as
context, not as a work item — the same tool/non-market long tail that explains the
sitewide CTR fall is plausibly desktop-skewed, and no device-specific defect has been
investigated or established.

**Diagnosed and closed (SEO-GROWTH-012, §5/§7):** the surge is 568 pages that had zero
impressions the week before suddenly earning them — not existing pages ranking
differently. 75% of that volume is the `/tools/*` calculator cluster (BMI, calorie,
blood pressure, ovulation, ADHD test, due-date) newly ranking across markets and
locales; roughly a third of the new impressions land at genuinely good positions
(top 10–20), not uniformly "deep-SERP" as first assumed. It converts at 0.48% CTR
because the intent is free-tool, not medical-service — expected, not a defect.

Do not compare these figures against the 2026-07-28 plan's "514 clicks / 15,210
impressions / 3.38% CTR" baseline as if it were the same measurement; that was a
28-day window ending 2026-07-25 and is superseded.

### Off-site footprint (extracted 2026-08-11, `get_backlinks_overview`)

511 backlinks · 369 referring pages · **57 referring domains** · rank 43 · backlink spam
score 7 · target spam score 3. Referring domains have climbed steadily (26 in
2025-08 → 57 now), with the step change in 2026-05. The largest single referrer is
`wix.to` (195 backlinks) — residual equity from the Wix-era site, which is exactly why
legacy URLs must keep resolving through 308s rather than being blocked in robots.txt.

**Known false positive:** this API also reports `brokenPages: 666`. That figure comes
from a stale Wix-era crawl of the old site and has been re-confirmed as noise on
2026-08-12. Do not open work against it.

---

## 2. Country scoreboard

Search Console **searcher country**, not page language. Current window
2026-07-15 → 2026-08-11; prior window 2026-06-17 → 2026-07-14. Re-pulled
`SEO-RESET-001`, 2026-08-12.

| Country | Clicks | Impr | CTR | Avg pos | 28d trend | Strongest page type | Biggest credible opportunity |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Ireland | 189 | 6,114 | 3.09% | 22.9 | clicks +78% (106), impr +342% (1,382), CTR down from 7.67%, pos from 15.0 | Doctor profiles; legacy `/ireland-doctors/*` still out-earning current-shape URLs *in GSC's attribution* (Google's own state now shows them correctly as "Page with redirect" — see §6) | **The at-home lab-test cluster** — `/ireland/en/lab-tests` + 16 detail pages, 1,041 impressions / 4 clicks / position 27.1, from **zero impressions** the prior window. Geo-modified queries already rank 11–16 live. See SEO-GROWTH-016 |
| Portugal | 134 | 3,745 | 3.58% | 19.4 | clicks +22% (110), impr +175% (1,361), CTR from 8.08%, pos from 9.8 | Doctor profiles (`dr-telmo-coelho`, 9.2% CTR at pos 4.9) and `/portugal/pt` | Driving-licence / atestado cluster: `/portugal/pt/services/certificado-medico-carta-de-conducao` holds 460 impressions at position 14.2, but every *visible* head query in it sits at 42–53. Feasibility looks poor — see §7 NEXT |
| Czechia | 90 | 1,891 | 4.76% | 14.1 | clicks +58% (57), impr +303% (469), CTR from 12.15%, pos from 7.9 | Czech-language service pages (`muzske-zdravi-online` pos 2.2, 22.2% CTR; `lekar-online-praha` pos 5.9, 12% CTR) | Still the best CTR of any market on the smallest base. The current query mix is brand plus informational Czech terms (`diabetes` 37 impr pos 38.9) — no commercial cluster large enough to be a batch yet |
| Spain | 78 | 3,614 | 2.16% | 23.9 | clicks +160% (30), impr +548% (558), CTR from 5.38%, pos from 13.4 | Doctor profiles (`dr-tomas-ruiz-palacios` 31.8% CTR at pos 3.1; `dr-luz-marina-zuluaga-rios` 25% at pos 1.9) | None new. SEO-GROWTH-013 closed this market as a SERP/business-model wall; `/spain/es` sits at 1,074 impressions / position 30.1. `/spain/en/services/consulta-medica-online` has grown to 518 impr / 7 clicks / pos 23.2 — still wrong-locale, still not the bottleneck |
| Brazil | 30 | 2,785 | 1.08% | 10.2 | clicks +233% (9), impr +228% (849), CTR flat, pos improved from 11.6 | Tools, plus `/brazil/en/blog/online-medical-certificate-brazil` (146 impr at position 3.6, 1 click) | Good positions, almost no clicks — informational tool/blog traffic with no commercial page behind it. Unchanged diagnosis |
| Romania | 19 | 1,240 | 1.53% | 21.2 | prior window ≤3 clicks (below the top-12 country cut) | Tools | Smallest market; no commercial page ranks yet. Unchanged |

Non-market traffic worth noting, current window: United Kingdom 2,928 impressions at
position 33.0 for 22 clicks; United States 3,878 impressions at position 11.9 for 14
clicks; Germany 745 / 8.5 / 12; India 534 / 14.6 / 13. **Pakistan is an outlier worth
one line:** 348 impressions at position 9.9 for 25 clicks (7.18% CTR) — the highest
CTR of any non-market country and more clicks than Romania. It is almost certainly
doctor-name navigational search for the Irish clinicians with Pakistani names, not
demand for a Pakistani market. Recorded, not actioned.

Taken together the non-market countries are a meaningful share of the impression
inflation described in §1 and should be treated as noise in CTR calculations, not as a
CTR problem.

---

## 3. Technical SEO state

Verified against production on 2026-08-12 unless noted.

| Area | State | Evidence |
| --- | --- | --- |
| Sitemap | **1,932 URLs**, live. Supersedes every earlier count (1,906 / 1,353 / 1,304 / 1,153 / 1,924 all appear in older docs). Eight-row stratified sample returned 200, `index, follow`, self-canonical. | live sitemap + HTML probes, 2026-08-16 |
| robots.txt | Correct. Site allowed; only `/admin`, `/account`, auth routes and `/api/` disallowed; per-agent blocks for AI crawlers. **No legacy-Wix Disallow** — deliberate, so Googlebot can reach the 308s. | live fetch 2026-08-12 |
| `lastmod` | Real per-row dates; hub pages derive from newest child, so the section-pages loop **must stay last** in `frontend/app/sitemap.ts`. Never use build time. | design decision, unchanged |
| Legacy redirects | 276 redirect rules in `frontend/next.config.ts`. Spot-checked families all 308 to correct current-shape targets. | live probes 2026-08-12 |
| Metadata in `<head>` | Fixed. `generateMetadata()` hreflang resolution parallelised; Googlebot kept out of `htmlLimitedBots`. | `217c7ba9`, `29c2a917` |
| Service-list crawlability | Fixed. Every page of a paginated service catalogue renders as real anchors; only visibility is toggled. | `de35d9e4` + e2e `service-catalog-crawlability.spec.ts` |
| Locale discovery | Fixed. Footer locale row and `<a>`-based switcher give every page real sibling-locale anchors. | `b8b96200`, re-verified 2026-08-03 |
| Orphan pages | 1 true orphan by inlink-graph measure (the earlier "306 orphans" figure was a measurement artefact and is withdrawn). | `internal-discovery-crawl-depth-2026-08-09.md` |
| Performance | Healthy at last measurement; no regression signal since. Not re-measured this pass. | `docs/audits/performance/` |
| Shared CSS/JS | No change required; closed. | prior investigation |
| Sitemap URL validity | **51-URL stratified sample (every 38th sitemap row) — 51/51 returned 200, `index, follow`, self-canonical.** No redirecting, noindexed or 404 URL in the sample. | live Googlebot-UA probes, `SEO-FOUNDATION-001`, 2026-08-12 |
| Host / slash / case canonicalisation | Correct. Apex → 301 → `www`; `http` → 301 → `https`; trailing slash → 308 → unslashed; `/Ireland/EN` → 404 (no case-variant duplicates); unknown country, unknown locale and unknown service slug all return real 404s, no soft-404s. | live probes 2026-08-12 |
| Query-parameter handling | Correct. `?utm_source=…&gclid=…` serves the clean self-canonical. | live probe 2026-08-12 |
| Utility/auth route indexability | Correct. `/login`, `/access-request`, `/patient-upload`, `/cart`, `/checkout`, `/cross-border-consent` all serve `noindex, nofollow` in addition to the robots.txt disallows. Blog pagination serves `noindex, follow`. Fallback-locale legal pages serve `noindex, follow` **and are excluded from their own hreflang cluster** (verified on `/ireland/pt/legal/cookie-policy`). | live probes 2026-08-12 |
| Preview-host / retired-URL guards | `proxy.ts` returns a real **410** with `x-robots-tag: noindex` for retired clinician paths, and stamps `X-Robots-Tag: noindex, nofollow, noarchive` on any `*.up.railway.app` host. | `frontend/proxy.ts:367`, `:556` |

---

## 4. Metadata state

**Crawler title/description length warnings are closed and must not be reopened without
new evidence.** The bulk of them were intentional, harmless, or the natural result of
translation expansion into Czech, Portuguese and Spanish, or of descriptive medical
titles. Physically truncating them was tried and reverted (`6011acf0`) because it broke
the strings rather than the layout.

Doctor metadata fixes, all shipped and verified in production:

| Fix | Commit |
| --- | --- |
| Market-specific SERP titles for cross-listed doctors | `1de4dd67` |
| OG description/image no longer names the wrong market | `4fac1e7b` |
| Visible content and `Physician` schema no longer name the wrong market | `3282f5cc` |
| Market-title dedup and language-list summary cap | `26dc7e6f` |
| Title/H1 language and truncation batch; root-cause fix for homepage ellipsis | `0291f6e6`, `6011acf0` |
| CTR-driven service-title cleanup | `dbb25af4` |

Spot check 2026-08-12 — four representative pages all serve a single correct
`<title>`, `robots: index, follow`, and a self-referential canonical:
`/portugal/pt/doctors/dr-telmo-coelho`, `/ireland/en/services/sick-certificate-ireland`,
`/spain/es/services/consulta-medica-online`, `/spain/es/doctors/dr-alfredo-del-valle`.

One CMS-sourced title inconsistency was noted in the 2026-08-10 batch. It is **not**
reproducible in the four pages checked above and has no measurable ranking cost in the
current GSC data; it is recorded as DEFERRED in the roadmap rather than closed.

---

## 5. Remediation ledger

Status vocabulary: `CLOSED` · `FALSE POSITIVE` · `EXPECTED BEHAVIOR` ·
`VERIFIED BY PRODUCTION CHECK` · `WAITING FOR GOOGLE` · `MANUAL ACTION REQUIRED` ·
`DEFERRED` · `INVESTIGATE` · `READY TO IMPLEMENT`.

### Global technical

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-EDITORIAL-001 | Week 2 drifted from an evidence-backed 19-locale plan into 36 local research variants without CMS records | Content growth / measurement | **COMPLETE 36-LOCALE MATRIX IN CMS — DRAFT PUBLICATION REVIEW REQUIRED** | 2026-08-29 | After owner approval, all six Week 2 parents now have five translations each: 30 `BlogTranslation` rows and complete CS/DE/EN/ES/PT/RO coverage. Five parents remain `DRAFT`; the Spain urgent-blood-pressure parent was published separately before the 17-row completion. The completion transaction changed no parent, existing translation or publication state. The published Spanish Week 1 record retains its publication/review state and five translations | Current 28-day blog rows reached 64 clicks and 8,120 impressions, up from 5 clicks and 1,092 impressions in the prior comparison; conversion attribution is valid only after the 2026-08-25 funnel deployment | Complete native/legal/clinical review for the remaining drafts; do not publish a draft without the relevant approval; use 30/60/90-day gates after publication |
| SEO-001 | Sitemap coverage gap | Indexation | **FALSE POSITIVE** | 2026-08-12 | 1,906 URLs live and well-formed | Sitemap read and processed | None |
| SEO-002 | Internal links pointing at 308 redirects | Crawl efficiency | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | Footer country links and service-page links point at canonical URLs (`f4e84104`, `05f471a7`); health-alias link leak closed (`532d9c8a`) | n/a | None |
| SEO-003 | Fallback-locale legal pages carry `noindex` | Indexation | **EXPECTED BEHAVIOR — CLOSED** | 2026-08-09 | `noindex, follow`, absent from sitemap, absent as hreflang target; exact-locale legal pages stay indexable | Consistent | None |
| SEO-004 | Booking-query canonical variants | Canonicalisation / crawl control | **DEPLOYED — VERIFIED IN PRODUCTION 2026-08-20** | 2026-08-17 | Clean `/book` stays indexable and in the sitemap. Any non-tracking booking query state serves `noindex, follow` with the clean `/book` canonical; public doctor/service preselection CTAs navigate as buttons instead of exposing parameterized anchors. Tracking-only variants retain the clean page's normal indexability. Live probes confirmed `?doctor=`/`?service=`/`?lang=` = `noindex, follow`, `?utm_*` = `index, follow`, and zero `/book?` or `/doctors?` anchors on the checked public paths | GSC's “Alternate page with proper canonical tag” validation failed as expected because these URLs intentionally remain 200 with a clean canonical; historical rows decay on recrawl | None; do not rerun that validation |
| SEO-005 | Czech `/health/*` aliases | Duplication | **EXPECTED BEHAVIOR — CLOSED** | 2026-08-09 | Locale-integrity filter prevents fallback-locale `/health/` pages being indexed or hreflang'd (`db318dfe`) | Consistent | None |
| SEO-006 | Performance baseline | Performance | **CLOSED — healthy** | 2026-07-10 | No regression signal | n/a | Re-measure only after a substantial sitewide change |
| SEO-007 | Shared CSS/JS payload investigation | Performance | **CLOSED — no change required** | 2026-07 | n/a | n/a | None |
| SEO-008 | `brokenPages: 666` in the backlinks API | Data quality | **FALSE POSITIVE** | 2026-08-12 | Figure derives from a stale Wix-era crawl of the old site | n/a | Ignore permanently |
| SEO-009 | Patient-reviews section absent from the HTML response | Content / GEO | **CLOSED — VERIFIED IN PRODUCTION 2026-08-19** | 2026-08-19 | `DoctifyReviewsSectionLazy` loaded the entire section through `dynamic(..., { ssr: false })`, so its translated eyebrow, `<h2>` and lede existed only inside the RSC flight payload. Commit `553bc088` split the chrome into a server-rendered `ReviewsSectionShell`; only the consent- and viewport-gated third-party widget still defers. Live raw HTML now contains the localized review heading and lede | Google renders JS and may have seen the old section post-render; HTML-only scanners and AI crawlers now receive the copy directly | None |
| SEO-010 | Certification-logo `width`/`height` did not match the real assets | Performance / CLS | **CLOSED — VERIFIED IN PRODUCTION 2026-08-25** | 2026-08-19 | Commit `553bc088` shipped the true aspect ratios. Live Portugal HTML now serves Ordem at 61×72 with 64/128 candidates and Livro de Reclamações at 394×72 with 640/828 candidates | n/a | None |
| SEO-011 | Doctify widget rendered wordless on four of six locales | Content / trust UI | **DEPLOYED — MANUAL CONSENTED-WIDGET CHECK PENDING** | 2026-08-19 | Commit `553bc088` maps unsupported Doctify locales to `en` while retaining localized section copy and iframe titles. The code is shipped; the consent-gated third-party UI was not truthfully verified by the raw-HTML check | n/a | Load one `pt`, `es`, `cs` and `ro` page, grant third-party consent, and confirm the widget labels are populated |
| SEO-012 | Two `<h1>` elements on all 33 country/locale `/doctors` URLs | On-page / duplication | **CLOSED — VERIFIED IN PRODUCTION 2026-08-25** | 2026-08-19 | Commit `e760f1d6` moved the hero above the streamed boundary. Live `/ireland/en/doctors` raw HTML contains exactly one `<h1>` | The duplicate heading is no longer served | None |
| SEO-013 | Whole doctor directory duplicated in the HTML; `?lang=`/`?type=` facets served the unfiltered roster | Duplication / crawl control | **DEPLOYED — VERIFIED IN PRODUCTION 2026-08-20** | 2026-08-19 | Same root as SEO-012: the Suspense fallback rendered a full `DoctorDirectoryView` and the resolved child rendered another, so every request shipped the entire directory twice (~137 KB of duplicate markup, every doctor card and link doubled). Because the filter layer was client-only, a filtered URL also served the *unfiltered* roster to crawlers and no-JS visitors. `searchParams` is now read server-side, the boundary and `DoctorsDirectoryClient` are deleted, and the roster renders once, correctly filtered. Filtered states are `noindex, follow` with the clean canonical and no hreflang claim — same convention as SEO-004. Local render on the production API: `?type=specialist` returns a different six-doctor page than the clean URL, one active chip, zero `template id="B:0"`, `robots` `noindex, follow`; clean URL unchanged at `index, follow` | Production still ships both copies and serves the unfiltered roster on every facet URL | None. Live probe 2026-08-20: `/ireland/en/doctors?lang=ur` serves `noindex, follow` with the clean `/ireland/en/doctors` canonical |
| SEO-014 | Internal links with no anchor text on every page | Internal linking | **DEPLOYED — PURPOSE-BUILT FOLLOW-UP SCAN PENDING** | 2026-08-19 | Commit `2e35ab5f` shipped screen-reader text for whole-card overlays and icon links. A crude raw-HTML scan still counts image/icon anchors and cannot distinguish true failures, so this row is not marked closed from that instrument | Fix is live; Google recrawl state is not isolated | Re-run a purpose-built rendered-DOM “Internal Outlinks With No Anchor Text” scan and close only if it returns zero genuine textless links |
| SEO-015 | Hardcoded English section eyebrows on every localized public page | Content / i18n | **CLOSED — VERIFIED IN PRODUCTION 2026-08-25** | 2026-08-19 | Commit `022eab6d` shipped localized section labels. Live Portugal and Spain native-locale pages contain zero exact English `Overview` or `Who it's for` literals | The English leakage is no longer served | None |
| SEO-SVC-001 | Four Spain service pages held out of the index by an empty body | Content / indexation | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-19 | `consulta-online-medicina-estetica`, `consulta-salud-vascular-circulatoria`, `consulta-diagnotico-vascular` and `consulta-flebologia-y-linfologia` each carried `detailBody = "<p><br /></p>"` (0 plain-text chars) in both the base row and their ES translation, so `isPublicServiceRecordIndexable` correctly withheld them — the 120-char body floor. Not a code defect. ES copy authored and applied to production (`backend/scripts/applied/patch-spain-vascular-aesthetic-services.ts`, 28 field writes): 4,978–5,799-char bodies plus hero, summary, Spanish `seoTitle`/`seoDescription` (they held the English "Book … with a licensed doctor" placeholder) and keywords; the four service names were also de-placeholdered (e.g. "Consulta Diagnostico vascular" → "Diagnóstico Vascular Especialista"). Live check after cache TTL: all four serve `index, follow` with the new titles and all four are in the sitemap. A full sweep of every active market found **no other service with an empty own-locale body** | Pages were `noindex, follow` and absent from the sitemap, so nothing to un-learn — Google has never indexed them | None. The EN/other-locale variants of these four stay `noindex` until translated, which is the gate working as designed |

### Metadata

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-METADATA-001 | Crawler title/description length warnings | Metadata | **FALSE POSITIVE — CLOSED** | 2026-08-09 | Lengths are intentional, harmless, or translation expansion; truncation attempt reverted | n/a | Do not reopen without new evidence |
| SEO-METADATA-002 | Doctor language-list summary | Metadata | **CLOSED** | 2026-08-10 | `26dc7e6f` | n/a | None |
| SEO-METADATA-003 | Localized country titles overwritten | Metadata | **CLOSED** | 2026-08-10 | `1de4dd67`, `3282f5cc` | n/a | None |
| SEO-METADATA-004 | Unicode country-name word-boundary bug | Metadata | **CLOSED** | 2026-08-10 | `26dc7e6f` | n/a | None |
| SEO-METADATA-005 | CMS-specific title inconsistency | Metadata | **DEFERRED** | 2026-08-12 | Not reproducible in a four-page production spot check; no measurable ranking cost in current GSC data | n/a | Re-check only if a title defect surfaces in GSC or a crawl |

### SEMrush audit triage — 2026-08-30

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-SEMRUSH-001 | 133 invalid structured-data items | Structured data | **READY TO IMPLEMENT** | 2026-08-30 | Authenticated SEMrush table fully audited: 52 individual `Physician` nodes were each counted twice as invalid `Local Business`/`Organization` items (`address`, `jobTitle`, `worksFor`) = 104; 23 service organizations used unsupported `availableService`; 6 `WebApplication` tool nodes lacked genuine `aggregateRating`/`review`. Local fix models clinicians as `Person`, services/tools as `MedicalWebPage`, uses canonical specialty URLs, and attaches review metadata only to WebPage-compatible nodes. Focused suites 68/68; frontend `tsc --noEmit` clean | Not deployed or reprocessed | Deploy, validate representative doctor/service/tool URLs, then rerun SEMrush |
| SEO-SEMRUSH-002 | 144 external links reported broken | Links | **FALSE POSITIVE** | 2026-08-30 | The 144 rows contain only two destinations: 88 × `https://wa.me/353894715849` reported `429`, and 56 × `https://www.cnpd.pt` reported `500`. Both opened successfully in a normal browser on the evidence date; WhatsApp resolved to its valid chat page and CNPD served its current homepage. These are target-side bot/rate-limit responses, not dead links | n/a | No site edit. Optionally exclude this check for those two verified targets in SEMrush |
| SEO-SEMRUSH-003 | 5 title tags reported too long | Metadata | **READY TO IMPLEMENT** | 2026-08-30 | Exact rows are the five non-English Ireland country homes: `/ireland/{cs,de,es,pt,ro}`. Their code-owned titles were 79–92 characters. Local titles now preserve `Online Doctor/IMC/same-day` intent in 59–65 characters; a six-locale ≤70 regression guard covers Ireland including EN | Not deployed or reprocessed | Deploy and rerun SEMrush |
| SEO-SEMRUSH-004 | 2 pages reported low word count | Content | **FALSE POSITIVE** | 2026-08-30 | Both rows are the same root selector rendered as `https://www.myglobalhealth.online` and `https://www.myglobalhealth.online/`, each counted at 103 words. This is one concise market-selection page, not two thin content pages | n/a | None; do not add filler copy |
| SEO-SEMRUSH-005 | 88 pages reported low text-to-HTML ratio | Performance / heuristic | **EXPECTED BEHAVIOR** | 2026-08-30 | Audit was capped at 100 URLs with JS rendering disabled and flagged 88 at ratios 0.02–0.08: 35 country homes, 23 services, 14 doctor pages, 6 tools and 10 other/root pages. The crawl is alphabetically/sample biased (mostly Portugal-CS after country homes), while historical byte tracing attributes the ratio to normal Next App Router RSC serialization and two data-heavy homepage islands (~41 KB) without removing rendered content | n/a | No ratio-only refactor. Reopen only with Core Web Vitals or transfer-size regression evidence |

### Analytics, CTR and device — batch of 2026-08-24

Evidence window 2026-07-24 → 2026-08-21, `dataState=all`, `sc-domain:myglobalhealth.online`.
Single-dimension pulls only; `['query','page']` was read for intent, never for totals.

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-GA4-001 | GA4 recorded zero key events, so no ranking could be tied to revenue | Measurement | **CLOSED — VERIFIED, INCLUDING CONSOLE STEPS** | 2026-08-25 | The Docker `ARG`/`ENV` gap that shipped GA4 dark was already fixed in `0e1c2ff7`; the remaining defect was that only `add_to_cart` was ever instrumented. `begin_checkout`, `select_service` and `begin_booking` sat in the `AnalyticsEventName` union with no call site, and `purchase` did not exist at all. Now wired: `purchase` (new union member) fires from `PurchaseTracker` on the confirmed-paid branch of `[country]/[lang]/checkout/success`, deduped in `sessionStorage` by order id because that page reloads itself while polling for the Stripe webhook; `begin_checkout` fires from a single `goToCheckout` shared by the cart sidebar button and `MobileOrderTotalBar`; `begin_booking` fires from `BookCta` — the one component every public booking entry point routes through — on both its `<button>` and `<Link>` branches. All three pass through `trackAnalyticsEvent`'s consent/production/gtag gates. `tsc --noEmit` clean. `f43ee835` is on `main`/`Dev-nauman`, ancestor of `Dev-hassaan`; live production JS chunk `25da5n39q__x8.js` on `/ireland/en` confirmed to contain the `begin_booking` event string 2026-08-25. **Console steps confirmed already done** via `get_google_analytics_measurement_health` (OpenSEO, `google_analytics_admin` provider, read-only, no credits): property `547083375` is already the connected source (GA4↔OpenSEO link exists), and `keyEvents` lists both `purchase` (created 2026-07-25) and `begin_booking` (created 2026-08-24) — someone had already marked them | Was: no key events recorded, funnel invisible | None. Funnel is wired, both events are key events, property is joined to OpenSEO. Watch actual event volume once traffic accrues |
| SEO-CTR-001 | 27 pages at positions 4–20 with 150+ impressions and CTR under 1.5% | Metadata / CTR | **PARTIALLY IMPLEMENTED — the rest is not a title problem** | 2026-08-24 | 27 pages, 15,673 impressions in scope. Two carried a genuine query/title mismatch and were rewritten. `/czechia/cs/tools/blood-pressure-chart` ranks **position 5.1 on `krevní tlak kalkulačka`** (274 impressions, 4 clicks) while its title offered only a *tabulka* — retitled to lead with "Kalkulačka Krevního Tlaku". `/spain/es/tools/blood-pressure-chart` ranks on `baremos de tension` / `baremos tension arterial` with the word *baremos* absent from the title — retitled to lead with "Baremos de Tensión Arterial". Both descriptions rewritten to match. **The calorie calculators were deliberately left alone:** their titles already carry the exact head terms (`calculadora de calorias`, `calcular calorias`, `calorie calculator`), and their disclosed queries are numeric junk (`1.200`, `34 kcal`, `0.5kg in calories`) where no result earns a click — rewriting there would be churn. `tsc` clean; 24/24 tool tests pass | Old titles still served | Re-pull page-level CTR for the two rewritten URLs after deploy and recrawl. Do not touch the calorie titles |
| SEO-CTR-002 | Most of the 15,673 striking-distance impressions are NOT addressable by CTR work | Metadata / CTR | **CLOSED — MATERIAL CORRECTION TO SEO-CTR-001** | 2026-08-25 | Pulled per-page queries for the top 8 of the 27 pages. Only **2** carried a fixable title/query mismatch (the two BP charts, rewritten under SEO-CTR-001). Of the rest: `/ireland/en/gp-consultation-online` (427 impressions) ranks on `gp consult.ie` (18 impressions, position 7.1), `gp consult ie`, `gp consults` and `gpconsult login` — **navigational searches for the competitor brand GPConsult.ie**, where zero clicks is the correct outcome and no title can change it. `/term-and-conditions` (500 impressions, position 7.7) correctly 308s to `/terms`; nobody clicks a terms-of-service result. `/pt/about` is already logged in §5 as another company's brand entirely. `/ireland/en/blog/sick-certificate-ireland-employee-rights` ("Sick Cert Online Ireland: What You Need to Know") and `/portugal/pt/services/certificado-medico-carta-de-conducao` ("Atestado Médico para Carta de Condução Online Portugal") already carry their exact head terms in both title and H1 — their gap is rank, not snippet. The calorie calculators draw numeric junk (`1.200`, `34 kcal`, `0.5kg in calories`). **The premise that ~15k impressions is cheap click growth does not survive contact with the query data** | n/a | Do not run a blanket CTR pass over the remaining 25. Treat the PT driving-licence cert (head term at position 36 against a page average of 11.6) as a ranking task, not a snippet task |
| SEO-TOOLS-001 | Free-tool cluster has no commercial path off it | Content / conversion | **FALSE POSITIVE — VERIFIED IN PRODUCTION** | 2026-08-25 | The claim was that a visitor who clicks a calculator is routed nowhere. Fetched `/brazil/pt/tools/calorie-calculator` live: it serves **11 commercial internal links** — 4 to `/gp-consultation-online`, 3 to `/book`, 2 to the matching `controle-peso-online` weight service, 2 to `/doctors` — plus an "O passo seguinte" section and a "Quer um plano, não só um número?" CTA band. All built by `getToolServiceSuggestions`, the result-band nudges and `CtaBand` in `lib/content/tool-page.tsx`, which select the service by result band and market. The cluster's CTR problem is real; the missing-CTA diagnosis is not | n/a | Do not build tool CTAs. Any further work here is snippet or SERP-feature competition, not routing |
| SEO-SICKCERT-002 | Sick-cert service page H1 omitted the head term | On-page | **APPLIED TO PRODUCTION 2026-08-25** | 2026-08-25 | `seoTitle` targets "Sick Cert Online Ireland", but the H1 that `[serviceSlug]/page.tsx` renders from `heroTitle ?? name` read "Sick Leave Medical Assessment in Ireland" — neither "sick cert" nor "sick note" appeared in the page's primary heading. Both the base `Service` row and the shadowing EN `ServiceTranslation` hold the value, so both must move. `backend/scripts/patch-ie-sickcert-h1-2026-08.ts` changes them to "Online Sick Cert Assessment in Ireland" in one transaction, guarded on slug, locale and the exact prior string. The word "assessment" is kept on purpose: issuance depends on the clinical finding, so an H1 of "Sick Cert Online in Ireland" would advertise an outcome the doctor may not reach. Dry run passes both guards; `seoTitle` untouched. GSC also confirms the wider cluster is fine — the page is "Submitted and indexed", `googleCanonical` equals `userCanonical`, sitemap `lastmod` is 2026-08-12, and the ranking blog article already links to it twice. **Its only real problem is that Google last crawled it 2026-07-17** | Applied by Hassaan 2026-08-25; served after CDN TTL | Request indexing for this URL in the GSC console — that is the only remaining step, and the page has not been crawled since 2026-07-17 |
| SEO-LEGACY-001 | Legacy Wix URLs suspected of chaining or dead-ending | Crawl efficiency | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-24 | All 102 literal legacy redirects in `next.config.ts` probed live against `www.myglobalhealth.online`. **101 land on a 200 in exactly one hop.** The single exception, `/spain-doctors/tomás-ruiz-palacios`, is caught by the generic accent-stripping rule before its own literal rule and takes three hops to a 200 — cosmetic, one retired doctor URL, deliberately not fixed. The 25% legacy click share is Google still ranking retired URLs it has not recrawled, not a routing defect | Redirects correct | None. Legacy click share decays on recrawl; do not re-audit |
| SEO-SICKCERT-001 | Irish sick-certificate cluster split across three URLs | Canonicalisation | **CODE VERIFIED IN PRODUCTION 2026-08-25 — RECRAWL REQUEST NEEDS A HUMAN, NOT AUTOMATABLE** | 2026-08-24 | Live probe shows the cluster is already mostly consolidated: `/ireland/en/sick-certificate-ireland` is a **rewrite**, not a duplicate — it answers 200 and canonicals to `/ireland/en/services/sick-certificate-ireland`, as does the service URL itself. The one real defect was the `sick-leave` redirect, which pointed at that rewrite alias, making it a 308 → 200-with-a-foreign-canonical chain; its destination is now the `/services/` canonical directly. Re-confirmed live 2026-08-25: `curl -L /ireland/sick-leave` now resolves 200 directly to `/ireland/en/services/sick-certificate-ireland` in one hop, no chain. `inspect_urls` (OpenSEO) re-checked same day: still PASS / "Submitted and indexed" / self-canonical, `lastCrawlTime` unchanged at **2026-07-17** — five weeks of content and internal-linking work still invisible on this URL. 411 impressions, 0 clicks, position 46.2 (pre-recrawl figures) | Was: chain served. Now: direct 200, single hop. Crawl date unchanged | **Not automatable — do this yourself:** open the inspection link and click Request Indexing: https://search.google.com/search-console/inspect?resource_id=sc-domain:myglobalhealth.online&id=VMQwBdXLZ5_-tdv7nBfOuA . GSC's URL Inspection API is read-only (inspect, not request); the write-capable Indexing API v3 is officially JobPosting/BroadcastEvent-only per this doc's operating rules, so it was deliberately not fired at a regular service page. Do not expect page one from position 46 in one step |
| SEO-DEVICE-001 | Desktop draws more impressions than mobile at 40% of the CTR | Investigation | **CLOSED — NOT A SITE DEFECT** | 2026-08-24 | Desktop 24,488 impressions at position 23.6 / 0.99% CTR against mobile 22,918 at position 11.98 / 2.36%. Bucketing the disclosed page rows by cluster shows desktop **10–18 positions deeper in every one of the five buckets** (tools 41.2 vs 29.3, commercial 43.2 vs 33.1, blog 35.8 vs 18.3, market-other 36.3 vs 20.3, non-market 29.8 vs 10.8). A template or rendering defect would concentrate in one bucket, not all five. Decisively: under mobile-first indexing there is **one** index — a site-side defect cannot produce a device-specific rank. The gap is query-mix composition (desktop skews to the deep long tail), amplified in this table because GSC disclosed 50% of desktop but only 28% of mobile impressions at page level | n/a | None. Do not re-investigate without a new signal |
| SEO-SPRAWL-001 | 523 URLs earning fewer than three impressions | Crawl budget | **SUPERSEDED BY SEO-SPRAWL-002 — DO NOT DE-INDEX** | 2026-08-24 | Mass-`noindex`ing locale variants is destructive and slow to reverse on Google's recrawl timescale. These URLs are live hreflang targets; de-indexing a variant that *is* serving a market costs that market. `SEO-GROWTH-011` already ruled locale variants expected behaviour. Deliberately not actioned unilaterally | n/a | Hassaan to decide per URL family whether the variant serves a real market before anything is de-indexed |
| SEO-RX-001 | `bv online prescription` family: 824 impressions at position 46.4, zero clicks | Content / growth | **CLOSED — DELIBERATE TRADE-OFF, CONFIRMED BY HASSAAN 2026-08-25** | 2026-08-25 | `/online-prescriptions/:slug` blanket-redirects to the Ireland GP page and the `online-prescriptions` feature flag is **off in every market** — a deliberate choice to keep prescription content out of Google Ads review. Building a bacterial-vaginosis service page would reverse that decision. The demand is real and the site currently cannot serve it | n/a | None. The Google Ads constraint still binds; this demand is knowingly left unserved. Do not reopen without a change to the Ads position |
| SEO-I18N-001 | English insurance sentence in the meta description and hero of every localized service page | Content / i18n | **CLOSED — VERIFIED IN PRODUCTION 2026-08-25** | 2026-08-25 | The frontend now composes the insurer line from localized copy and `Intl.ListFormat`. Live `/portugal/pt/services/baixa-medica` contains “Aceitamos também Medicare para este serviço.” in the metadata and hero | The English sentence is no longer served on the verified Portuguese page | None |
| SEO-PRT-001 | Portugal converted +213% impressions into only +22% clicks | Growth | **INVESTIGATED — NOT A METADATA PROBLEM** | 2026-08-25 | The whole Portuguese opportunity is one cluster, `atestado médico`, and it is split across accent and spelling variants that all land deep: `atestado medico` 22 impressions at position **51.0**, `atestado médico` 18 at **56.7**, `atestado médico para carta de condução` 18 at 36.4, `atestado médico online` 35 at 18.3. The pattern is consistent — the site ranks best on the *modified* long tail ("online", position 17-18), worst on the bare head term (position 51-57). Three PT pages already serve this intent with correct native-language titles: `baixa-medica` ("Justificação Médica Online Portugal | Atestado para o Trabalho"), `certificado-medico-carta-de-conducao` ("Atestado Médico para Carta de Condução Online Portugal") and `certificados-medicos` ("Atestados Médicos Online Portugal | Caça, Náutica, Desporto"). All three carry "atestado" in the title. **The head term is therefore a rank and authority gap, not a snippet gap** — no title rewrite is available that would help, and the intent is genuinely split three ways by the product itself (work absence, driving licence, sport/hunting). The one real defect found in the Portuguese pages was the English insurance sentence, logged as SEO-I18N-001 | n/a | Do not rewrite the PT titles. If Portugal is to be pushed, it is off-site authority (SEO-LINKS-001) or a page for the generic `atestado médico` intent — a product decision, not an SEO patch |
| SEO-SPRAWL-002 | The crawl-budget premise behind SEO-SPRAWL-001 does not hold | Crawl budget | **CLOSED — DO NOT DE-INDEX** | 2026-08-25 | SEO-SPRAWL-001 was blocked pending a decision on de-indexing ~523 near-zero URLs. The decision is now moot: the argument for it was that they starve the sick-certificate page of crawl budget, and that is measurably false. URL Inspection on five URLs shows Googlebot visiting this site constantly — `/ireland/en/gp-consultation-online` crawled 2026-08-24, `/ireland/en/blog/illness-benefit-ireland-how-to-claim` 2026-08-23, `/ireland/en/lab-tests` 2026-08-18. At 1,955 sitemap URLs there is no crawl rationing to reclaim; the sick-cert page's stale 2026-07-17 crawl is a page-importance signal, not a budget one. The cost of the sprawl is also far smaller than stated: of the 1,000 disclosed page rows, 267 draw under 3 impressions, totalling **390 impressions and 6 clicks**. Their composition is cross-locale variants — 113 under `ireland/{de,ro,pt,cs,es}` alone — and Ireland genuinely has Romanian, Portuguese and Brazilian diaspora populations those URLs plausibly serve. De-indexing would gain no crawl budget and risks losing real diaspora traffic | n/a | None. SEO-SPRAWL-001 is superseded by this row; do not reopen without evidence of actual crawl starvation |
| SEO-404-001 | `llms.txt` advertised 6 URLs that 404 | Crawl efficiency / AI surfaces | **CLOSED — VERIFIED IN PRODUCTION 2026-08-25** | 2026-08-25 | Commit `eef23122` applies the same feature gates and backend-merged country source as the sitemap. Live `/llms.txt` now contains 12 market feature links and all 12 return 200 | Dead feature links are no longer advertised | None |
| SEO-404-002 | The rest of the 172-page GSC 404 bucket | Crawl efficiency | **CLOSED — NO DEFECT, SELF-HEALING** | 2026-08-25 | Audited the exported list. Composition: retired Wix shapes (`/service-page/*`, `/services-1-*`, `/team-*`, `/home-health-tests*`, `/romania-specialist-consultations1/*`, `/product-page/*`, `/ireland-team/*`, `/booking-calendar/*`, `/members-area/*`) — correct to 404, never had a live equivalent; stale pre-redirect crawls — every one re-probed live now 308s correctly (`/spain` → `/spain/es`, and all six bare `/czechia/{zadanka-krev,lekarska-zprava,cestovni-medicina,hubnuti,vseobecne-lekarstvi,lekarske-potvrzeni}`), the GSC rows date from May 2026 before those rules shipped; deliberate 410s — all six `dr-grainne-ahern` locale variants, matching §22.4's pre-registered prediction; deliberate product removals — `/ireland/en/repeat-prescription-request` is gone with the `online-prescriptions` flag (see SEO-RX-001); and crawler junk (`/$`, `/l`, `/_api/one-app-session-web/v3/businesses`, and five `spec-wh-*`/`legacy-*`/`gen-redeem-*` slugs that appear nowhere in the repo and leak nothing). Sitemap re-verified clean: all 1,955 entries, including the 12 `/romania/*/lab-tests` and `/romania/*/see-a-specialist` rows, return 200 | n/a | None. This bucket decays on recrawl; do not re-audit. SEO-404-001 was the only real defect in it |
| SEO-CANON-001 | GSC "Duplicate, Google chose different canonical than user" — 9 URLs | Canonicalisation | **CLOSED — NO DEFECT, ALL NINE ACCOUNTED FOR** | 2026-08-25 | Exported list audited URL by URL against production. **Six are blog fallback-locale variants** (`/czechia/ro/…diabetes-ticha-nemoc`, `/ireland/{cs,pt}/…hand-foot-and-mouth…`, `/portugal/es/…hand-foot-and-mouth…`, `/romania/en/…diabetul-boala-tacuta`, `/spain/de/…diabetes-una-enfermedad-silenciosa`) — all serve `noindex, nofollow` plus a cross-canonical to the real-content URL, exactly as §7's blog-framework row describes. GSC files that combination under this label; it is the designed outcome, not a conflict. **The one real risk in that pattern was checked and is clear:** combining `noindex` with a cross-canonical can propagate the noindex to the canonical target, so all four distinct targets were re-probed live — `czechia/cs/…`, `ireland/en/…`, `romania/ro/…`, `spain/es/…` — and every one serves `index, follow`. No propagation. **Two are stale pre-redirect crawls**: `/ireland/pt/health/sick-cert-online` now 308s to `/ireland/pt/services/sick-certificate-ireland` (GSC row dated 2026-07-28, pre-fix) and the Wix-era `/home-health-tests-1/vitamin-d-blood-test` 308s to `/ireland/en/lab-tests/vitamin-d-test` (row dated 2026-02-22). **One is a genuine Google judgment call, not a defect**: `/portugal/en/blog/self-certification-sick-leave-portugal` is `index, follow`, self-canonical, sitemapped, sits in a correct 6-locale hreflang cluster with `x-default` → the PT variant, and is internally linked twice (blog index + `/portugal/en/services/baixa-medica`) — so it is neither orphaned nor misconfigured. Content was compared against the PT and ES siblings and all three are real, distinct translations (English body text is genuinely English, not a fallback render). Google simply consolidated a low-signal EN variant into the `x-default` PT page in a PT-market cluster | n/a | None. Do not "fix" the EN variant's canonical — it is correct; overriding Google here is not possible from on-page signals, and the page targets English-speaking residents in Portugal, a legitimately small audience |
| SEO-CANON-002 | GSC "Duplicate without user-selected canonical" — 3 URLs | Canonicalisation | **CLOSED — STALE PRE-REDIRECT CRAWLS** | 2026-08-25 | All three are English-slug service URLs from before the PT native-slug migration, and all three now 308 in exactly one hop to a self-canonical 200: `/portugal/ro/services/oncology-consultation` → `…/consulta-de-oncologia`, `/portugal/pt/services/psychology-consultation` → `…/consulta-de-psicologia`, and `/portugal/de/services/consulta-de-nutricao` → `/portugal/de/see-a-specialist` (that service is retired, so it falls back to the market hub rather than a detail page). GSC rows are dated 2026-07-17 → 07-19, before the migration shipped — Google is reporting an index state that no longer exists. The label itself is consistent with that: a redirect serves no canonical tag, hence "without user-selected canonical" | n/a | None. Decays on recrawl |
| SEO-ROBOTS-001 | GSC "Blocked by robots.txt" — 4 URLs | Indexation | **CLOSED — STALE, AND CURRENT STATE IS THE CORRECT PATTERN** | 2026-08-25 | `/login`, `/register`, `/account`, `/forgot-password`. Parsed the live robots.txt in full: across all 13 user-agent groups the only `Disallow` rules are `/admin`, `/admin/*`, `/account/*` and `/api/`. **No rule mentions login, register or forgot-password** — they are crawlable now and serve `noindex, nofollow` (verified live, all three 200). GSC crawl dates are 2026-07-19 → 08-06, before the 08-08/08-09 crawlability batch (see SEO-GROWTH-012). Worth stating plainly because the change was an improvement, not a regression: a robots.txt-blocked page **cannot** have its `noindex` read, so it can still be indexed from external links; allow-crawl + `noindex` is the pattern that actually keeps a page out of the index, and that is what production now serves. `/account` 307s to the login flow and stays correctly excluded | n/a | None. These rows migrate to "Excluded by noindex" on recrawl, which is the intended destination |
| SEO-CANON-003 | GSC "Alternate page with proper canonical tag" — 313 URLs, the largest not-indexed bucket | Canonicalisation | **CLOSED — THIS IS THE SUCCESS STATE, NOT A DEFECT** | 2026-08-25 | Effectively the entire bucket is query-string variants: `/{country}/{lang}/book?service=…&doctor=…` deep links (the large majority), `/doctors?lang=…` and `?type=specialist` filters, and `?utm_*`-tagged pages. The label means Google found a parameterised URL, read our canonical, and honoured it — the outcome the setup is designed to produce. Verified on a representative sample: `/ireland/en/book?doctor=dr-ahmed-maklad` and `/portugal/pt/book?service=baixa-medica&doctor=dra-nadia-cavaco` both canonical to the bare `/book` with `noindex, follow`; `/ireland/en/doctors?lang=ur` and `?type=specialist` canonical to `/doctors`, same directive; `/portugal/pt/services/consulta-do-viajante?utm_medium=page_links` canonicals to the clean service URL and correctly stays `index, follow`; `/?utm_source=facebook…` canonicals to the origin, `index, follow`. **`noindex, follow` is the right pair for the parameter variants** — it keeps every permutation out of the index while still letting Google traverse to the doctor and service pages behind them. The one non-query entry, the Wix-era `/cs/romania-team`, 308s in one hop to `/romania/ro/doctors`. Note this bucket is also why the headline "1.56K not indexed" reads worse than reality: 313 of it is this, plus 266 redirects and 275 deliberate `noindex` — 854 of 1,560 are states we chose | n/a | None, and specifically **do not** try to shrink this number by disallowing `/book?*` in robots.txt — a blocked URL cannot have its canonical or `noindex` read, which is strictly worse. Same lesson as SEO-ROBOTS-001 |
| SEO-LINKS-001 | 62 referring domains, with a low-quality tail | Off-site | **MANUAL ACTION REQUIRED** | 2026-08-24 | Outreach to medical directories and national clinician registries across the six markets. Not a code change and not something this repo can execute | n/a | Hassaan / marketing |

### Growth and legacy routing

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-GROWTH-001 | Footer links pointing at legacy aliases | Internal linking | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `f4e84104`, deployed to all three branches | n/a | None |
| SEO-GROWTH-002 | Hlavatý historical URL | Legacy routing | **SUPERSEDED BY SEO-DOC-004 (2026-08-14)** — the 2026-08-12 "returns 200 `index, follow`" verification did not hold. Re-probed 2026-08-14, `/czechia/cs/doctors/mudr-libor-hlavaty` returned **404**, consistent with §14 (2026-08-13) finding him absent from the live roster. Keep this row only as the record of the wrong reading | 2026-08-14 | 308 → `/czechia/cs/doctors` (SEO-DOC-004) | Legacy URL still holds the ranking: 573 impressions / 2 clicks / pos 11.0 over 90d | See SEO-DOC-004 |
| SEO-GROWTH-003 | Portugal atestado alias consolidation | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `/portugal/{pt,es}/health/atestado-medico-online` → 308 → `/portugal/{lang}/services/baixa-medica` (`532d9c8a`) | PT alias still indexed, last crawl 2026-07-25 (pre-fix) | Watchlist only |
| SEO-GROWTH-004 | `/home-br` missing redirect | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | 308 → `/brazil/pt` (`4c60bb33`) | URL unknown to Google | No action; nothing to consolidate |
| SEO-GROWTH-005 | Bare Brazil legacy families | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `4a5f0fad`; probes 308 correctly | n/a | None. `/brazil-doctors/*` 404s but has **zero** GSC impressions in 90 days — not a defect |
| SEO-GROWTH-006 | Locale-prefixed Brazil legacy families | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `798c7282`; `/pt/home-br`, `/es/home-br`, `/cs/home-br` all 308 to the right locale | n/a | None |
| SEO-GROWTH-007 | Telmo Coelho indexation | Indexation | **WAITING FOR GOOGLE** | 2026-08-12 | `/portugal/pt/doctors/dr-telmo-coelho` serves `index, follow`, self-canonical, in sitemap | **Stale**: coverage "Excluded by ‘noindex’ tag", last crawl 2026-07-26 — 13 days before the fix | Watchlist. Do not re-investigate before the crawl date advances |
| SEO-GROWTH-008 | Ireland sick-cert consolidation | Legacy routing + ranking | **CLOSED — MONITOR** | 2026-08-12 | Redirects live (`/ireland/sick-leave`, `/ireland/es/health/sick-cert-online` both 308 to current-shape, indexable targets); intent investigation = SUPPORTIVE CLUSTER, no cannibalization; 4 blog→service links live; service title/meta reviewed vs. 6 competitors, no rewrite needed (SEO-GROWTH-008D); 3-step "How it works" block live (SEO-GROWTH-008E, verified) | Two legacy URLs still show "Submitted and indexed" (crawls 2026-07-05 and 2026-07-25, both pre-fix) | None — see §7 MONITOR. Do not reopen without a new specific on-page defect |
| SEO-GROWTH-009 | Retired `/post/[slug]` route | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | Route deleted 2026-05-14/17; `/post/*` is now a `next.config.ts` redirect only. `/post/<unknown>` → 308 → `/ireland/en/blog` | n/a | None. Two audit docs already carry the correction header |
| SEO-GROWTH-010 | Spain market audit | Market analysis | **CLOSED as an audit; findings promoted to the roadmap** | 2026-08-12 | n/a | n/a | See SEO-GROWTH-013 (Spain commercial-service underperformance) and the closed SEO-GROWTH-011 doctor-locale investigation. **No standalone Spain audit document exists in the repository** — the audit was conducted in-session; its conclusions are recorded in §6 and §7 |
| SEO-GROWTH-013 | Spain commercial-service underperformance | Ranking | **CLOSED — INVESTIGATED / NO STRUCTURAL DEFECT** | 2026-08-12 | All 6 commercial URLs technically clean (200, index/follow, self-canonical, in sitemap, correctly linked from `/spain/es`). Not cannibalization — page roles are legitimately distinct (homepage brand+generic, `gp-consultation-online` = GP hub/catalog, `services/consulta-medica-online` = GP detail, `services/dermatologia-especialista-online` = specialist detail) | Bottleneck is SERP competitive wall (national insurers + Doctoralia/TopDoctors-scale aggregators dominate the generic cluster; boutique/solo practitioners dominate specialty clusters) plus a verified trust-presentation gap: Doctify reviews render on hub/team pages but not on service detail pages | See §7 SEO-GROWTH-013 for full findings and substantive conclusions. Next: SEO-GROWTH-014, a feasibility investigation only (not an implementation batch) — do not add Doctify UI/schema before that lands |
| SEO-GROWTH-014 | Spain service-detail Doctify trust-signal feasibility | Trust presentation / data provenance | **CLOSED — GLOBAL DOCTIFY APPROACH CONFIRMED** | 2026-08-12 | `DoctifyWidget` (`variant="horizontal"`) already renders on every service-detail page (`services/[serviceSlug]/page.tsx:870`) — the widget was never missing. It uses one real Doctify practice (`tenant=athena-ie`, `slugs=global-health-ireland`, `profileType=practice`) | `review.doctify.clinicId` / `review.doctify.aggregate` and every other `review.*` Setting key are **unset in production** (direct read-only DB check, 2026-08-12: zero rows) — confirmed still true, unaffected by SEO-GROWTH-015 | Original finding stands (no per-market Doctify profile exists; the manual `review.*` aggregate system is empty and untouched). The business decision on what to do about it is now made, not deferred: treat the one existing Doctify practice as the site's single **global** MyGlobalHealth review profile and show it everywhere, rather than wait for market-by-market Doctify registrations. See SEO-GROWTH-015 |
| SEO-GROWTH-015 | Global Doctify trust integration (revised from an Ireland-only gate) | Trust presentation / implementation | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-13 | Commit `770ee012` ("fix(trust): make Doctify integration global and locale-aware", 2026-08-12) is present on `main`, `Dev-hassaan`, `Dev-nauman`; live production re-confirmed 2026-08-13 (`curl -A Mozilla/5.0` against `/spain/es/gp-consultation-online` serves "45.057+ consultas" with no "Valorado en Doctify" pairing anywhere on the page — post-fix copy). First pass added a per-market gate (`isDoctifyConfiguredForMarket`, Ireland-only) — **reverted** on explicit direction: the Doctify profile is the site's one global review profile, shown on every market's pages, same as before any of this ticket's work, with two real fixes kept: `language` now flows through to Doctify's widget URLs (was hardcoded `"en"`), and the homepage's manually-entered `review.doctify.aggregate` stat (a second, driftable copy of Doctify's number) was removed — the live widget is the UI's only source of truth for the rating/count now | `AggregateRating` JSON-LD explicitly **not** populated from Doctify — Google's review-snippet policy prohibits aggregating another site's reviews into your own markup; schema stays exactly as SEO-GROWTH-014 found it (fail-closed, empty) | See §7 SEO-GROWTH-015 for the full file list and verification. Also fixed the "45.000 consultas/Valorado en Doctify" pairing on the GP and specialist hero stat strips (implied the volume number was a Doctify rating) — volume claim kept, Doctify/rating wording dropped. Awaiting explicit commit authorization |
| SEO-GROWTH-011 | Spain doctor cross-locale ranking "fragmentation" (Alfredo del Valle) | Indexation / hreflang | **EXPECTED BEHAVIOR — CLOSED, no code change** | 2026-08-12 | All 5 locale URLs (`spain/{es,cs,en,pt,de}/doctors/dr-alfredo-del-valle`) are 200, self-canonical (each declares and Google accepts its own canonical — no consolidation attempted by either side), `index, follow`, in sitemap, carry distinct per-locale `<title>` (Dermatólogo/Dermatolog/Dermatologist/Dermatologista/Dermatologe — real translation, not a duplicate stub), and cross-link each other via the sibling-locale switcher. The one legacy URL in the cluster, `/pt/spain-doctors/dr-alfredo-del-valle`, is "Crawled – currently not indexed" (last crawl 2026-03-08) and draws 1 impression in 90 days — a dead stub, not a participant | Google serves each locale variant as its own PASS result; no `noindex`, no wrong-canonical, no stale-crawl divergence | None. See §7 for the full query×URL matrix and reasoning |
| SEO-GROWTH-012 | August impression-surge diagnosis | Indexation / discovery | **CLOSED — EXPECTED GOOGLE DISCOVERY / TOOL-INTENT MIX SHIFT** | 2026-08-12 | 4-day-window page pull (08-06→08-09) vs. the preceding 5-day window: 946 pages earned impressions vs. 584 before; **568 of those pages had zero impressions in the prior window.** These newly-surfacing pages account for 4,990 of the period's impression growth — existing pages' impressions were flat to slightly down (−257) over the same comparison. 75% of the new-page volume (3,726 impr) is `/tools/*` calculators (BMI, calorie, blood pressure, ovulation, ADHD test, due-date) across every market and locale; the rest spreads thinly across lab-tests, services, legal, blog, doctors, health. Spot-checked 4 representative URLs (`inspect_urls` + live Googlebot fetch): all PASS, `index,follow`, self-canonical, in sitemap, last-crawl clustered 2026-08-05→08-08 — Google (re)crawled them right at the surge, not a code deploy (the tool pages themselves shipped weeks earlier, see `244d629e` et al.) | Google evidently ran a discovery/recrawl pass across previously-unindexed locale×tool combinations in early August; timing lines up with — but is not proven to be caused by — the crawlability/discovery batches shipped 08-08/08-09 | None. See §7 for the full breakdown and the corrected NEXT-1 framing |
| SEO-GROWTH-016 | Ireland at-home lab-test cluster: 1,041 impressions, 4 clicks, position 27.1, from a zero base | Ranking / content-intent | **INVESTIGATED — BOTTLENECK = INDEXING RAMP. No content, schema, linking or metadata work justified yet** | 2026-08-12 | `/ireland/en/lab-tests` + 16 detail pages all 200, `index, follow`, self-canonical, in sitemap, `richResults` PASS. Hub serves **14 real anchors**. Copy is **independently written, not Randox-duplicated**. Page format already matches what the SERP rewards. No cannibalization. `Product`/`Offer` schema absent but data exists. Hub meta carries a **stale €89 price** (real entry price €57) and a wrong "up to 10 days" turnaround | Detail pages first crawled 2026-08-01 → 08-08 and earned **100% of their 28-day impressions in the final 7 days**, while the hub dropped from ~479 to 11 — a hub→detail hand-off completed inside the measurement window. Cluster position improved 37.5 → 26.3 → 20.3 over 08-09/08-10/08-11 | **WAIT / MEASURE, re-measure 2026-09-08.** Full findings and early-exit triggers in §7 SEO-GROWTH-016 |
| SEO-GLOBAL-LANG-002 | Bare `/about`, `/blog`, `/faq` carry no country signal; `/{country}/{lang}/faq` did not exist | Site architecture / legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-15 | Deployed (`5f67b9d8`). `/about`, `/faq`, `/blog` each 308 to `/ireland/en/*` in one hop; `seo-live-urls` 8 passed against production; sitemap carries 0 entries for the retired trio | Not yet recrawled — the three retired URLs are new entrants to §6 | Watchlist only. Re-inspect the three retired URLs once Google's crawl date advances past 2026-08-15. See §5 SEO-GLOBAL-LANG-002 |
| SEO-GLOBAL-LANG-003 | Country FAQ pages shipped with one shared question set across all 33 URLs | Content / indexation | **DEPLOYED — AWAITING MEASUREMENT** | 2026-08-15 | Live (`9175893b`, nav placement revised in `96f771db`). 18 researched questions per market. Production confirms the split is system-enforced: `/ireland/en/faq` + `/spain/es/faq` `index, follow`; `/ireland/de/faq` + `/spain/de/faq` `noindex, nofollow`; sitemap carries exactly the 11 authored URLs. ES/CZ/RO state plainly that the state sick-leave instrument is not ours to issue. FAQ is footer-only (nav placement reversed, Hassaan 2026-08-15) | 11 new URLs, none crawled yet | **Measure no earlier than 2026-09-30** against the three-band backfill trigger in §5 SEO-GLOBAL-LANG-003. Brazil integration question is open and needs a human, not a SERP |
| SEO-GROWTH-017 | `/service-page/ie-medical-consultation` (legacy Wix) still self-canonical and indexed in Google | Legacy routing | **WAITING FOR GOOGLE** | 2026-08-12 | 308 → `/ireland/en/see-a-specialist` (live probe, Googlebot UA) | "Submitted and indexed", **self-canonical**, last crawl **2026-07-08** — predates nothing in particular; Google simply has not recrawled. Referring URLs include `/home` and `booking-services-sitemap.xml`, both Wix-era artefacts | Watchlist only (§6). 147 impressions / 3 clicks / position 24.1 in the current window |

### Global foundation audit (`SEO-FOUNDATION-001`, 2026-08-12)

Investigation-only pass across the shared SEO machinery. **No systemic defect with
demonstrated current search impact was found.** The five rows below are latent risks,
structured-data polish and a missing regression net — none of them is producing a
measurable loss today, and none should be dressed up as one. Full reasoning in §7.

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-FOUNDATION-001-A | Lab-test template is the only CMS content family with **no locale-publication gate** | Indexation (latent) | **PARTIAL — LATENT RISK, no current defect** | 2026-08-12 | `tests/[testSlug]/page.tsx` never passes `noindex`; it and `tests/page.tsx` call the unfiltered `hreflangAlternates`, and `app/sitemap.ts` pushes every country locale with no eligibility filter — services, doctors, legal, `/health/*` and blog all gate. Backend `mergeHealthTestTranslation` falls back field-by-field to the English base row and does not expose `resolvedLocale` on the public payload, so the frontend *cannot* gate. **All 14 tests verified genuinely translated in cs/de/ro on production, so nothing is wrong today.** | 84 lab-test URLs indexed normally; no wrong-language page exists to be penalised | **Still open — latent.** Deliberately excluded from `SEO-FOUNDATION-002` (2026-08-13), which shipped regression coverage only. Lab-test indexability, sitemap filtering, hreflang and internal linking stay frozen until the `SEO-GROWTH-016` re-measure on ~2026-09-08 |
| SEO-FOUNDATION-001-B | `BreadcrumbList` names hardcoded in English on ~10 templates | Structured data | **CLOSED — VERIFIED BY PRODUCTION CHECK** via `SEO-FOUNDATION-005`, deployed `6d5733bc` (Frontend + Backend, Production, both `SUCCESS`), verified 2026-08-13 | 2026-08-12 | Live JSON-LD **before**: `/czechia/cs` → `Home / Czechia`; `/czechia/cs/doctors` → `… / Doctors`; `/czechia/cs/gp-consultation-online` → `… / Online GP consultation`; `/ireland/cs/lab-tests/general-health-test` → `Home / Ireland / Lab tests / Všeobecný zdravotní test`. Country node used the English `config.name`, not the localized name. Blog-post trails omitted the country node entirely (`Home / Blog / post`). Services, doctors, tools, `/health/*`, contact, about, pricing and legal-index were **already** localized | Breadcrumb trails may render English labels in non-English SERPs; no CTR effect isolated (none claimed post-fix either) | **None — fixed and confirmed live.** See `SEO-FOUNDATION-005` below for the full production verification |
| SEO-FOUNDATION-001-C | `/` ↔ country-home hreflang cluster declares a content-negotiated selector as five different languages | Hreflang | **CLOSED — VERIFIED BY PRODUCTION CHECK** via `SEO-FOUNDATION-004`, deployed `cf2e8356` 2026-08-12T20:15Z, verified 20:19Z. Classified **C — semantic/architecture defect** by `SEO-FOUNDATION-003`; no demonstrated ranking impact before the fix | 2026-08-12 | `/` declares `x-default` → `/` plus six region-tagged country homes. Each country's **default-locale** home declares its own six-locale cluster, `x-default` → itself, plus a bare `{lang}` → `/` (`app/[country]/[lang]/page.tsx`, deliberate return link). Result: two `x-default` claims across an overlapping set, the six country homes never name each other, and **`/portugal/pt` and `/brazil/pt` both claim `pt` → `/`**. 7 URLs | No indexing damage: all 7 pages `PASS` / "Submitted and indexed", `googleCanonical == userCanonical` on every one (URL Inspection, 2026-08-13). `/` remains the site's top page — 154 clicks / 1,984 impressions / 7.76% CTR / pos 18.9, queries ~entirely brand | **None.** Live and verified (§7 `SEO-FOUNDATION-004`): `/` emits no alternates; every market keeps its own cluster and `x-default`; no country home points at `/`. Google has not necessarily reprocessed the graph yet — that is a recrawl matter, not an open action |
| SEO-FOUNDATION-001-D | `app/sitemap.ts` and `app/robots.ts` have **zero** regression tests | Regression coverage | **CLOSED — IMPLEMENTED, VERIFIED LOCALLY** by `SEO-FOUNDATION-002`, 2026-08-13 | 2026-08-12 | No test file in the repo references either module. `sitemap.ts` alone decides all 1,906 submitted URLs, carries a load-bearing ordering rule (section-pages loop must stay last) and documents **four** past regressions in its own comments: 24 empty Spain URLs, 79 unsubmitted legal locale variants, 16 redirecting blog URLs, 14 withheld Ireland doctors. Everything downstream of it *is* tested (hreflang builders, doctor/service indexability predicates, blog-pagination robots, 5 legacy-redirect families, 410 gone-paths, `aggregateRating` fail-closed guard) | n/a | **Done.** `tests/unit/seo/sitemap.test.ts` (22 tests) + `tests/unit/seo/robots.test.ts` (7 tests), 2026-08-13. All four documented past regressions now have a named test. `-A` was **not** bundled — see `SEO-FOUNDATION-002` in §7 |
| SEO-FOUNDATION-001-F | Lab-test detail pages carry no sibling-test or service internal links | Internal linking | **PARTIAL — CONFIRMED, blocked until 2026-09-08** | 2026-08-12 | `/ireland/en/lab-tests/general-health-test` renders 40 unique internal links — header, footer, the 7 tool links and 2 to the `/lab-tests` hub — and **zero** to the other 13 tests and zero to any service. A service detail page renders 8 sibling service links from the same shell | Cluster is mid-ramp; no attribution possible yet | **Do not act before the SEO-GROWTH-016 re-measure.** Recorded so the option exists if the cluster stalls |
| SEO-FOUNDATION-001-E | Dead route-SEO catalogue in `lib/seo/page-seo.ts` | Maintenance trap | **DEAD CODE — no search impact** | 2026-08-12 | `ROUTE_SEO`, `pageMetadata`, `getRouteSeo` and `resolveBrandTitle` (~230 lines of route titles/descriptions) have **no consumer anywhere in the repo** — a repo-wide grep returns only the file itself and its own test. Only `buildPublicMetadata` is live. The dead copy is also stale (says "five countries", has no `/brazil` row) | 0 URLs affected | Delete when convenient. Editing it does **not** change any served title — record that before anyone tries |

### Doctor indexability

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-DOC-001 | 135 doctor-locale URLs `noindex` because `editorialChecklist` was `null` | Indexation | **CLOSED (28 doctors backfilled)** | 2026-08-08 | `52c42d1a` | Recrawl pending | Watchlist |
| SEO-DOC-002 | 26 doctor-locale URLs `noindex` on genuinely thin bios (5 doctors) | Content | **MANUAL ACTION REQUIRED** | 2026-08-19 | Correctly `noindex`; the guard is working as designed | n/a | Clinical/editorial team must write real bios; do not weaken `isPublicDoctorRecordIndexable()` |
| SEO-DOC-003 | Jana Cyplinska 410 | Legacy routing | **CLOSED — reverted, insufficient evidence of retirement** | 2026-08-08 | `36bbd5e5` | n/a | None |
| SEO-DOC-004 | Three Czech legacy doctor URLs 308'd into a 404 (`mudr-jana-cyplinska`, `mudr-libor-hlavaty`, `mudr-andrei-lavrov`) | Legacy routing | **CLOSED — routed to the Czech roster; disposition still unresolved** | 2026-08-14 | Both URL shapes (legacy `/czechia-doctors/{slug}` + current `/czechia/{lang}/doctors/{slug}`, all 6 locales) now 308 to `/czechia/{lang}/doctors` in one hop, verified locally against the production API — every one of the 11 `/czechia-doctors/:slug` URLs known to GSC or the sitemap now terminates 200 in exactly one hop. `mudr-michael-nytra`'s 2-hop chain collapsed in the same change. **410 deliberately NOT used** — `GONE_DOCTORS` asserts confirmed removal and §14.8 gates that on disposition evidence none of the three has | Legacy URLs still hold the equity: Cyplinská 48 clicks / 30% CTR / pos 4.4; Hlavatý 2 clicks / 567 impr; Lavrov 2 clicks (90d) | **PRODUCTION RE-PROBE OWED** — see the verification note below. Disposition check still owed (§14.8). Upgrade the destination to a per-clinician successor page when the §5 removal policy lands |

#### SEO-DOC-002 — current roster (re-measured against production, 2026-08-19)

A full sweep of every active market found **nine** active doctors still failing
`isPublicDoctorRecordIndexable`. All nine already have `readyToIndex: true`, so the
blocker is content only — a bio of at least 120 characters, and a registration number
or verification URL:

| Market | Doctor | Missing |
| --- | --- | --- |
| cz | `mudr-nataliya-kharlamova` | bio (0 chars) |
| cz | `dr-michael-nytra` | bio (0 chars) |
| cz | `dr-gabriele-felici` | bio (0 chars) |
| ie | `dr-arooj-iqbal-lodhi` | bio (0 chars) |
| ie | `roney-carli` | **nothing — closed 2026-08-19**, full bio supplied by the clinic and applied in all six Ireland locales; registration waived |
| ie | `priscila-figueiredo` | **nothing — closed 2026-08-19**, registration waived |
| ro | `dr-robert-gabriel-brindus` | bio (0 chars) |
| ro | `dr-alexandra-palaga` | bio (13 chars) |
| ro | `dr-andreea-lorena-bica` | bio (13 chars) |

These are the doctor URLs a crawler reports as `noindex, follow`. Nothing in code
can close the bio rows: the copy has to come from the clinical team. Do not weaken
`isPublicDoctorRecordIndexable()` to make the crawl report look clean.

**Non-physician roster members (2026-08-19).** Roney Carli (Manual Therapist) and
Priscila Figueiredo (Rehabilitation & Wellness Consultant) are not registered
physicians, so the medical-council registration the gate demanded does not exist
for them and never will. Handled with an explicit editorial assertion rather than
by loosening the rule: `editorialChecklist.nonPhysician: true`, applied to both in
production by `backend/scripts/applied/patch-ie-non-physician-practitioners.ts`.
It waives **exactly one** requirement — the registration — and is never inferred
from the free-text title. Bio depth, name, title, blocked-copy and `readyToIndex`
all still apply — Roney was still held back by an 86-char bio until the clinic
supplied the full text on 2026-08-19 (applied in all six Ireland locales with
per-locale titles and SEO, `patch-roney-carli-profile.ts` +
`patch-roney-carli-seo.ts`; his stored `seoDescription` had also been claiming an
online video consultation he has no bookable service for). Both now render
`index, follow` in production. The same flag also makes `physicianJsonLd` emit a plain
`Person` node instead of `Physician`, and drop `medicalSpecialty`: claiming a
medical type for a non-medical practitioner is a false credential claim, and this
is a public page about a real person. Frontend change is **local, not yet
deployed** — production still noindexes Priscila until it ships.

#### SEO-DOC-004 — verification status and expected outcome

**Status: CLOSED — VERIFIED ON DEPLOYED PRODUCTION, 2026-08-14.** `8189baa6`
reached `main` and Railway auto-deployed it the same day.

The original check ran against a local Next server pointed at the production
API, which proves the redirect *config*, not the deployed behaviour — an
assumption wearing an assertion's clothes, and the same error class that put
`SEO-GROWTH-002` in this ledger wrong. The row was therefore held at
CLOSED-PENDING-VERIFICATION until the deployed probe ran. **It has now run.**

Direct probe, `https://www.myglobalhealth.online`:

```
/czechia-doctors/mudr-jana-cyplinska  hops=1 final=200 -> /czechia/cs/doctors
/czechia-doctors/mudr-libor-hlavaty   hops=1 final=200 -> /czechia/cs/doctors
/czechia-doctors/mudr-andrei-lavrov   hops=1 final=200 -> /czechia/cs/doctors
```

Full §4 gate against the same host: **Test Files 1 passed, Tests 8 passed** —
no redirect terminates in an error, all 128 expanded doctor URLs resolve, every
sitemap entry is a live indexable 200, every `GONE_DOCTORS` URL answers 410.

The identical run **failed** on these three URLs before the deploy. That
before/after pair is the check demonstrating itself against real production
rather than a fixture.

**Expected outcome: the 48 clicks do not come back. Record this now.**
Redirecting a clinician-name query sitting at position 4.4 onto a generic roster
that never names her is the shape Google commonly treats as a soft 404 — the
target is not a close equivalent of the source, so it typically will not inherit
the ranking, and the redirect may end up treated as a 404 regardless. That does
not make the change wrong: it stops a hard 404 and gives a real patient
somewhere real to land, and 410 was correctly gated on missing disposition
evidence. But it means **§2 fixed the defect without recovering the traffic.
The recovery lives entirely in the §5 removal policy** — a per-clinician
successor page that names the person, states they no longer practise here, and
lists same-specialty same-language clinicians is a close equivalent; a roster
index is not. Do not read flat Czech GSC numbers in three weeks as evidence this
fix failed. It is the predicted result.

**Commit hygiene:** `8189baa6` also carries unrelated pre-existing edits to
`docs/plans/seo-implementation-brief-2026-08-14.md` that were uncommitted in the
working tree when the fix was staged. Noted so a future bisect over that file is
not confusing; no code is affected.

| SEO-DOC-005 | Nothing validated the redirect map, the sitemap or `GONE_DOCTORS` against the live doctor set | CI / process | **CLOSED — gate shipped, and it fails on the real defect** | 2026-08-14 | `frontend/tests/unit/seo-live-urls.test.ts` + a `seo-live-urls` CI job (push to main, weekly cron, `workflow_dispatch`). `GoneDoctor` now *requires* `clickCost` and `approvedBy`, so an undocumented 410 is a type error, not a review miss | n/a | Re-run the job after every deploy that touches redirects; see the §4 notes below |
| SEO-DOC-006 | SEO-DOC-001's recrawl tail measured: **117 doctor-locale URLs across 25 doctors** still carry a `noindex` verdict Google formed *before* the `52c42d1a` backfill | Indexation (measurement) | **OPEN — WAIT FOR GOOGLE, no action authorized** | 2026-08-14 | All 117 serve `index, follow`, self-canonical, 200, and are in the sitemap with `lastmod` `2026-08-08T20:22Z`. Bio substance re-verified on all 25 doctors (Physician JSON-LD 175–300 chars, doctor-specific, in-locale) — the guard correctly stopped applying, it did not break | Every one last crawled **2026-07-16 → 2026-08-06**, i.e. all before the 2026-08-08 fix. Zero exceptions | **Watchlist only — see §6.** Do NOT submit via URL Inspection: this is the same mechanism §19.5 classifies WAIT FOR GOOGLE for Telmo/Vitor Pais/Pedro Santos, all three of whom appear in this set. Reversing that posture is an owner decision, not a maintenance step. **`reviewBy: 2026-09-01`** — pass condition below |

#### SEO-DOC-006 — `reviewBy: 2026-09-01`, and what counts as pass

**This row expires. It does not sit open indefinitely.** SEO-DOC-001 was a
correct observation with no date attached, which is how "Recrawl pending" stayed
unquantified for six days; stating the date here is what stops SEO-DOC-006
inheriting the same shape.

**Pass condition — crawl date, NOT indexation.** On 2026-09-01, re-inspect a
sample of the 117 and read **`last_crawl_time` only**:

- **PASS — close the row.** Crawl date has advanced past **2026-08-08** on the
  sampled URLs. Google has re-evaluated the pages against their current content.
  That is the whole assertion. **Whether the pages are then indexed is a
  different question and must not gate this row** — a recrawled page that Google
  still declines to index is a content/authority finding, opened as its own
  ticket, not evidence that the backfill failed.
- **FAIL — escalate.** Crawl date has advanced past 2026-08-08 **and** the
  verdict is still `noindex`. This is the only outcome that indicts the fix, and
  it is the §6 escalation condition already written ("crawl date advanced past
  the fix date and Google's verdict is still wrong").
- **NEITHER — extend, do not escalate.** Crawl date still predates 2026-08-08.
  Nothing has been tested yet. Re-date `reviewBy` and wait. Three consecutive
  extensions means the pages are not being crawled at all, which is a §6/§13
  crawl-budget finding, not a doctor-indexability one.

Tying the condition to indexation instead of crawl date would make the row
unfalsifiable in exactly the way §5's SEO-DOC-004 note warns about: flat numbers
in three weeks would read as failure when the pages had never been re-fetched.

Re-run cost is the §2 diff plus a sample, not another 184-URL pass.

#### SEO-DOC-006 — how the 117 were found, and why the number is not ~75

Found by diffing the **1,924 live sitemap URLs against the 1,851 pages with any
GSC impression in 90 days**, then inspecting the doctor URLs in the 721-URL
remainder. Impressions prove indexation, so the remainder is a bounded candidate
set that costs one sitemap fetch plus one GSC query — not a crawl. It answers the
half §4's gate cannot: §4 asserts every sitemap entry is a live indexable 200
(it passed here, 721/721, zero `noindex`, zero cross-canonical), which says
nothing about whether Google agrees. This diff is what catches
technically-perfect-but-not-indexed.

**A stratified 68-URL sample put the figure at ~75. The real number is 117.**
The sample extrapolated at 10% of 721 assuming even distribution; doctor URLs
cluster (92 of the 184 doctor URLs in the remainder are Portugal alone), so the
sample understated by ~60%. Recorded because the same sampling shortcut will
understate any per-template finding in this codebase — enumerate the template's
own URLs rather than extrapolating a site-wide sample.

Distribution: Portugal 75, Czechia 18, Romania 18, Brazil 3, Spain 2, Ireland 1.
Per-doctor list with crawl dates:
[`docs/audits/seo/doctor-recrawl-tail-2026-08-14.md`](../audits/seo/doctor-recrawl-tail-2026-08-14.md).

**Two negatives worth not re-deriving.** The sitemap is *not* mis-submitted —
GSC reports `submitted: 1900`, `errors: 0`, `is_pending: false` against 1,924
live (grew 24 since last read), so discovery is working and the ~115 extrapolated
"unknown to Google" URLs elsewhere in the remainder are crawl starvation, not a
parsing fault. And `lastmod` is *not* the blocker — these pages have carried a
correct `2026-08-08` `lastmod` for six days and were still not recrawled, which
is also why the 305 sitemap entries missing `lastmod` are tidying, not a fix.

#### SEO-DOC-005 — what the gate does and does not cover

Three assertions, one per §4 bullet: no redirect terminates in an error; every
sitemap entry is a live indexable 200; every `GONE_DOCTORS` URL answers 410,
with a click cost and a named approver recorded.

**Demonstrated, not asserted.** Run against production on 2026-08-14 it *failed*
on the three Czech P0 URLs — the exact defect §4 was written to retire, caught
against real production rather than a synthetic fixture. The sitemap and
`GONE_DOCTORS` assertions passed on the same run.

**Two design decisions worth not re-deriving:**

- **It is not a pull-request gate.** The failures it catches are data-shaped,
  not code-shaped: a doctor row going inactive breaks a redirect target with no
  commit behind it. A PR gate would block unrelated work on a defect the PR
  neither caused nor can fix. It runs on merge to main, weekly, and on demand.
  The offline half — the `GONE_DOCTORS` metadata check and the gone-slug rule
  check — *does* run on every PR, because that half is code-shaped.
- **A route-shape check would not have worked.** `/czechia/[lang]/doctors/[slug]`
  exists; the slugs do not. Every real failure in this class has been
  data-dependent, so the check has to resolve against live data. That is why it
  is network-gated rather than a static build step.

**Coverage, after the 2026-08-14 expansion.** 99 of 364 redirect rules have a
literal source and are probed directly. The 26 parameterised *doctor* rules —
the family the P0 lived in — are now expanded against a live slug universe built
from the roster pages, the sitemap and `GONE_DOCTORS`, giving 128 real URLs
probed. The roster is used rather than the sitemap alone on purpose: a `noindex`
doctor is absent from the sitemap but their URL is still live and still a
redirect target (Czechia: 8 on the roster, 5 in the sitemap).

**Remaining gap, two parts, both genuinely needing a GSC top-pages export:**
(1) legacy slugs belonging to nobody on the current roster — the
cyplinska/hlavaty/lavrov shape, which by definition cannot be derived from live
data; (2) honorific-drift legacy slugs (`mudr-` vs `dr-`).

**Part (2) is deliberately NOT synthesised, and the reason is worth keeping.**
The first version of the expansion generated every honorific variant of every
live slug. It reported 109 failures — every one a URL like
`/ireland-doctors/mgr-grainne-ahern` that has never existed anywhere and
correctly 404s. That is the same failure shape as the truncated GSC pull, the
diacritic-free Czech keyword research and this document's own redirect-arrow
attribution bug: **a corpus not grounded in anything real, read as evidence.**
Four instances now, one of them inside the fix for another. The corpus is
therefore restricted to two grounded shapes per clinician — the current URL, and
the legacy URL with the slug carried 1:1, which is what the broad rule actually
does. Fabricating the rest is not a substitute for the export.

**Alerting.** A failing scheduled run opens (or comments on) a GitHub issue
labelled `seo-live-urls`. A red check in a CI log surfaces nothing, which is the
exact gap this gate exists to close — "the team catches these when something
surfaces them, and nothing surfaces them". **Open item: mirror this to the
channel the team actually reads** (the same one the WhatsApp ops reports go to).
That is one repository secret plus a `curl` step; no channel or webhook secret
exists in this repo today, so the issue is the strongest option available
without one.

**Placeholder guard.** The type forces `clickCost`/`approvedBy` to exist, not to
be true — `approvedBy: "TBD"` compiles. A cheap lint rejects `TBD`/`TODO`/`N/A`/
`unknown`/`pending`/`FIXME`, requires a digit in the click cost, and requires the
approver to be longer than a bare word. It catches the placeholder someone types
intending to come back. It cannot catch a plausible fabrication and is not meant
to.

---

## 5b. Ledger-integrity sweep — 2026-08-14, one-off

**Why this ran.** `SEO-GROWTH-002` was written `CLOSED — VERIFIED BY PRODUCTION
CHECK` (2026-08-12) asserting a URL returned "200 `index, follow`". It returned
404. §14, written the *next day*, independently recorded the same clinician as
absent from the roster — so this document disagreed with itself for two days and
nothing surfaced it. One verified-CLOSED row being wrong is evidence about the
other rows in a 349 KB ledger, not just about that row. This sweep sized which.

**Method.** Extracted every table row asserting a production URL state, probed
all of them against production without following redirects, and compared. Script:
`ledger_sweep.py` (session scratchpad — one-off, deliberately not committed; §4's
CI assertion is the durable version of this check). Attribution is the whole
game: a row reading `` `A` → 308 → `B` `` asserts 308 about A and says nothing
about B's own status, so codes are attributed to redirect *sources* only. Rows
naming several paths and one code are reported AMBIGUOUS rather than counted
either way.

**Result — 54 distinct URLs across 66 row-claims: 16 AGREE, 2 flagged, 36
AMBIGUOUS, 0 unreachable. Both flagged rows are attribution artefacts, not
ledger errors,** adjudicated by hand:

| Flagged | Verdict |
| --- | --- |
| `/ireland/en/blog` (row `SEO-GROWTH-009`) | The row's 308 belongs to `/post/*`, the redirect source; the blog hub itself correctly serves 200. Row is right |
| `/pt/spain-doctors/dr-alfredo-del-valle` (row `SEO-GROWTH-011`) | The row's "200" describes the five `spain/{locale}` URLs; the same row separately calls this legacy path a dead stub. It 308s to a 200. Row is right |

All 36 AMBIGUOUS rows were read individually and every one is consistent with
production (sources 308, targets 200). The single genuine exception in the whole
file is `/czechia/cs/doctors/mudr-libor-hlavaty`, still 404 because `8189baa6`
is not deployed yet.

**Conclusion: `SEO-GROWTH-002` was one stale row, not a systematic problem with
how CLOSED is written.** No further audit of past rows is warranted.

**Scope limit, stated so it is not over-read.** This sweep tests HTTP status
codes and redirect targets only. It does **not** verify claims about
indexability, canonical tags, sitemap membership or hreflang, and several CLOSED
rows rest on exactly those. `SEO-GROWTH-002`'s failure was in the status-code
class, so the sweep was aimed at the right thing — but "16 AGREE" is not a clean
bill of health for every assertion in this document.

### RESOLVED — brief §3b is SUPERSEDED by `SEO-FOUNDATION-004` (Hassaan, 2026-08-14)

**Decision: option A now — `/` stays out of the hreflang graph. Option C is
recorded as the correct end state, not scheduled.** Made by Hassaan in session,
2026-08-14, as author of the §3b item: it was written without knowledge of
`SEO-FOUNDATION-004`. **Option B is off the table on the merits** — six pages
declaring one URL to be six different languages cannot be right — and §3b's
link-equity rationale is already satisfied by the 33 anchors in `75eb1137`.

**Rationale for A over C right now:** do not spend careful attention on a graph
that measured clean, against no demonstrated problem, on a dimension already
scoring 8/10.

**Revisit trigger, the only one:** GSC shows unmatched-locale traffic landing on
the wrong cluster. Absent that signal, C stays recorded and unscheduled.

> **Process note, kept deliberately.** An earlier version of this section
> recorded a *different* outcome as a closed owner decision when no approval had
> been given. That attribution was fabricated and was removed the same day. A
> ledger row marked as a decision someone made reads as correct forever, and
> §5b's own sweep would classify it AGREE without being able to check it — worse
> than a phantom file, which at least gets caught the first time someone opens
> it. **A decision row needs a named human and a date, or it is not a decision.**

**The conflict this resolved.** Brief §3b (2026-08-14) asked `/` to carry `x-default` plus
alternates to the six country homes. `SEO-FOUNDATION-004` removed exactly that
markup on 2026-08-12 (`cf2e8356`, verified in production 20:19Z). Before it, `/`
emitted `x-default → /` plus six `{defaultLang}-{REGION}` rows, and each market's
default-locale home emitted a bare language row back (`pt → /`, `en → /`, …).
That made six pages each declare this one content-negotiated URL to be a
different language — `en`, `cs`, `pt` *twice* (Portugal and Brazil), `es`, `ro` —
while `/` declared itself `x-default`. At most one of those claims can be true,
and `/portugal/pt` and `/brazil/pt` both claiming `pt → /` is unambiguously
wrong. It was classified an architecture/semantic defect with **no demonstrated
ranking impact**, and `/` stayed the site's top page throughout.

**Two distinct claims, and the brief conflates them — this is the part worth
deciding on.** `SEO-FOUNDATION-004` removed *both* the six alternates and the
`x-default` from `/`. The alternates were clearly wrong. `x-default` is a
separate question, and a root selector page is the textbook `x-default` target.
But `x-default` has no meaning standing alone: it is an annotation *within* a
cluster. Putting it back on `/` in isolation does nothing. Making `/` genuinely
the `x-default` means each of the six market clusters naming `/` instead of
itself — replacing six per-market `x-default → self` declarations with one
global one. **That is a materially different and larger change than "add
`x-default` to `/`", and it is the option nobody has actually costed.**

| Option | What it means | Cost |
| --- | --- | --- |
| **A. Leave `/` out of the graph** | Status quo. §3a's 33 anchors carry the link equity | **CHOSEN, 2026-08-14.** None |
| B. Restore §3b as written | `x-default` + six alternates on `/` | **REJECTED on the merits.** Re-creates the exact defect `SEO-FOUNDATION-004` removed |
| **C. Global `x-default → /`** | Six market clusters point `x-default` at `/`; keep per-market alternates | **CORRECT END STATE, NOT SCHEDULED.** Textbook shape for a selector page, but touches all six clusters across 1,893 URLs — the graph §10 lists as verified-healthy |
| D. Full 33-URL cross-product on `/` | What the `page.tsx` comment says Google permits for a selector | Not pursued. Dissolves the six per-market clusters |

The warning comment in `app/(global)/page.tsx` remains authoritative in the
meantime: do not restore an alternates map without deciding the whole-site
cluster shape first.

### Dated check — SEO-DOC-004 outcome, due 2026-09-08

**Deliberately aligned to the existing 2026-09-08 review day** (Ireland labs,
CZ-SEO-001) so it is one trip to GSC, not three.

**Prediction, recorded 2026-08-14 so it stays falsifiable:** Czech GSC is **flat**
on these three URLs. The 48 clicks / 30% CTR / position 4.4 that
`mudr-jana-cyplinska` carried do **not** return. Redirecting a clinician-name
query onto a roster that never names her is the shape Google commonly treats as
a soft 404 — the target is not a close equivalent, so it typically inherits
nothing.

| What to check on 2026-09-08 | Expected | What it would mean if different |
| --- | --- | --- |
| Czech clicks on the three legacy URLs | ~0, and falling as Google drops them | A rise means the roster redirect inherited more than expected — good news, record it |
| `inspect_urls` on the three legacy URLs | "Page with redirect", verdict NEUTRAL | Still 404 in Google's stored state = recrawl lag, not a defect. Re-check, do not act |
| `/czechia/cs/doctors` position/impressions | Unchanged or slightly up | — |

**Flat is the PASS condition, not the fail condition.** §2 fixed the defect
without recovering the traffic; the recovery is §5's successor page. Do not read
flat numbers on 2026-09-08 as evidence the redirect failed — that reading is
exactly what this row exists to prevent. The only result that would indicate a
real problem is Google continuing to serve a 404 for these URLs after a recrawl.

### Template check ANSWERED — §5 and §7 do NOT share a template (2026-08-15)

**Result: they diverge, and §5 is cheap anyway — for a different reason than
the check was hoping for.** The check below asked whether the brief's §5
successor page and §7 language pages are one template. They are not, and the
five minutes were worth spending because the answer changes what §5 costs.

| | brief §5 — departed-clinician successor | brief §7 — global page language versions |
| --- | --- | --- |
| URL shape | `/{country}/{lang}/doctors/{slug}` — country-scoped, one per supported locale | `/{lang}/{about\|faq\|blog}` — no country dimension at all |
| Route | `app/[country]/[lang]/doctors/[doctorSlug]/page.tsx`, **already exists** | `app/(global)/{about,faq,blog}`, reached by a `beforeFiles` rewrite |
| Layout | `app/[country]/[lang]/layout.tsx` | `app/(global)/layout.tsx` → `PublicShell` |
| hreflang builder | `doctorHreflangCluster` → `indexableHreflangCluster`, region-qualified `{lang}-{REGION}` | `globalPageHreflang`, **bare** language codes, market-neutral |
| What it needs built | a render state + a roster/410 policy decision | URLs and a hreflang cluster |

The shared property the check hypothesised — "a page per language, not a
country page, with its own hreflang" — holds for §7 and **fails for §5 on both
halves**: a departed Irish clinician's page is a country page, and its hreflang
is region-qualified because it belongs to Ireland's market cluster.

**The useful finding is the last row.** §5 needs no new template at all. It is
a state of a route that already exists, whose hreflang, canonical, robots and
sitemap behaviour are already correct and already tested — so the real §5 work
is the `GONE_DOCTORS`/`isPublicDoctorRecordIndexable` policy decision plus the
"same specialty, same language" list, not page construction. §7 shipping first
does not make §5 cheaper, because §5 was never expensive.

### SEO-GLOBAL-LANG-001 — brief §7 BUILT AND REVERTED, NOT SHIPPED (2026-08-15)

**Language-only versions of `/about`, `/faq`, `/blog` (`/{pt,es,cs,ro,de}/…`,
bare-language hreflang) were implemented, verified locally, then reverted
before commit. Nothing shipped. The working tree is back to `e49ad5e1` plus
this document.**

**Why: the brief's §7 assumed those three pages have no country dimension. Two
of the three already do.** Production probe, 2026-08-15, `curl -sL`:

> **This table is the PRE-RETIREMENT state and was superseded the same day.**
> The first three rows (`/about`, `/faq`, `/blog` → 200, "itself") stopped being
> true when `SEO-GLOBAL-LANG-002` shipped; all three now 308 to their Ireland
> equivalent, and `/portugal/pt/faq` and `/ireland/en/faq` — 404 here — now
> serve 200. Kept unedited because it is a dated observation and the reasoning
> below depends on what was true when the decision was made; read it as history,
> not as current state.

| URL | Status | Resolves to |
| --- | --- | --- |
| `/about` | 200 | itself |
| `/faq` | 200 | itself |
| `/blog` | 200 | itself |
| `/pt/about` | 200 | `/about` (308 followed) |
| `/portugal/pt/about` | **200** | itself |
| `/ireland/en/about` | **200** | itself |
| `/portugal/pt/blog` | **200** | itself |
| `/portugal/pt/faq` | **404** | — |
| `/ireland/en/faq` | **404** | — |

So `about` and `blog` each already exist in **two** shapes — a bare global page
and a `/{country}/{lang}` page — and `faq` exists only as the bare one.
Shipping §7 as written would have added a **third** shape for about and blog:
three URL families of overlapping content, two competing hreflang clusters, and
nothing declaring which is canonical. That is a worse defect than the one §7
set out to fix, and it is the reason this was reverted rather than committed.

**Decision — country-oriented is the architecture (Hassaan, 2026-08-15).** Not
language-only. `/{country}/{lang}` is the existing, indexed, hreflang-complete
shape and it wins by default. The remaining gap is FAQ: build
`/{country}/{lang}/faq` and stop treating `/faq` as the only home for it.

**Answering the footer question, since it is the same finding from the other
end.** The header, footer and mobile nav are ALREADY country-aware for about
and blog, and structurally cannot be for FAQ:

| Component | about / blog | faq |
| --- | --- | --- |
| `SiteFooter.tsx:192,198` | `careBase ? \`${careBase}/blog\` : "/blog"` — country-scoped whenever there is a country context | **`href: "/faq"`, hardcoded, no country branch** |
| `SiteHeader.tsx:141,145` vs `:156` | `${base}/blog`, `${base}/about` in the country branch | `/faq` in the no-country branch only |
| `MobileNav.tsx:170,172` vs `:179` | same pattern | same |

The footer is not inconsistent by oversight. It points at a non-country page
for exactly one item, FAQ, because **no country FAQ route exists to point at**.
Building `/{country}/{lang}/faq` and dropping the hardcoded `"/faq"` are one
change, not two.

**What stays open and needs a decision before the FAQ work starts.** The bare
`/about`, `/faq` and `/blog` are live and indexed. `/about` is not a duplicate
of `/{country}/{lang}/about` — it is a distinct corporate page (registry
numbers, the six-market grid, `TRUST-METRIC-001`'s live consultation count),
whereas the country version carries that market's register, offerings and
office. `/blog` is a cross-market hub grouped by country; the country versions
are single-market. So "delete the global ones" is not obviously right, and
"keep both" is what created this ambiguity. Someone has to say which of these
the bare URLs become: a kept global tier with its own role, or 301s into the
country set.

**GSC on what is at stake if they are redirected** (90d, 2026-05-11 → 08-11,
`page` × `country`, `rowCount: 77 / 72`, `hasMore: false` on both):
`/about` ~560 impressions **0 clicks** (GBR 185, ARE 94, USA 57, CMR 51, IRL
30; positions 30–57) · `/blog` 127 impressions / 4 clicks / position 4.65 ·
`/faq` **`rowCount: 0`** — zero impressions in 90 days on any URL ·
`/pt/about` 1,029 impressions / 10 clicks / position 9.2.

### SEO-GLOBAL-LANG-002 — FAQ built country-scoped, bare trio retired (2026-08-15)

**DEPLOYED AND VERIFIED IN PRODUCTION, 2026-08-15** (commit `5f67b9d8`; see the
verification block below). This closes the question `SEO-GLOBAL-LANG-001` left
open: the bare URLs become permanent redirects into the country set, not a kept
global tier.

**Status codes — the record and the wire.** These are written up throughout as
"301", which is the intent; **Next emits `308` for `permanent: true`**, and
that is what production serves. 308 is the method-preserving equivalent and
Google consolidates 301 and 308 identically, so nothing here needs changing —
but a later probe will see 308 where an older sentence says 301, and that is a
wording difference, NOT config drift. Do not "fix" the config on the strength
of it.

**Decision (Hassaan, 2026-08-15).** Remove `/about`, `/blog` and `/faq`. All
three now redirect permanently to their Ireland equivalent — priority market and
the OpenSEO project default. **No locale or geo detection on those redirects**:
Googlebot crawls from the US and would only ever see one market's page, and a
visitor-varying redirect makes the target unverifiable. `/about`'s 58 referring
domains are the reason this is a permanent redirect and not a 410.

**What was built.**

| Change | File |
| --- | --- |
| `/{country}/{lang}/faq` — market FAQ group (from `resolveAboutCopy`, the same source the country `/about` uses) + the four `faq.json` groups, `FAQPage` + `BreadcrumbList` JSON-LD, full hreflang cluster | `app/[country]/[lang]/faq/page.tsx` (new) |
| 33 FAQ URLs added; the three bare entries removed | `app/sitemap.ts` |
| `/about`, `/faq`, `/blog`, `/blog/page/:n` → `/ireland/en/*`; five pre-existing rules that terminated on the bare pages repointed so no chain forms (`/pt/about`, `/careers` ×2, `/{locale}/blog`, `/{locale}/about`, `/frequent-asked-questions`) | `next.config.ts` |
| Route files deleted | `app/(global)/{about,faq,blog/page.tsx,blog/page/[n]}` |
| Every remaining internal link repointed: footer (now `careScope`, Ireland outside a country), header + mobile global nav, `NotFound404`, `blog-post-page` back-link, `data/navigation.ts`, and the country `/about`'s "worldwide" link (now the entry gate — the page it pointed at no longer exists) | 7 files |

`/blog/{slug}` is deliberately **kept**: a post with no country assignment
canonicalizes there and is submitted there. Only the hub and its pagination went.

**Verification, 2026-08-15.** `tsc` clean. All six markets' FAQ URLs serve 200
with per-country titles (`Frequently asked questions — Ireland`, `Časté otázky —
Česko`), self-canonical, six-locale hreflang + `x-default`, `FAQPage` and
`BreadcrumbList` emitted; `/ireland/xx/faq` 404s. Sitemap emits 33 FAQ entries.
Footer on `/ireland/en/about` links `/ireland/en/faq` (0 occurrences of `/faq`).

**Redirect runtime behaviour — CLOSED, verified against production 2026-08-15.**
At the time of writing this section it was asserted at config level only (Next 16
refuses a second dev server on the same directory, and another session held it),
and that gap is now closed on the live site:

- `seo-live-urls` against `https://www.myglobalhealth.online`: **8 passed**,
  ~120 s. No redirect terminates in a 404; every sitemap entry returns 200 and
  is indexable.
- Direct probes: `/about`, `/faq`, `/blog` each return **308** straight to
  `/ireland/en/*` (see the status-code note above), in one hop.
- The translation gate is enforced by the system, not by memory:
  `/ireland/en/faq` and `/spain/es/faq` serve `index, follow`, while
  `/ireland/de/faq` and `/spain/de/faq` serve `noindex, nofollow`.
- Production sitemap: **11** FAQ URLs, and **0** entries for the bare
  `/about`, `/blog` or `/faq`.

**Prediction to record before the numbers arrive** (same discipline as
`SEO-DOC-004`): the measure is **non-English impressions on the 33 FAQ URLs that
did not previously exist**, plus `/ireland/en/{about,blog}` absorbing the bare
pages' equity. `/faq` had `rowCount: 0` over 90 days, so nothing is at risk
there; `/blog`'s 127 impressions / 4 clicks and `/about`'s ~560 impressions /
**0 clicks** are the stakes on the other two.

**This also closes the "hardcoded English FAQ" gap below.** `FAQ_ITEMS` lived in
`app/(global)/about/page.tsx`, which is deleted. The country FAQ route takes its
Q&A from `faq.json` (translated in all six locales) and the market copy from
`country-about.ts`, so no locale renders English Q&A under a translated heading.

### SEO-GLOBAL-LANG-003 — per-market FAQ copy, 11 indexable of 33 (2026-08-15)

**DEPLOYED AND VERIFIED IN PRODUCTION, 2026-08-15** (`9175893b`; nav placement
revised in `96f771db`). Follows
`SEO-GLOBAL-LANG-002`, which shipped the route with four templated questions
plus nine shared ones — identical across all 33 URLs, i.e. a page per market in
URL shape only. This replaces that with 18 questions per market.

**Research spend: 191 OpenSEO credits, 1,059 remaining.** The People Also Ask
blocks returned null question text in 8 of 12 SERPs, so no PAA strings were
harvestable and `get_keyword_metrics` was correctly skipped (nothing to
hydrate). Question phrasing came from a free WebSearch pass per market instead.
What the paid pull did buy was SERP *composition*, which is what changed the
copy: Ireland is privately dominated and uses "sick cert" verbatim; Portugal has
SNS24 in 2 of 5 and a distinct driving-licence certificate; Spain, Czechia and
Romania are dominated by the state instrument's own institutions.

**The finding that shapes three of the six pages.** `baja médica`
(incapacidad temporal, Seguridad Social), `eNeschopenka` (ČSSZ) and
`concediu medical` (CNAS) are state instruments Global Health does not issue.
Those three pages now say so plainly. That is the honest answer on a YMYL page,
it is what makes the three pages substantively different from each other and
from competitors who fudge it, and it matches the Czech market verdict already
in §12 — win on what we actually do, do not run a `neschopenka` campaign.

**Indexation is gated on translation, not on route existence.**

| | Count | State |
| --- | --- | --- |
| Authored (English ×6 markets, plus each market's own language) | **11** | `index,follow`, in sitemap, in hreflang cluster |
| Not yet authored | **22** | `noindex,nofollow`, absent from sitemap and hreflang, still serve a readable fallback |

Rationale beyond the `/legal/*` precedent (Hassaan, 2026-08-15): 117 doctor
URLs are still awaiting recrawl and ~115 more have never been fetched. Crawl
budget is rationed by authority and the domain has 58 referring domains.
Submitting 33 indexable URLs where 22 are unwritten does not buy 33 ranking
pages — it spends scarce budget on thin ones and dilutes what reaches the pages
that matter.

**Backfill trigger — stated before the numbers arrive, per the SEO-DOC-004
discipline.** Measured on the 11 authored URLs together, in a 28-day window, no
earlier than **2026-09-30** (six weeks post-deploy, so the crawl has had time to
happen). All three bands are named in advance, because the middle one is the
likeliest outcome for a new page family on a domain with 58 referring domains,
and an unnamed band is exactly where a flat-ish result gets reread as whatever
the reader needs it to be:

| 28-day impressions | Verdict | Action |
| --- | --- | --- |
| **≥ 150** | The family earns its crawl | Translate the remaining 22 |
| **1 – 149** | Indexed but not yet earning | **HOLD. Do not translate. Remeasure at the next 28-day window.** The constraint is discovery or authority, not language coverage — translating 22 more pages repeats the same bet at triple the cost |
| **0 by 2026-10-31** | Not a viable entry point for this domain yet | Revisit the family. Do not backfill it |

The hold band is a real verdict, not a deferral: it says the evidence came back
and it was insufficient, which is a different claim from "we have not looked
yet". Record each remeasurement with its date and count, so a third flat window
is visible as a pattern rather than re-litigated as a first result.

**Open question to confirm, not a gap to fill — Brazil.** The Brazil copy cites
Resolução CFM nº 2.314/2022 and deliberately does NOT cite Resolução CFM
2.382/2024, the Atesta CFM platform, or the ICP-Brasil digital-signature
standard. All three are real and all three are the authority signals in that
SERP. They were dropped because citing them implies an operational integration
**nobody has verified we have**. What needs answering, by a human with access to
the Brazil operation: does the platform issue atestados through Atesta CFM, and
are the documents signed to the ICP-Brasil standard? If yes, the citations
belong in the copy and are a genuine ranking asset in that market. If no, the
current wording is correct and should stay. Do not resolve this from the SERP.

**Nav placement — decided, then reversed the same day.** FAQ was added to the
country header and mobile nav on the reachability argument (a 33-URL family
reachable only from the footer is the `/health/*` defect, §6 of the brief,
repeated). **Hassaan reversed it (2026-08-15, `96f771db`): FAQ is footer-only.**
The FAQ is a support page, not a step in the booking journey, and the primary
nav is the wrong place to spend that attention. The footer link is still on
every page. Each removal site carries a comment recording the decision, so it is
not "fixed" back on reachability grounds by someone reading only this ledger.
**The reachability cost is real and accepted, not disproved** — if the 11 URLs
come back flat at the 2026-09-30 measurement, footer-only linking is one
candidate explanation and should be weighed before the copy is blamed.

**Chain guard.** `tests/unit/redirect-chains.test.ts` follows every redirect
destination back through the ordered rule list using Next's own bundled
`path-to-regexp`, failing on any chain or loop. `seo-live-urls` proves a redirect
does not 404 but follows up to 5 hops, so a rule landing on another rule passed
it silently. **Verification claim, stated at its real strength (§0.7):** the
guard was made to fail — injecting `/careers → /about` produced
`CHAIN: /careers -> /about -> /ireland/en/about` — and then restored. What the
guard itself proves is one-hop resolution through the rule list, not
origin-server behaviour; **that second half is now closed separately** by the
production gate recorded under `SEO-GLOBAL-LANG-002`.

**Post-deploy gate — RUN, 2026-08-15.**
`SEO_CHECK_BASE=https://www.myglobalhealth.online pnpm --filter frontend test seo-live-urls`
→ **8 passed**, ~120 s. Covered both open items in one run: the redirect runtime
gap from `SEO-GLOBAL-LANG-002` and the 11 new FAQ URLs.

### `/pt/about` — 1,005 Brazilian impressions are someone else's brand (2026-08-15)

**Keep this finding regardless of what happens to §7.** It was the brief's
stated justification for the whole item and it does not justify anything.

Brief §7 read: "`/pt/about` 308-redirects a Portuguese searcher into English at
position 19.4." The URL fact is right and the number is stale — it is
**1,005 impressions / 8 clicks / position 9.2 from Brazil**, plus 22/2 from
Portugal. But the query breakdown says these are not our searchers:

| Query | Impressions | Country |
| --- | --- | --- |
| `globalhealth` | 451 | BRA |
| `clinic global health` | 297 | BRA |
| `clinic.globalhealth` | 126 | BRA |
| `global health` | 65 | BRA |
| `minha clinica help global` | 26 | BRA |
| `help global consulta online` / `help global brazil login` / `help global telemedicina` | 7 | BRA |

`clinic.globalhealth`, `minha clinica help global` and the `help global *`
family are **navigational queries for a different Brazilian telehealth brand**.
That is why CTR is 0.8% at position 9.2. Navigational traffic for someone
else's product converts at zero in any language, so no amount of translating
`/about` recovers it.

**Consequence for how this work is justified and measured.** The case for
giving these pages country/language URLs is architectural — a six-language,
six-market site whose corporate pages Google can only see in one English
rendering — not a traffic projection. **The prediction to record is non-English
impressions on URLs that did not previously exist, not clicks on `/pt/about`.**
Same discipline as `SEO-DOC-004`: state it before the number arrives, so a flat
`/pt/about` afterwards is not misread as failure.

### Known content gap — `/about`'s FAQ block is hardcoded English

`app/(global)/about/page.tsx` holds `FAQ_ITEMS` (5 Q&A) and `COMPANY_FACTS` as
English string constants, and `FAQ_ITEMS` feeds both the visible FAQ section
and the `FAQPage` JSON-LD. Any non-English rendering of `/about` therefore
shows an English FAQ under a translated heading.

`COMPANY_FACTS` is defensible and the file says why — registry numbers and
company names are locale-independent. `FAQ_ITEMS` is not: on a YMYL medical
site, English Q&A under a Portuguese heading, emitted as `FAQPage` schema,
reads as machine-translated or half-built and is a quality signal pointing the
wrong way.

Today this only affects the cookie-negotiated rendering of a single URL, which
Google effectively only ever crawls in English — so it is latent, not live.
**It becomes a blocker the moment any non-English rendering of this page gets
its own indexable URL** (Hassaan, 2026-08-15). Whichever shape that URL ends up
taking, either translate the five items into all six locales first, or ship the
non-English variants `noindex` until they are. Do not ship it as a follow-up.

### Before starting §7 — check whether §5 and §7 share a template

**DONE, 2026-08-15 — see the section immediately above for the answer. Kept
for the reasoning, not as an open action.**

Five minutes, potentially large payoff. §5's successor page (a departed
clinician: states they no longer practise, lists same-specialty same-language
clinicians) and §7's language versions of `/about`/`/faq`/`/blog` are the same
shape: **a page that exists per language, is not a country page, and needs its
own hreflang.** If one template serves both, §5 gets materially cheaper and the
traffic recovery above arrives sooner than the §5 slot in the work order
implies. If they diverge, five minutes lost.

### Handoff — state at 2026-08-14 session end

**DEPLOYED. The §2 fix is live and verified — see `SEO-DOC-004`.** Someone
pushed to `main` during the 2026-08-14 session and Railway auto-deployed;
`8189baa6` is on `origin/main` and production now resolves all three Czech URLs
200 in one hop.

**That deploy also shipped three commits nobody in the SEO thread reviewed:**
`d946dd6c` (404-page redesign) and `4eee0131` / `214b41a5` (membership email
locale fixes), all from a concurrent session on the same branch. They are in
production now. Nothing has gone wrong — the 404-redesign interaction was probed
directly (real 404s still 404, `dr-grainne-ahern` still 410, the Czech redirect
still 308) — but the coupling was silent, and if one of those three misbehaves,
the SEO commits are in the same deploy and a bisect will be confusing. **Worth
someone who owns that work confirming it was ready to ship.** The general
lesson: a shared branch means a push is a decision about everyone's work on it,
so say so out loud when asking for one.

Two commits remain unpushed at session end (`1bc83a91` and the follow-up
recording this verification) — documentation only.

**Still open for Nauman — three, all the same class: a control that exists but
routes to nobody.**

1. Confirm Railway → Settings → Source still says `main` for Production (it did
   on 2026-08-12 per `SEO-FOUNDATION-004`, and the auto-deploy is consistent).
2. Name the channel that should receive `seo-live-urls` failures. The GitHub
   issue is a placeholder for a channel somebody actually watches — an unread
   issue is the same silent failure one layer up.
3. **Consider branch protection requiring a PR to `main`.** Railway auto-deploys
   `main` on push, so anyone merging ships whatever else is sitting on the
   branch — which is exactly what happened on 2026-08-14. "A push is a decision
   about everyone's work on it" is the right lesson but relies on people
   remembering it; a required PR converts that into a moment where someone sees
   the full diff. **Repo-policy call, not an SEO one** — recorded here because
   it is the same gap as the unread issue, not because this workstream owns it.

**A fourth ask, and it is a DIFFERENT KIND — flag the distinction so it is not
triaged as another policy question.** Items 1–3 are decisions only Nauman can
make. This one is a read-only lookup that happens to have no API.

> **Open GSC → Page indexing → Not indexed, and report two numbers: the count
> for "Discovered – currently not indexed" and the count for "Crawled –
> currently not indexed."** Thirty seconds. Not the whole report — those two.

**Ask for the COUNTS, not the URL lists.** GSC shows only a 1,000-URL sample per
reason and the sample is not necessarily representative; the reason-level counts
are the reliable figure. Reading the sample as the population is a §0.6 error.

### §6 scoping rule — decide it from those two numbers, before writing anything

The indexation picture is already mostly resolved by arithmetic and does not
need investigating: **indexed 1.91K against a ~1,900-URL sitemap** means
essentially the whole sitemap is in, and the 1.52K not-indexed are URLs never
submitted — the legacy Wix estate now answering 308 ("Page with redirect"), the
deliberate `noindex` set (portal, auth, CZ-SEO-005's empty-bio doctors),
robots-blocked paths, and parameter variants. **All of those are correct
outcomes.** The 2026-07-10 step change shows both bars rising together, which is
the new architecture being discovered, not something breaking.

Do NOT cite `brokenPages: 666` as evidence of the legacy estate's scale — it is
a known false positive from a stale Wix-era crawl (see §1). The grounded support
is the 364 redirect rules in `next.config.ts` expanding across six locales.

Only two of the eleven reasons bear on §6, because they are the state
`/ireland/en/health/hypertension` is in — known to Google, never fetched,
reachable only via the locale switcher:

| "Discovered" + "Crawled – currently not indexed" | What §6 is |
| --- | --- |
| **Tens** | A narrow fix. Add inbound links to the `/health/*` family from country homes, sibling services and same-language blog posts, exactly as the brief scopes it. The rest of the 1.52K is noise |
| **Hundreds** | A materially larger internal-linking project than §6 describes, and the scope should be re-cut before starting rather than discovered halfway through |

If the counts show the bulk of the 1.52K sitting somewhere *other* than "Page
with redirect" and "Excluded by noindex", that contradicts the arithmetic above
and is a genuinely new finding — bring it back rather than proceeding.

**Order for the next session: §7 before §6.** §7 (language versions of `/about`,
`/faq`, `/blog`) needs no deploy. §6's acceptance cannot be evaluated until one
lands, so starting there stalls at the acceptance step with an unverifiable
change. If the push takes a day, §7 keeps the session productive.

**Expectation to set before §6 starts, same shape as the SEO-DOC-004 note.** Its
acceptance criterion — `lastCrawlTime` going non-null on
`/ireland/en/health/hypertension` — is real but slow, and Google will not
necessarily crawl within the session or the week. **The deliverable is the
inbound links shipped and verified in raw HTML; the crawl verdict is a follow-up
`inspect_urls` check on a named date, not a blocker for closing the work.** A
still-null `lastCrawlTime` at the next check is not evidence the linking failed.

### Open finding — `/brazil-doctors/*` has no redirect rule (2026-08-14)

Surfaced by the SEO-DOC-005 slug expansion, not predicted by any audit.
`/brazil-doctors/dr-renato-sarmento` returns **404 with no redirect matching at
all** — five of six markets carry a `/{country}-doctors/:slug` rule and Brazil
does not, despite Brazil having been a Wix section (`/home-br` and
`/brazil-team` both have legacy rules).

**Real asymmetry, zero measured demand.** GSC, 2026-05-11 → 08-11, page contains
`brazil-doctors`: `rowCount: 0, hasMore: false` (§0.1 satisfied). Google has
never seen one of these URLs.

**Not actioned.** Brazil is out of scope pending legal review of whether
consultations can be delivered there at all, and the fix has no measurable
upside. It is one rule of the same shape as the other five whenever that review
clears. Recorded so the next person does not re-derive it.

### Decisions closed 2026-08-14 (stop re-opening these)

**`/` now links 33 country×language homes (`SEO-GROWTH-018`, `75eb1137`).** Was
six — every market's default locale only — so the 27 non-default combinations
got nothing from the site's highest-authority page, including `/ireland/{pt,ro,
cs,es}`, the community-language product. Verified in raw HTML (not the rendered
DOM): 33 distinct anchors, all 33 targets 200 on production. The endonyms and
the nav's accessible name are held in `CountryEntryGate.tsx` rather than the six
`common.json` bundles, which were under concurrent edit — fold them in next time
those files are touched.

**Czech slug convention stays mixed.** `mudr-` (3), `dr-` (2) and bare (1) coexist
in the Czech roster and that is now a decision, not an open item. Renaming live,
currently-ranking URLs for cosmetic uniformity costs a redirect hop and resets
URL history for no ranking gain. The acceptance criterion in
`seo-implementation-brief-2026-08-14.md` §2 that asked for unification was wrong
on this point and is superseded by this row.

**The sitemap check in §4 needs two assertions, not one.** They are separate
properties and conflating them manufactures false failures:

1. Every sitemap entry returns 200 **and is indexable**. A `noindex` page listed
   in the sitemap is the defect.
2. Every 200-but-`noindex` page carries a **recorded reason**. Not every
   indexable-looking page belongs in the sitemap.

`mudr-nataliya-kharlamova` and `dr-gabriele-felici` serve 200, are `noindex` on
empty bios (CZ-SEO-005), and are correctly *absent* from the sitemap. They pass
assertion 2 and are out of scope for assertion 1. A naive "every live doctor URL
must be in the sitemap" check flags them as failures; that check would be wrong.

---

## 6. Indexation watchlist

Code is correct in production; Google's stored state is behind. **Do not rerun ranking
investigations on these until the last-crawl date advances past the fix date.**

| URL | Production state (verified 2026-08-12) | Google's stored state | Last crawl | Fix date | Status |
| --- | --- | --- | --- | --- | --- |
| `/portugal/pt/doctors/dr-telmo-coelho` | 200, `index, follow`, self-canonical, in sitemap | Excluded by `noindex` | **2026-07-26** | 2026-08-08 | WAIT FOR GOOGLE |
| `/pt/portugal-doctors/dr-telmo-coelho` (legacy PT) | 308 → the canonical above | Submitted and indexed, self-canonical | **2026-07-16** | — | WAIT FOR GOOGLE |
| `/ireland/sick-leave` | 308 → `/ireland/en/services/sick-certificate-ireland` | Submitted and indexed, self-canonical | **2026-07-05** | 2026-07-30 | WAIT FOR GOOGLE |
| `/ireland/es/health/sick-cert-online` | 308 → the ES service page | Submitted and indexed, self-canonical | **2026-07-25** | 2026-08-09 | WAIT FOR GOOGLE |
| `/portugal/pt/health/atestado-medico-online` | 308 → `/portugal/pt/services/baixa-medica` | Submitted and indexed, self-canonical | **2026-07-25** | 2026-08-10 | WAIT FOR GOOGLE |
| `/portugal/es/health/atestado-medico-online` | 308 → `/portugal/es/services/baixa-medica` | Indexed (legacy ES family, last observed crawl 2026-06-04) | **2026-06-04** | 2026-08-10 | WAIT FOR GOOGLE |
| `/czechia-doctors/mudr-libor-hlavaty` | **CORRECTED 2026-08-14** — 308 → `/czechia/cs/doctors` (200). The previous entry claimed the per-doctor target returned "200, indexable"; re-probed live 2026-08-14 it returned **404**, and §14 (2026-08-13) already recorded him as absent from the roster. SEO-DOC-004 fixed the routing | Legacy URL still carries the ranking (573 impr / pos 11.0, 90d) | — | 2026-08-14 | WAIT FOR GOOGLE |
| 28 doctors backfilled to `readyToIndex` — **measured 2026-08-14: 117 doctor-locale URLs across 25 doctors still hold the pre-fix verdict** (Portugal 75, Czechia 18, Romania 18, Brazil 3, Spain 2, Ireland 1). Full URL list in SEO-DOC-006 | 200, `index, follow`, self-canonical, in sitemap; bios re-verified substantive on all 25 | Excluded by `noindex` — **every one last crawled 2026-07-16 → 2026-08-06, all before the fix. Zero exceptions**, so no page has yet been re-evaluated on its current content | **2026-07-16 → 2026-08-06** | 2026-08-08 | WAIT FOR GOOGLE |
| `/service-page/ie-medical-consultation` (legacy Wix) | 308 → `/ireland/en/see-a-specialist` | **Submitted and indexed, self-canonical** | **2026-07-08** | — | WAIT FOR GOOGLE (added 2026-08-12, SEO-GROWTH-017) |
| `/about`, `/blog`, `/faq` (retired 2026-08-15) | 308 → `/ireland/en/{about,blog,faq}`, one hop, verified live 2026-08-15 | Not yet recrawled. Pre-retirement 90d: `/about` ~560 impr / **0 clicks** (58 referring domains — the equity this 308 exists to pass), `/blog` 127 impr / 4 clicks / pos 4.65, `/faq` `rowCount: 0` | — | 2026-08-15 | WAIT FOR GOOGLE (added 2026-08-15, SEO-GLOBAL-LANG-002). `/blog`'s position 4.65 is the one worth watching — it is the only one of the three that was ranking |
| `/pt/about` (legacy) | 308 → `/ireland/en/about` (repointed 2026-08-15 — it used to target the now-retired `/about`, which would have made it a two-hop chain) | Still earning 781 impr / 8 clicks / position 8.7 | — | — | WAIT FOR GOOGLE (added 2026-08-12). Query mix is brand and **brand-collision** terms for unrelated entities ("clinic global health", "help global") — no commercial value, do not optimise |

**One watchlist item resolved this pass.** `/ireland-doctors/dr-mohammed-omar`, the
representative of the legacy Irish doctor family, was re-inspected 2026-08-12: Google
now reports `coverageState: "Page with redirect"`, verdict NEUTRAL, **last crawl
2026-08-11**, and `googleCanonical` = `/ireland/en/doctors/dr-mohammed-omar`. Google has
accepted the consolidation. GSC's *reporting* still attributes clicks to the legacy URL
(17 clicks vs. 3 on the current-shape URL in the current window), which is attribution
lag, not a live routing defect. The equivalent Czech row (`mudr-libor-hlavaty`) stays on
the list until it shows the same verdict.

Recheck cadence: **one `inspect_urls` pass every 2–3 weeks**, not per session. Next
recheck due **2026-09-01**. Escalate an item only if its crawl date has advanced past
its fix date and Google's verdict is still wrong.

**Recheck of 2026-08-14 (SEO-DOC-006) — counts as the pass; next due stays
2026-09-01.** 252 of the 2,000 daily URL Inspection calls used: 68 stratified
across the sitemap remainder, 184 covering every zero-impression doctor URL. No
item escalated — the escalation condition is a crawl date advancing *past* the
fix date, and all 117 crawl dates sit before it, so the correct reading is "not
yet re-evaluated", not "re-evaluated and still wrong". The cheap way to re-run
this without spending quota is the sitemap-vs-GSC-impressions diff in SEO-DOC-006;
inspect only what it returns.

---

## 7. Organic growth roadmap

### SEO-GROWTH-011 — investigated and closed, 2026-08-12

**Query×URL matrix** (28d, `query` × `page`, `contains: montañez` — broader than
"alfredo" alone, which missed the "moreno montañez" variants):

| Query | URL | Locale | Impr | Clicks | Pos |
| --- | --- | --- | ---: | ---: | ---: |
| alfredo del valle moreno montañez | `/spain/es/doctors/dr-alfredo-del-valle` | es | 10 | 0 | 6.3 |
| alfredo del valle moreno montañez | `/spain/cs/doctors/dr-alfredo-del-valle` | cs | 11 | 0 | 9.6 |
| alfredo del valle moreno montañez | `/spain/en/doctors/dr-alfredo-del-valle` | en | 2 | 0 | 9.0 |
| alfredo del valle moreno montañez | `/spain/pt/doctors/dr-alfredo-del-valle` | pt | 2 | 0 | 11.0 |
| alfredo del valle moreno montañez | `/spain/es/see-a-specialist` | es (hub) | 4 | 0 | 9.5 |
| **moreno montañez dermatologo** | `/spain/es/doctors/dr-alfredo-del-valle` | es | 4 | **3** | 5.5 |
| doctor moreno montañez | `/spain/es/see-a-specialist` | es | 4 | 1 | 4.75 |
| derma dr moreno montañez | `/spain/{de,es,pt}/*` (3 URLs) | mixed | 9 | 0 | 9.5–12 |
| doctor moreno montañez dermatologo | `/spain/es/doctors/dr-alfredo-del-valle` | es | 1 | 0 | 3.0 |
| dr moreno montañez(‑dermatologo) | `/spain/es/*` (3 URLs) | es | 12 | 0 | 7–12.7 |
| 90d only: alfredo del valle moreno montañez | `/pt/spain-doctors/dr-alfredo-del-valle` | legacy | 1 | 0 | 11.0 |

**Per-URL technical audit** (`inspect_urls` + live Googlebot-UA fetch, 2026-08-12), the
five current-shape locale URLs plus the one legacy stub:

| URL | HTTP | Robots | Self-canonical? | Google's canonical | In sitemap | hreflang cluster | `<title>` (per-locale, real translation) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/spain/es/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches (no consolidation) | yes | 6 locales + x-default(es) | "Dermatólogo" |
| `/spain/cs/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatolog" |
| `/spain/en/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologist" |
| `/spain/pt/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologista" |
| `/spain/de/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologe" |
| `/pt/spain-doctors/dr-alfredo-del-valle` (legacy) | — | — | — | — | — | not in cluster | "Crawled – currently not indexed", last crawl 2026-03-08 |

All five current-shape URLs render at 196–202 KB with distinct real per-locale
`<title>` strings — not a thin duplicate or an untranslated fallback. They cross-link
each other through the sibling-locale switcher (the same mechanism `b8b96200` made
crawlable sitewide). The legacy `/pt/spain-doctors/...` stub sits outside the hreflang
cluster entirely, is not indexed, and drew 1 impression in 90 days — it is not a
participant in the split.

**Classification: LEGITIMATE LOCALE DISTRIBUTION. Not cannibalization, not a
wrong-locale ranking, not stale legacy residue, not a technical defect.** Canonical,
hreflang, indexability, sitemap eligibility and content completeness are all correct
on every URL Google is choosing between. Google is not confused about which URL is
canonical — it accepts each URL's own self-declared canonical, meaning it has
deliberately decided these are five distinct, valid documents, not duplicates to fold
together.

**The mechanism, evidenced by the matrix itself:** "alfredo del valle moreno montañez"
is a bare proper name — it carries no language signal, so Google has nothing to key a
locale choice on and shows impressions across several of the six alternates (2–11
impressions each, zero clicks on any of them individually). The moment the query
carries a language-bearing word, Google confidently serves exactly one URL: "moreno
montañez dermatologo" (Spanish "dermatologo") ranks only on the `es` page, position
5.5, **75% CTR**; "doctor moreno montañez" ranks only on the `es` hub page, 25% CTR.
This is the hreflang architecture working as intended, not fragmenting authority — the
zero-click impressions are Google testing locale variants against a query that gives it
no basis to pick one, which is expected and not something a canonical/hreflang change
can fix (collapsing the cluster to one canonical would break the five real, distinct
translations this doctor already has).

**No code change made or needed.** The prior Spain audit's "CTR anomaly" framing was
imprecise — CTR is fine wherever the query has language signal — but its underlying
observation (Alfredo del Valle name-search impressions look scattered) was itself
correct; this investigation just supplies the mechanism instead of leaving it a
mystery. Not repeating this check for the other five markets' doctor clusters — the
mechanism is now understood, and no other doctor's name+specialty query in the current
data showed the same zero-CTR bare-name pattern to investigate.

### SEO-GROWTH-012 — investigated and closed, 2026-08-12

**Method.** Pulled the page-dimension GSC report for the 5 days immediately before the
surge (2026-08-01→08-05, 584 pages earning impressions) and the 4 days of the surge
itself (2026-08-06→08-09, 946 pages), then diffed the two page sets.

**Finding: this is not existing pages ranking better — it is 568 pages that had zero
impressions the week before suddenly earning them.** Those newly-surfacing pages
account for 4,990 impressions of the period's growth; impressions on pages present in
*both* windows actually fell slightly (−257, unnormalized). The surge is additive, not
a lift.

**What those pages are:**

| Page type | New-page impressions | Clicks | Distinct pages |
| --- | ---: | ---: | ---: |
| `/tools/*` (calculators) | **3,726 (75%)** | 18 | 171 |
| `/lab-tests/*` | 419 | 1 | 76 |
| other (mixed, thin) | 351 | 3 | 106 |
| `/services/*` | 183 | 1 | 100 |
| `/legal/*` | 136 | 0 | 45 |
| `/blog/*` | 74 | 0 | 18 |
| `/doctors/*` | 57 | 1 | 37 |
| `/health/*` | 44 | 0 | 15 |

Three-quarters of it is the BMI/calorie/blood-pressure/ovulation/ADHD-test/due-date
calculator cluster, newly ranking across markets and locales it wasn't ranking in
before — Romanian "calculator calorii" (38 impr, pos 11), Spanish "calculadora de
calorías" family (dozens of 1–7 impr rows, pos 30–70), Portuguese, Irish English
("calorie deficit calculator ireland", 17 impr, pos 9.1), and a long non-market tail
(France, Indonesia, India, Germany, Poland, Honduras, Peru, Chile, Venezuela, Israel,
Saudi Arabia, Korea — 1 impression each). Real, diverse, human-shaped queries, not a
bot or scraper pattern.

**Position quality is better than the earlier hypothesis assumed.** The original
NEXT-1 framing ("positions 18–26") was a guess made before this data existed. The
actual new-page distribution: 1,643 impressions (33%) at position 1–10, 1,388 (28%) at
11–20, 673 (13%) at 21–30, 517 (10%) at 31–50, 769 (15%) at 51+. Six in ten of the new
impressions are top-20. They just aren't converting: 24 clicks on 4,990 impressions
(0.48% CTR) even where the position is good — expected for free-calculator queries,
which compete against dedicated tools (Omni Calculator, calculator.net) and carry no
booking intent.

**Not a code deploy.** The tool pages themselves shipped weeks earlier
(`244d629e` "free BMI calculator for every market and locale" and the following tools
commits, all pre-August). Spot-checking 4 representative surging URLs
(`inspect_urls` + live Googlebot fetch) found no defect: all PASS, `index,follow`,
self-canonical, in sitemap — and their `lastCrawlTime` clusters tightly at
2026-08-05→08-08, i.e. Google (re)crawled and started ranking them right when the
surge starts. This is consistent with — though not proven to be caused by — the
crawlability/discovery fixes shipped in the 08-08/08-09 SEO batches (sibling-locale
links, metadata-in-`<head>`, service-catalog crawlability) finally letting Google find
locale×tool combinations it hadn't reached before.

**Answering the original question list:** queries = diverse global-language calculator
terms, not brand, not AI-attributable (no evidence found either way); pages = `/tools/*`
dominant; countries = a mix of real markets (RO, ES, PT, IE) and a long non-market tail,
consistent with generic worldwide calculator demand rather than market targeting; the
sitewide average-position decline in §1 is this cluster diluting the mix, not a ranking
loss on any existing page; commercial value is minimal — these are informational,
non-transactional pages; no wrong-page/wrong-locale/legacy behavior was found in the
sample checked.

**Classification: EXPECTED, NOT A DEFECT.** No code change. This generalizes and
supersedes the Spain-only framing of the pre-existing DEFERRED "calculator/tool long
tail" entry below — it is now confirmed sitewide, not Spain-specific.

### SEO-GROWTH-013 — investigated, 2026-08-12

**Method.** Fresh `get_search_console_performance` pull, `query`×`page`, current 28d
(2026-07-12→08-09), filtered `country=esp`, cross-checked against the prior 28d window,
`inspect_urls` on the six material Spain commercial URLs, four live `get_serp_results`
pulls (`consulta medica online`, `medico online`, `dermatologia online`, `psiquiatra
online`, es-ES/Spain), and three `get_domain_overview` pulls (MGH, one generic-cluster
competitor, one specialty-cluster competitor). Live page checks on MGH's GP and
dermatology detail pages and one top-ranking competitor page.

**Baseline (commercial queries only — tools, doctor-name searches, and AI-Overview-style
long conversational strings excluded).** 292 query×page rows, 1,034 impressions, 2
clicks, weighted position ~30 across the current window. By page:

| Page | Impr | Clicks | Weighted pos | Read |
| --- | ---: | ---: | ---: | --- |
| `/spain/es` (homepage) | 493 | 1 | 28.0 | Mix of brand ("global health", 55 impr, pos 6.9) and generic commercial terms |
| `/spain/en/services/consulta-medica-online` | 194 | 0 | 40.4 | **Wrong-locale**: ranks for Spanish-language queries, no internal referrers found by Google |
| `/spain/es/services/dermatologia-especialista-online` | 93 | 0 | 42.9 | Specialty detail page |
| `/spain/es/gp-consultation-online` | 87 | 0 | 32.6 | GP **hub** (multi-service catalog, "45.000 consultas en 2025" trust bar) |
| `/spain/es/services/consulta-medica-online` | 54 | 0 | 22.1 | GP **detail** page — best-positioned page in the whole cluster |
| `/spain/es/see-a-specialist` | 29 | 1 | 26.7 | Specialist hub |

**Prior 28d window (2026-06-13→07-11) had zero impressions on any of these six URLs** —
the query×page rows in that window are almost entirely brand/navigational terms against
legacy `/es/home*` pages. `inspect_urls` shows first crawl dates of 2026-07-17→07-20 for
the three service-detail pages — meaning the commercial cluster is genuinely new to
Google's Spain rankings this window, not a page that has been stuck at position 30 for
months. Positions 20–40 partly reflect normal post-indexing ramp, not a ceiling.

**Query×URL matrix, flagship term "consulta medica online" and its generic variants
(medico online, doctor online, online consultation, …):** splits across four pages —
homepage (pos ~29, brand+generic mixed), `gp-consultation-online` hub (pos ~21–35,
literally titled "Consulta Médica Online en España"), `services/consulta-medica-online`
detail (pos ~17–40, the strongest of the three Spanish pages), and the English detail
page (pos 12–93, erratic, zero internal referrers). Classification: **SUPPORTIVE
CLUSTER** for hub vs. detail (legitimately different formats: catalog+trust-stats vs.
single-service FAQ page — not duplicate content) with a **minor INTENT SPLIT** on the
single highest-value bare query, since hub and detail both target it head-on; the
English page is **WRONG LOCALE**, weakly linked, and not a meaningful contributor.

**Live SERPs (4 queries, Spain/es).** Neither MGH page appears in the top 20 for
`consulta medica online`, `medico online`, `dermatologia online`, or `psiquiatra
online`. Generic cluster ("consulta/medico online") top 20 is dominated by **national
insurers with built-in telehealth** (Sanitas, DKV, Caser, SegurCaixa Adeslas, Aegon,
Generali, Línea Directa) plus platform-scale aggregators (Doctoralia, TopDoctors) and
dedicated telehealth brands (SaludOnNet, ZAVA, mediQuo, Virtual Clínica) — a real
authority **and** business-model wall (insurers bundle the service free with a policy).
Specialty clusters (dermatología, psiquiatría) are dominated instead by **boutique/solo
practitioners** (dermatologia-bagazgoitia.com, madriderma.com, several named
psychiatrists) plus the same two aggregators — a substantially lower wall.

**Authority spot-check** (`get_domain_overview`, ES market): MGH 5 organic
traffic/4 keywords · a small generic-cluster competitor (virtualclinica.com) 997/236 ·
the top specialty competitor (dermatologia-bagazgoitia.com, solo practitioner since
2015) 21,882/1,751. Classification: **PRIMARY** for the generic cluster, **CONTRIBUTING**
for specialty — the specialty wall is lower but still real (a decade of content and
backlinks beats a page that's three weeks old in Google's index).

**Competitor page-format comparison** (MGH dermatología detail vs.
dermatologia-bagazgoitia.com, the #2 specialty result). MGH's page is not thin —
condition list, FAQ, pricing, doctor card with collegiate registration number, GDPR/
Stripe security copy — arguably deeper clinically than the competitor's. The one
material, verified difference: the competitor displays **4.9/5, 140+ Google reviews,
with named testimonials inline**; MGH's service detail pages show none. MGH does run
Doctify (confirmed live: `Doctify` appears in the page's cookie-consent copy — "Doctify
para mostrar reseñas de pacientes" — and the GP hub page separately shows "45.000
consultas en 2025 · Valorado en Doctify") but that trust bar does **not** render on the
service **detail** pages that carry most of the commercial-cluster impressions. This is
a verified, specific gap — not a copy-the-competitor cosmetic ask.

**Internal linking** (`inspect_urls` referrers): homepage links directly to the
dermatología and GP detail pages; the GP hub is linked from homepage and other-locale
hubs. Only the English detail page shows no discovered internal referrers — consistent
with it being an unintended wrong-locale ranking rather than a linking defect. No new
internal-link problem found; SEO-GROWTH-010's "structurally healthy" finding holds.

**CTR.** Two clicks on 1,034 impressions, essentially all at position 20+. Per the
project's own CTR rule, this is not a CTR question — ranking/visibility comes first.

**Bottleneck (Step 13).** Generic cluster: **SERP COMPETITIVE WALL / AUTHORITY**
(primary) plus a minor **PAGE-ROLE** overlap between homepage, hub and detail on the
single bare head term, plus the verified **TRUST PRESENTATION** gap. Specialty cluster
(dermatología, psiquiatría): **TRUST PRESENTATION** is the most concrete, fixable,
differentiating gap — content depth and price are already competitive; authority is
CONTRIBUTING, not primary, because the specialty wall is lower and the MGH pages are
still early in their indexing ramp.

**Ranked opportunities (2 credible, not forced to 5):**

| Rank | Cluster | Page | Impr | Pos | Bottleneck | Next action |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Dermatología especialista | `/spain/es/services/dermatologia-especialista-online` | 93 (+dermatología-cluster total 95) | 42.9 | Trust presentation (verified gap) + minor authority | Surface the existing Doctify review signal on the service detail page template |
| 2 | Médico general / consulta online | `/spain/es/services/consulta-medica-online` | 54 direct (637 cluster-wide) | 22.1 | Authority/business-model wall (insurers) + minor page-role overlap with hub/homepage | No fix recommended now — the wall is structural; monitor only |

Psiquiatría/salud mental (34 impr, pos 62) shows the same boutique-competitor dynamic as
dermatología but the impression base is too small to justify a standalone batch —
folded into the dermatología follow-up if that action proves out.

**Classification: CLOSED — INVESTIGATED / NO STRUCTURAL DEFECT.** Substantive
conclusions:

- Generic Spain commercial cluster ("consulta/medico online") → primarily an
  authority/business-model wall (national insurers bundle telehealth free with a
  policy; platform-scale aggregators dominate the rest). Not something a page-level fix
  moves quickly.
- Homepage / GP hub / GP detail → **supportive roles**, genuinely different formats
  (brand+generic landing / catalog+trust-stats / single-service FAQ). No consolidation
  case.
- `/spain/en/services/consulta-medica-online` ranking Spanish-language queries →
  wrong-locale behavior confirmed, but minor (194 impr, zero clicks, no internal
  referrers) — not the commercial bottleneck.
- Dermatología → trust presentation (Doctify reviews rendering on hub pages but not
  service-detail pages) is the clearest fixable gap; content depth and price are
  already competitive.
- CTR → not actionable; positions are 20+ almost throughout, and the project's own rule
  says ranking comes before CTR at that depth.
- Internal linking → healthy; homepage and hubs link directly to the material pages.
- Pages are newly indexed for Spain commercial queries (first crawl 07-17→07-20, zero
  impressions the prior 28d window) — some of the ranking depth is normal post-index
  ramp-up, not a ceiling.

**Recommended next batch (ONE, not a bundle — investigation only, this task did not
implement anything):** `SEO-GROWTH-014` — a feasibility investigation into the Doctify
trust-signal gap, not an implementation batch. Starting point
`/spain/es/services/dermatologia-especialista-online`, but scoped to the shared
service-detail template/architecture, not special-cased to dermatology. Open questions
to resolve before any UI or schema change: what powers the existing Doctify
integration; whether MGH has real retrievable review/rating data through it, or the
hub's "Valorado en Doctify" line is CMS copy with no backing data; whether a
service-detail page can legitimately show practice-level (not service-level) reviews,
and whether repeating the same practice-level rating on every service page would be
accurate; whether a reusable component exists or the shared template needs to change;
locale/consent-loading implications; and whether visible-UI-only is justified where
`AggregateRating` schema would not be. Target classification: one of READY TO
IMPLEMENT — EXISTING VERIFIED REVIEW DATA / UI POSSIBLE, SCHEMA NOT JUSTIFIED / MANUAL
DOCTIFY CONFIGURATION REQUIRED / PRACTICE-LEVEL REVIEWS NOT APPROPRIATE FOR SERVICE
PAGES / NO ACTION. Implementation, if any, follows only after that classification.

### SEO-GROWTH-014 — investigated, 2026-08-12

**Method.** Static-code investigation only (no GSC/OpenSEO calls needed) — traced the
Doctify integration end to end: `frontend/components/sections/DoctifyReviews.tsx` +
`DoctifyReviewsLazy.tsx` (the widget), `frontend/lib/api/reviews-config.ts` +
`backend/src/modules/settings/settings.service.ts` +
`backend/src/routes/admin-settings.route.ts` + `backend/src/validations/
admin-settings.schema.ts` (the separate schema.org config path), `frontend/lib/seo/
structured-data.ts` (the `AggregateRating` emitter and its guard test), the two root
layouts that wire it in, and every call site of the widget components. Then a
**direct, read-only** query of the production `Setting` table for all seven `review.*`
keys (deleted immediately after) to check what, if anything, is actually configured —
no write, no schema change.

**1. What powers the integration, where it renders.** `DoctifyWidget` /
`DoctifyReviewsSection` / `DoctifyInlineRating` / `DoctifySocialProof` inject a live
`<script>`/`<iframe>` straight from `doctify.com`'s public widget API — real,
third-party-hosted data, not fabricated. Module-level constants hardcode
`TENANT = "athena-ie"` and `SLUG = "global-health-ireland"` (`DoctifyReviews.tsx:31-32`)
— there is exactly **one** practice profile wired into the whole codebase, and it is
Ireland's. `DoctifyWidgetLazy` (`variant="horizontal"`) already renders on **every**
service-detail page, including the Spain dermatología page investigated in
SEO-GROWTH-013 (`services/[serviceSlug]/page.tsx:870`) — the widget was never missing
from that page. It is also on doctor-profile pages, every country homepage,
`CountryTrustBar`, about/contact/pricing/tests/FAQ pages. SEO-GROWTH-013's live check
didn't surface it only because it's mounted client-side, near-viewport-lazy, and (see
below) usually shows a consent placeholder instead of content.

**2. Is "Valorado en Doctify" backed by live data or stored copy.** Confirmed **stored
copy only**. `"stat2Title": "45.000 consultas en 2025"` / `"stat2Subtitle": "Valorado en
Doctify."` are static translated strings in `frontend/locales/{locale}/common.json`
(the `CountryTrustBar` stat block) — a marketing claim with no live number behind it,
disconnected from both the widget and the schema-config system.

**3. Real public Doctify practice identity.** Yes for Ireland — `athena-ie` /
`global-health-ireland` is a real, live, working Doctify tenant/practice slug (the
widget calls it directly; there'd be no fallback content to see otherwise). No
Spain-specific (or any other market's) Doctify practice is configured anywhere in the
codebase — `TENANT`/`SLUG` are constants, not parameters, so no per-country profile
could be selected even if one existed today.

**4-5. Practice-level vs. service/doctor-level accuracy.** The widget is
`profileType=practice` — one aggregate for the whole practice, shown identically across
every service and every country page (when it renders at all). Practice-level review
badges shared across multiple service pages are normal in this vertical (Doctoralia and
TopDoctors both aggregate at clinic/practice level too), so practice-level itself is
**not** the problem — the problem is that the one practice wired in is Ireland's, being
shown (or, per point 7, mostly *not* shown) uniformly on Spain, Portugal and Czechia
pages alike. That is a pre-existing sitewide market-attribution issue, not something
SEO-GROWTH-013 introduced or something scoped to dermatología — flagged here for the
record, out of scope to fix under this ticket.

**6. Dynamic vs. manual data.** Two separate, disconnected systems exist:
- The **widget** (`DoctifyReviews.tsx`) is genuinely dynamic — it fetches live from
  doctify.com on every page load. No CMS entry involved, but also no way to change
  which practice it shows without a code change.
- The **schema.org path** (`reviews-config.ts` → `settings.service.ts` →
  `structured-data.ts`) is **100% manual**: an admin types a rating and count into
  `/admin/settings/reviews`, which upserts a JSON blob (`review.doctify.aggregate`,
  etc.) into a generic key/value `Setting` table. Nothing fetches or refreshes it
  automatically — confirmed by reading `admin-settings.route.ts` end to end (a plain
  Prisma upsert of exactly what the form submits, no external API call anywhere in the
  path).

**Verified current production state (direct read-only DB check, 2026-08-12):** all
seven `review.*` Setting keys — `trustpilot.businessUnitId/aggregate`,
`google.placeId/aggregate`, `doctify.clinicId/aggregate`, `primaryProvider` — return
**zero rows**. Nothing is configured for any provider, in any market. The schema path
is not "not justified for Spain" — it is not activated at all, anywhere on the site.

**7. Consent/cookie gating and crawlability.** `useDoctifyAllowed()` requires the
`thirdParty` consent category to be explicitly granted; unresolved or refused consent
renders `DoctifyPlaceholder` (a "load reviews" prompt) instead of content
(`DoctifyReviews.tsx:64-124`). Independently, `DoctifyReviewsLazy.tsx` wraps every
export with `dynamic(..., { ssr: false })` — the widget is **never** part of
server-rendered HTML, consent or no consent. Combined effect: Googlebot's rendered DOM
and any non-consenting visitor see the placeholder, not review content; a
consent-granted visitor sees Ireland's practice, in English, on a Spanish page (see
point 3's language pin — `WIDGET_LANGUAGE` is hardcoded `"en"` because Doctify returns
an empty widget for any other language on this practice).

**8. Reusable component.** Yes, fully — `DoctifyWidget`, `DoctifyReviewsSection`,
`DoctifyInlineRating`, `DoctifySocialProof`, all consent- and lazy-load-aware, already
used across the site. No new component would be needed for a UI change; only the
tenant/slug scoping would need to become configurable instead of hardcoded.

**9. All service pages vs. safely scoped.** Currently sitewide and uniform — every
service-detail page gets the identical Ireland-practice widget instance. Making it
market-accurate (Spain pages show Spain data, if it existed) is an architecture change
— `TENANT`/`SLUG` would need to move from module constants to a per-country
configuration source. Not a per-page/per-service decision; a per-market one.

**10. Is `Review`/`AggregateRating` schema justified by the data.** No — and the code
already enforces this correctly. `aggregateRatingJsonLd()` fails closed by design
(`structured-data.ts:50-58`, with its own guard test) specifically to avoid "a
fabricated or defaulted `AggregateRating` on a medical site" risking a Google
structured-data manual action. With zero `review.*` rows configured, it emits nothing
site-wide today — correct, current behavior, not a bug.

**Classification: CLOSED — MANUAL DOCTIFY CONFIGURATION REQUIRED.** Every path to a
legitimate Spain trust signal — fixing the widget's market scope or activating the
schema aggregate — is blocked on the same fact: **no one has obtained or entered a
real, attributable Spain-market rating anywhere in the stack.** This is not a code
task. A human needs to either register/verify a Spain-market Doctify practice profile
(then a small code change makes `TENANT`/`SLUG` configurable per country) or obtain a
verified aggregate rating from any provider and enter it via
`/admin/settings/reviews` (which the schema path already supports today, fully
built, currently just empty). No UI or schema change is recommended until one of those
happens. Also worth the business's attention, separately: the Ireland-practice widget
currently displays (to consenting visitors) on every market's pages uniformly — a
pre-existing minor market-attribution issue, unrelated to Spain specifically, not
actioned here.

### SEO-GROWTH-015 — implemented (revised), 2026-08-12

**Direction change, same day.** The first pass (see git history / prior session
transcript) added a per-market gate — `isDoctifyConfiguredForMarket()`, Ireland-only —
that blocked the widget on every non-Ireland market. On review, that was the wrong
fix: the business decision is to treat the single existing Doctify practice as the
site's **global** MyGlobalHealth review profile, not an Ireland-exclusive one, and
show it everywhere. The gate was **reverted** in full; this entry describes the final,
revised state, not the intermediate gated one.

**Root cause (unchanged from the original framing).** The widget always showed one
real practice (`tenant=athena-ie`, `slug=global-health-ireland`) on every page
regardless of market — that is now the *intended* behavior, not a defect, so nothing
about the widget's sitewide presence needed fixing. What did need fixing: the language
sent to Doctify was hardcoded regardless of page locale, and a second, manually-typed
copy of "the current Doctify rating/count" existed on the homepage with no mechanism
to keep it in sync with Doctify's real number.

**Existing Doctify configuration.** Unchanged — still exactly one real practice,
`tenant=athena-ie` / `slug=global-health-ireland`. Kept exactly as-is, per instruction
not to invent new identifiers; if the practice is renamed/reconfigured on Doctify's
side, that is a Doctify-dashboard action, not a code change.

**Files changed** (uncommitted):

| File | Change |
| --- | --- |
| `frontend/components/sections/DoctifyReviews.tsx` | Removed `isDoctifyConfiguredForMarket()`, the `DOCTIFY_CONFIGURED_MARKETS` set, and the `country` prop from every export — full revert of the market gate. Replaced the hardcoded `WIDGET_LANGUAGE = "en"` constant: every `language=` query param on a doctify.com URL now interpolates the actual `language` prop instead. Updated the file-level doc comment to describe the practice as the site's global review profile |
| `frontend/components/sections/CountryTrustBar.tsx` | Reverted the `country={trust.country.code}` prop addition (prop no longer exists). Its own pre-existing `trust.country.code.toLowerCase() === "ie"` wrapper is **untouched** — flagging this below, it is now the one place still gating Doctify to Ireland only, which is inconsistent with the "global profile, shown everywhere" direction; left alone because it predates this ticket and wasn't named in scope |
| `frontend/app/[country]/[lang]/{services/[serviceSlug],pricing,tests,specialist-consultation,general-consultation,doctors,prescriptions,page}.tsx`, `frontend/lib/content/doctor-profile-page.tsx` | Reverted the `country={code}` prop addition on each — 9 files, one line each |
| `frontend/app/[country]/[lang]/page.tsx` (country homepage) | Removed the `fetchPublicReviewConfig()` call and the `doctifyAggregate`-derived `★ rating / N Doctify reviews` marquee stat entirely. That stat sourced from the manually-entered `review.doctify.aggregate` Setting — exactly the "second review count that can drift from Doctify" this revision was told to stop maintaining as UI source of truth. The live `DoctifyReviewsSection` widget lower on the same page is now the only Doctify rating/count shown there |
| `frontend/locales/{en,es,pt,cs,ro,de}/common.json` | Changed `stat2Subtitle` under `gpConsultationPage.hero` and `specialistPage.hero` (2 of 3 occurrences per file — the `testsPage`/lab-results occurrence, unrelated to Doctify, was left alone) from "Reviewed on Doctify."-style text to a Doctify-free description of the same volume metric (e.g. EN: "Completed across our clinician network."). See Static trust-copy review, below |
| `frontend/app/[country]/[lang]/general-consultation/page.tsx` | Swapped the `Star` icon (rating-shaped) on that same stat to `Users` — `specialist-consultation/page.tsx`'s equivalent stat already used a neutral `Stethoscope` icon and needed no icon change |
| `frontend/components/sections/DoctifyReviews.test.ts` | Deleted — tested the now-reverted predicate |
| `frontend/components/sections/DoctifyReviews.render.test.tsx` | Rewritten: proves the widget renders with no country context on every market (nothing left gating it), proves the source no longer contains the predicate/market-set/hardcoded-`"en"` pattern, proves every `language=` URL param interpolates the `language` prop, and proves `TENANT`/`SLUG` are unchanged |

**Market-scoping behavior (revised):**

| Market | Behavior |
| --- | --- |
| Ireland | Renders — unchanged from before any of this ticket's work |
| Spain | Renders — same global profile, `language={lang}` now passed through as the page's actual locale |
| Portugal | Renders, same as Spain |
| Czechia | Renders, same as Spain |
| Romania | Renders, same as Spain |
| Brazil | Renders, same as Spain |

Whether Doctify actually has translated review content for a given `language` value is
Doctify's own data availability, not something this codebase controls or can verify
without a live check against Doctify — a non-English request may still come back
empty on Doctify's side. That would show as a lightly-populated/empty carousel, not a
missing/broken section, and is a genuinely separate question from market-scoping.

**Static trust-copy review.** Two distinct things, per the instruction to only
edit wording that pretends to be the review count:
- **Generic organization-level statement** (`frontend/locales/{locale}/{about,
  contact,tests,home}.json` — "Independent, verified reviews collected by Doctify
  from patients treated by our clinicians") — does not claim a specific number,
  **not touched**.
- **The misleading pairing** — `gpConsultationPage.hero`/`specialistPage.hero`
  `stat2Title`/`stat2Subtitle`: "45,000 consultations in 2025" paired with "Reviewed
  on Doctify." under (on the GP page) a star icon. Read together, this reads as "our
  Doctify rating is backed by 45,000 reviews," which is false — 45,000 is a
  consultation-volume claim, not a review count, and nothing in the codebase ties that
  number to Doctify's actual review total. **Fixed**: the volume claim itself stays
  (a verified company metric per the instruction's own carve-out; not re-verified in
  this pass, unchanged from before), the Doctify/rating wording is removed from that
  specific stat, and the GP page's star icon (the rating-implying part of the visual)
  was swapped to a neutral one. `CountryTrustBar`'s separate `reviewsText` ("Recomendado
  por pacientes en Doctify" etc.) is a short label directly above the live widget
  itself, not a number, so it isn't the same "pretending to be the review count"
  pattern — left alone.

**Schema.** Confirmed unchanged, and confirmed **not** to be done going forward:
`AggregateRating` JSON-LD is deliberately never populated from Doctify's data, even
though the live rating/count is now readily visible in the UI. Google's
review-snippet structured-data guidance prohibits aggregating another site's reviews
into your own site's markup, and separately restricts self-serving `Organization`/
`LocalBusiness` review markup — copying Doctify's number into `aggregateRatingJsonLd()`
would violate that regardless of how accurate the number is. No edits to
`structured-data.ts`, `reviews-config.ts`, `settings.service.ts`,
`admin-settings.route.ts`, or `admin-settings.schema.ts`; the guard test suite is
untouched and still passes. The generic 3-provider admin review-settings feature
itself is not being deprecated by this ticket — it remains available for a provider
whose data is legitimately hand-verified — only its former role as the Doctify
homepage stat's source was removed.

**Consent behavior.** Unchanged and unaffected by this revision — the market gate that
used to sit in front of the consent check is gone, so behavior for every market is
now exactly the pre-SEO-GROWTH-015 Ireland behavior: `useConsent()`, the same
placeholder copy, the same "load reviews" grant flow.

**Locale behavior.** This is the one thing actually fixed here: `language` now flows
into every doctify.com URL (`DoctifyRatingStrip`, `DoctifyWidget`,
`DoctifyInlineRating`) instead of a hardcoded `"en"`. Whether Doctify returns
populated, translated content for a given language is outside this codebase's
control — see Market-scoping behavior, above.

**Tests.** `DoctifyReviews.render.test.tsx`, rewritten, 4 tests: renders normally with
no country context (any market); source no longer contains the predicate, the market
set, or a `marketOk` reference; every `language=` URL param interpolates `${language}`
(none hardcoded); `TENANT`/`SLUG` unchanged.

**Validation:**
- `pnpm vitest run components/sections/DoctifyReviews.render.test.tsx` — 4/4 pass.
- `pnpm vitest run` (full frontend suite) — 803/805 pass; the same 2 pre-existing,
  unrelated failures as every prior pass in this workstream
  (`lib/content/booking-address-copy.test.ts`, `tests/unit/
  portal-breadcrumb-routes.test.ts`).
- `pnpm tsc --noEmit` — clean.
- `pnpm eslint` on every changed file — clean.
- `node -e "JSON.parse(...)"` on all 6 edited locale files — valid JSON.

**Flagged, not resolved in this pass (business/product decisions, not code):**
- `CountryTrustBar.tsx`'s pre-existing Ireland-only badge is now inconsistent with the
  "global profile, shown everywhere" direction. Left alone because it predates this
  ticket and wasn't named in scope — worth an explicit call on whether it should show
  on every market too.
- Whether Doctify actually returns non-English review content once `language` is
  passed through is unverified — would need a live check against Doctify with
  consent granted, which this session's headless Browser pane could not composite
  frames to observe (`visibilityState: hidden`, confirmed in the prior session's
  verification attempt).
- No `AggregateRating`/`Review` schema was added, and per the explicit direction above,
  none should be — this is a standing rule for this integration, not a TODO.

### TRUST-METRIC-001 — implemented, 2026-08-12 (boundary revised same day)

**Scope.** Replace every static "45,000 consultations" claim with a live figure: **45,000
historical consultations through 2025-12-31; live platform consultations counted from
2026-01-01 onward.** Follow-up to SEO-GROWTH-015 — same principle (one live source of
truth instead of a manually-maintained number that drifts), applied to the
consultation-volume claim instead of the Doctify rating.

**Boundary revision.** First implemented with a 2026-07-01 cutover (guessed from the
deploy date of this work, not the actual meaning of the 45,000 figure). Corrected same
day: 45,000 is the total *through end of 2025*, so the live count must start
2026-01-01 — otherwise every completed January–June 2026 consultation would be counted
in neither the historical base nor the live query and silently disappear from the
public figure. `HISTORICAL_BASE` (45,000) is unchanged; `CUTOVER_AT`/
`completedSinceCutoverWhere` renamed to `LIVE_COUNT_START`/`completedSinceLiveStartWhere`
throughout code, tests, and this document — no more "cutover" language anywhere in this
feature.

**Query design.** `backend/src/modules/appointments/consultation-count.service.ts`:
counts `Appointment` rows where `status: "COMPLETED"` AND `paymentStatus: { not:
"REFUNDED" }` AND `consultationCompletedAt: { gte: 2026-01-01T00:00:00.000Z UTC }`.
`consultationCompletedAt` (not `createdAt`, not `scheduledAt`) is set exactly when an
appointment moves to `COMPLETED` — confirmed by reading every write site
(`appointments.service.ts`, `doctor-appointments.service.ts`,
`cross-border-rx.service.ts`, all three set both fields in the same update) — so a
booking made for a future slot, or any appointment still pending, doesn't count until
it has actually happened. No explicit no-show status exists in this schema; an
unattended appointment is never marked `COMPLETED`, so it's excluded the same way. The
where-clause logic is pulled into its own pure, exported function
(`completedSinceLiveStartWhere`) specifically so it's unit-testable without a
database — 5 tests cover the status filter, the refund exclusion, the date field
choice, the exact UTC boundary instant, and an override hook for verification.

**Production verification (direct read-only query, re-run 2026-08-12 against the
2026-01-01 boundary, per the "don't deploy until verified against real statuses"
instruction):**

| Check | Result |
| --- | --- |
| `completedSinceLiveStart` (the live query, 2026-01-01 boundary) | **56** |
| `displayTotal` | **45,056** |
| Completed, non-refunded appointments dated *before* 2026-01-01 (would be uncounted by either the base or the live query) | **0** |
| Earliest `consultationCompletedAt` recorded on this platform, any status | **2026-05-23** |
| `COMPLETED` since 2026-01-01 with `paymentStatus: REFUNDED` (excluded) | 0 |

**The user's explicit double-count/gap check.** Whether the 45,000 figure itself
already includes any 2026 consultations is an external fact about the *previous*
platform's export — nothing in this database can confirm or refute it; that
confirmation has to come from whoever produced the 45,000 number. What this
database *can* confirm, and does: this platform has **zero** completed, non-refunded
consultations dated before 2026-01-01 (the earliest is 2026-05-23), so from this
platform's side there is no live-query row that could be double-counted against a
45,000 figure ending anywhere in 2025, and no January–May 2026 data quietly missing
from the count either — the two figures don't overlap in practice today regardless of
exactly where in 2025 the historical export was cut. That said, the assumption stated
by the business (45,000 = through 2025, not into 2026) is the one thing this task
cannot verify computationally and is taken as given per instruction.

**One anomaly found earlier and still flagged, not actioned** (unaffected by the
boundary change): 19 appointments currently in `REQUEST_RECEIVED` status have a
non-null `consultationCompletedAt` — status was very likely moved to `COMPLETED` and
back at some point without clearing the timestamp. The query correctly excludes them
(it filters on current `status`, not just the timestamp), so this doesn't affect the
count's correctness, but it's a data-integrity oddity worth someone's attention
separately. Historical `COMPLETED`-with-null-`consultationCompletedAt` rows (1,170 of
1,226 all-time) are expected — they predate the field being populated and are already
reflected in the 45,000 historical base.

**API + caching.** New route `GET /api/public/consultation-count` (`backend/src/
routes/consultation-count.route.ts`), `Cache-Control: max-age=3600` (1h) at the edge,
same pattern as the existing `/api/public/reviews-config`. Frontend fetcher
(`frontend/lib/api/consultation-count.ts`) uses Next's data cache with
`revalidate: 3600` + a shared `consultation-count` tag, so every page reads one cached
value instead of issuing its own DB hit. Both `PUBLIC_READ_PREFIXES` allowlists
(frontend `client.ts` / backend `rate-limit-trust.ts`) updated in lockstep, matching
the existing `reviews-config` entry's documented reasoning.

**Every static claim found and replaced** (repo-wide grep for `45,000` / `45.000` /
`45 000` after the edits returns zero matches):
- `general-consultation`, `specialist-consultation`, `tests` hero stat strips — the
  locale `stat2Title` template changed from a year-stamped static number (e.g.
  "45,000 consultations in 2025") to a `{count}+ consultations`-style template (6
  locales), filled server-side with the live total formatted in the page's own
  locale.
- `(global)/about` page's "Consultations" company fact — was a static English string;
  now built from the live total at request time, spliced into the otherwise-static
  `COMPANY_FACTS` list.
- `lib/content/country-doctors-copy.ts`'s per-country `trustCard2Subtitle` overrides
  (Ireland, Romania, Brazil, Portugal, and Spain's `es:es` — ~25 entries across 6
  locales) — same `{count}+ [word]` templating, filled in on the doctors listing page.
  The **title** half of that same trust card ("Reviewed on Doctify" etc.) is untouched
  — it's a claim, not a number, out of scope here.

**Not touched, flagged instead:**
- `frontend/components/sections/DoctorsHero.tsx` has its own hardcoded fallback —
  `"4.9 patient rating"` / `"From 2,000+ reviews"` — used only if a caller passes no
  `trustCard2Title`/`trustCard2Subtitle` at all. This is exactly the kind of
  fabricated, unverifiable rating claim the `country-doctors-copy.ts` comments
  explicitly say must never appear (EU Omnibus). It appears this fallback is
  currently unreachable in production (every call site that was traced always passes
  at least the base locale bundle's values, which are always defined), but that
  wasn't exhaustively verified against every caller, and the fallback text itself is a
  real liability sitting in the codebase regardless of whether it's currently
  reachable. Out of scope for TRUST-METRIC-001 — flagged for a separate look.
- `CountryTrustBar.tsx`'s pre-existing Ireland-only Doctify gate — unchanged, still an
  open decision from SEO-GROWTH-015.

(An unrelated `gh2-glass-forest` restyle of `DoctorProfileTemplate.tsx`, initially
flagged as an unexplained stray diff, turned out to already be its own committed
change (`94c75229`) landed between sessions — not stray, not part of this work, no
action needed.)

**Validation:** backend `node --test` on the pure-logic suite (renamed with the
boundary fix, still 6/6) — pass, no DB required. `pnpm tsc --noEmit` clean (both
frontend and backend — 7 pre-existing, unrelated backend errors on
`patientPassportNumber` in cross-border-rx/orders/cart predate this work and don't
touch any changed file). `pnpm eslint` clean on every changed file. Frontend `pnpm
vitest run` — 803/805 (the same 2 pre-existing, unrelated failures as every prior pass
this session). All 6 locale JSON files valid. Direct read-only production query,
above, re-run against the corrected 2026-01-01 boundary.

### SEO-GROWTH-016 (a) — selection brief, 2026-08-12 (`SEO-RESET-001`)

*Kept as written. This is the evidence that justified opening the batch; the answers are
in **SEO-GROWTH-016 (b)** below, and where the two disagree, (b) wins — notably on the
"striking-distance" query band, which (b) shows is substantially supplier-brand search.*

**Issue.** Ireland's at-home lab-test cluster — `/ireland/en/lab-tests` plus 16
test-detail pages — earned **1,041 impressions and 4 clicks (0.38% CTR) at an
impression-weighted position of 27.1** in 2026-07-15 → 08-11, from **exactly zero
impressions** in the prior 28 days. After the sick-cert blog article (closed, monitor
only) and the brand-driven homepage, this is the largest non-tool, non-brand cluster on
the site, and it is the only large one that has never been investigated.

**Per-page evidence** (GSC, current window, `page contains /ireland/en/lab-tests`):

| Page | Impr | Clicks | Pos |
| --- | ---: | ---: | ---: |
| `/ireland/en/lab-tests` (hub) | 490 | 3 | 18.5 |
| `…/gut-microbiome-test` | 107 | 1 | 22.2 |
| `…/full-blood-count` | 76 | 0 | 53.9 |
| `…/thyroid-function-test` | 66 | 0 | 57.3 |
| `…/vitamin-d-test` | 58 | 0 | 23.4 |
| `…/vitamin-b12-test` | 44 | 0 | 22.4 |
| `…/heart-health-cholesterol-test` | 38 | 0 | 32.5 |
| `…/amh-fertility-test` | 32 | 0 | 28.9 |
| `…/female-hormone-test` | 32 | 0 | 33.7 |
| `…/genetic-lactose-intolerance-test` | 21 | 0 | 14.9 |
| `…/genetic-coeliac-disease-test` | 19 | 0 | 16.8 |
| `…/genetic-haemochromatosis-test`, `…/psa-prostate-test` | 18 each | 0 | 48.4 / 58.6 |
| `…/general-health-test`, `…/nutrition-lifestyle-dna-test`, `…/fracture-risk-assessment-test`, `…/male-hormone-test` | 11 / 8 / 2 / 1 | 0 | 31.7 / 28.0 / 75.5 / 22.0 |

**The single clearest pattern in the query data: geo-modified queries rank, head terms
do not.** Ireland-country query×page rows, current window —

| Rank band | Example queries (impr, position) |
| --- | --- |
| Position 4–20 (striking distance) | `gut testing ireland` (2, 6.0) · `at home b12 test` (1, 8.0) · `haemochromatosis test cost ireland` (2, 9.5) · `at home lactose intolerance test` (1, 10.0) · `heart health test at home` (1, 11.0) · `gut microbiome test ireland` (4, 11.3) · `at home coeliac test` (1, 12.0) · `gut health test ireland` (1, 12.0) · `cholesterol home test kit ireland` (5, 13.0) · `b12 test at home` (3, 14.0) · `home blood tests ireland` (5, 14.2) · `home cholesterol test ireland` (3, 14.7) · `gut microbiome testing kit` (5, 15.8) · `b12 test kit` (7, 18.3) · `gut microbiome test kit` (3, 18.7) · `at home vitamin d test kit` (2, 19.0) · `at home vitamin d test` (5, 19.8) |
| Position 40–95 (not actionable) | `blood count test` (7, 81.7) · `full blood count` (5, 66.8) · `full blood count test` (7, 51.0) · `fbc blood test` (7, 58.6) · `cholesterol test` (3, 70.7) · `haemochromatosis gene test` (4, 70.5) · `blood test to check thyroid` (1, 95.0) |

**Live SERP verification** (`get_serp_results`, location 2372 Ireland / `en`,
2026-08-12, 5 keywords) — this is not a GSC-only recommendation:

| Query | MGH live rank | Who owns the top of the SERP |
| --- | --- | --- |
| `gut microbiome test ireland` | **#14** — title "Gut Microbiome Test Ireland — Home Stool Test", real snippet | easyDNA.ie (2), thehealthlab.ie (3), dublincfm.com (4), randoxhealth.com (8) — boutique clinics and functional-medicine practices |
| `cholesterol home test kit ireland` | **#16** — title "Cholesterol Home Test Ireland — Heart Health Blood Test" | webdoctor.ie (1), thenutritionstore.ie (3), letsgetchecked.ie (4), inhealth.ie (5), mccauley.ie (7), randoxhealth.com (8) — telehealth plus pharmacy retail |
| `home blood tests ireland` | not in top 20 | letsgetchecked.ie (1), randoxhealth.com (2), bloodworks.ie (3), webdoctor.ie (6), thehealthlab.ie (7) |
| `at home vitamin d test` | not in top 20 | randoxhealth.com holds the **featured snippet**; then letsgetchecked.ie, Boots, pharmacy chains |
| `b12 test kit` | not in top 20 | Boots, randoxhealth.com, Superdrug, Amazon, Medichecks — UK retail-dominated |

**Why this matters.** These are paid physical products with a real basket value, not
informational traffic — the exact opposite of the `/tools/*` calculator long tail that
DEFERRED below correctly refuses to optimise. Two pages are already on page 2 of a live
Irish SERP for exact commercial intent.

**Why it is feasible.** The competitor set on the geo-modified queries is boutique
clinics, nutrition practices and pharmacy retail — not the national-insurer/aggregator
wall that made Spain (SEO-GROWTH-013) structurally hard. The pages are technically
clean (see the ledger row) and the cluster is in an *active indexing ramp*: zero
impressions four weeks ago, position 11–16 now. Depth is partly post-index ramp, not a
ceiling — the same pattern SEO-GROWTH-013 identified for Spain's service pages.

**The one constraint to take seriously.** MGH resells **Randox** kits, and
`randoxhealth.com` ranks page-1 (and holds a featured snippet) on several of the same
queries — including position 8 for `gut microbiome test ireland`, where MGH is 14. The
supplier is the competitor. MGH's own SERP snippet reads "Order a Randox gut microbiome
home test in Ireland", so product copy overlap is a live risk, not a theoretical one.

**What must be investigated next** (investigation only — nothing below is authorized to
implement):

1. Real search volume behind the geo-modified variants (`get_keyword_metrics` /
   `research_keywords`) — the GSC impressions per query are 1–7, so the cluster's size
   is currently inferred from breadth, not from any single query.
2. Page-format match: the ranking competitors are e-commerce product pages with price,
   stock and turnaround above the fold. Compare MGH's detail-page format against two of
   them (`thehealthlab.ie`, `webdoctor.ie`) rather than assuming a content gap.
3. Whether `Product`/`Offer` schema is present and legitimately justified (real prices
   exist, so this is a genuine question, unlike the `AggregateRating` case closed in
   SEO-GROWTH-015 — **that closure stands and must not be reopened by this work**).
4. Duplicate/near-duplicate product copy against `randoxhealth.com`'s own IE product
   pages.
5. Hub vs. detail page roles: does the hub target `home blood tests ireland` while
   details take single-test terms, or do they collide? (SEO-GROWTH-013's
   hub-vs-detail framework applies directly.)
6. Internal linking from `/ireland/en`: the Ireland homepage did **not** appear in
   Google's referring-URL sample for the lab-tests hub, whereas it did for
   `/ireland/en/services/referral-and-investigations`. GSC referring URLs are a sample,
   so this is a lead to verify against the rendered homepage, **not** a finding — and
   the hub itself demonstrably links out correctly (14 anchors).
7. The SERP snippets carry a "5 days ago" / "4 days ago" datestamp on commercial
   product pages. Worth understanding where Google is sourcing a date from, but
   classify before acting.

Target classification for the follow-up: one of CONTENT / INTENT · PAGE FORMAT ·
INTERNAL LINKING · CTR / SNIPPET · AUTHORITY · BUSINESS / SERP WALL · NO ACTION.

### SEO-GROWTH-016 (b) — investigated and classified, 2026-08-12

Investigation carried out the same day the batch was selected. **No code changed.** The
selection-time framing above stands as the brief; this section is the answer.

**Method.** Fresh GSC `query`×`page` for `country=irl, page contains lab-tests` (160
rows across two pages of results), per-page 28-day and last-7-day pulls, an 18-day daily
series, 12 live `get_serp_results` pulls (location 2372 / `en`, 2026-08-12 — 5 from the
selection pass plus 7 new), 3 `get_domain_overview` pulls scoped to the IE market, raw
Googlebot-UA fetches of the hub and three detail pages plus the Ireland homepage, a
browser render of two Randox product pages (their own pages are a client-rendered SPA
shell, so raw HTML carries no product copy), and the live `sitemap.xml`.

#### 1. The finding that reframes everything: the cluster changed state mid-window

Last 7 days (2026-08-05 → 08-11) vs. the full 28 days:

| Page | 28d impr | **Last 7d impr** | Share earned in the last 7 days |
| --- | ---: | ---: | ---: |
| `/ireland/en/lab-tests` (hub) | 490 | **11** | 2% |
| `…/gut-microbiome-test` | 107 | 107 | **100%** |
| `…/vitamin-d-test` | 58 | 58 | **100%** |
| `…/vitamin-b12-test` | 44 | 44 | **100%** |
| `…/heart-health-cholesterol-test` | 38 | 38 | **100%** |
| `…/amh-fertility-test`, `…/female-hormone-test` | 32 each | 32 each | **100%** |
| `…/genetic-lactose-intolerance-test` | 21 | 21 | **100%** |
| `…/genetic-coeliac-disease-test` | 19 | 19 | **100%** |
| `…/thyroid-function-test` | 66 | 33 | 50% |
| `…/full-blood-count` | 76 | 27 | 36% |

**The hub earned ~479 of its 490 impressions in the first three weeks and then stopped;
the detail pages earned essentially all of theirs in the final week.** This is not a
decline — it is Google handing specific-test queries from the catalogue page to the
newly-indexed detail pages, exactly as those pages entered the index (first crawls
2026-08-01 → 08-08). The detail pages have **one week** of ranking history each.

Daily series for the cluster (all countries) confirms it: 08-04 recorded **zero**
impressions, 08-05 → 08-07 were 6/10/3 at positions 38–63, then 08-08 47, 08-09 194,
08-10 121, 08-11 99 — with position improving on each of the last three days
(37.5 → 26.3 → **20.3**). Nothing here has settled.

#### 2. Query clusters (Ireland searchers, current 28d)

| Cluster | Impr | Clicks | Wtd pos | Main URL | Intent class | IE modifier |
| --- | ---: | ---: | ---: | --- | --- | --- |
| **Supplier brand ("randox …")** | ~57 | 0 | ~9 | hub (mostly) | **NON-IRELAND / SUPPLIER-BRAND NOISE** | mixed |
| Gut microbiome / stool | ~75 | 0 | ~26 | `gut-microbiome-test` | HIGH-INTENT PRODUCT | often |
| Cholesterol / heart | ~25 | 0 | ~40 | `heart-health-cholesterol-test` | HIGH-INTENT PRODUCT | sometimes |
| Vitamin D | ~20 | 0 | ~22 | `vitamin-d-test` | HIGH-INTENT PRODUCT | rarely |
| B12 | ~19 | 0 | ~23 | `vitamin-b12-test` | HIGH-INTENT PRODUCT | rarely |
| Full blood count / FBC | ~22 | 0 | ~62 | `full-blood-count` | GENERIC INFORMATIONAL | no |
| Thyroid | ~9 | 0 | ~52 | `thyroid-function-test` | GENERIC INFORMATIONAL | no |
| PSA / prostate | ~10 | 0 | ~84 | `psa-prostate-test` | GENERIC INFORMATIONAL | rarely |
| Haemochromatosis | ~11 | 0 | ~70 | `genetic-haemochromatosis-test` | COMMERCIAL RESEARCH | sometimes |
| Coeliac / lactose (genetic) | ~7 | 0 | ~25 | genetic detail pages | HIGH-INTENT PRODUCT | no |
| Fertility / hormone (AMH, female) | ~15 | 0 | ~36 | `amh-fertility-test`, `female-hormone-test` | COMMERCIAL RESEARCH | sometimes |
| Generic "home blood tests" | ~15 | 0 | ~30 | hub | HIGH-INTENT PRODUCT | often |
| **Public-phlebotomy booking** (`swiftqueue blood test appointments` pos 5.5, `mater hospital blood test` pos 6, `how to book blood test appointment online` pos 5) | ~5 | 0 | ~5 | hub | **WRONG INTENT — HSE/hospital appointment booking, not kits** | yes |

**The supplier-brand cluster is the single most important correction to the selection-time
read.** Roughly a quarter of the cluster's Ireland impressions and most of the
"striking-distance" band are people searching **Randox by name**: `randox home test kit`
(8 impr, pos 6), `randox blood test` (4, 8), `randox blood test ireland` (4, 8.3),
`randox thyroid test` (5, 10.6), `randox at home blood test` (3, 7), plus ~20 more,
**every one of them zero-click**. Ranking sixth for someone who typed the supplier's
name and will click the supplier is expected, not an opportunity. The selection-time
"~60 impressions at positions 4–20 with zero clicks" figure was real but is now known to
be substantially supplier-brand and hospital-booking intent, not unmet product demand.

#### 3. Hub vs. detail role mapping

| Query | Currently ranks | Correct page type | Match |
| --- | --- | --- | --- |
| `home blood tests ireland` (pos 14.2) | hub | hub | **HUB CORRECT** |
| `randox home test kit` and family | hub | (no MGH page can satisfy it) | **WRONG INTENT — supplier brand** |
| `gut microbiome test ireland` (11.3) | `gut-microbiome-test` | detail | **DETAIL CORRECT** |
| `cholesterol home test kit ireland` (13.0) | `heart-health-cholesterol-test` | detail | **DETAIL CORRECT** |
| `stool testing ireland` (17.0) | `gut-microbiome-test` | detail | **DETAIL CORRECT** |
| `lactose intolerance test at home` (13.0) | `genetic-lactose-intolerance-test` | detail | **DETAIL CORRECT** |
| `swiftqueue blood test appointments` (5.5), `mater hospital blood test` (6) | hub | none — HSE/hospital booking | **WRONG INTENT** |
| `accredited medical testing labs` (36.2), `home blood test` (49.8) | hub | hub | HUB CORRECT, just deep |

**No cannibalization.** Not one query was found where the hub outranks its own relevant
detail page, or where both compete for the same specific-test intent. The hand-off in §1
is the opposite of cannibalization — it is Google resolving the roles correctly and
unaided.

#### 4. Live SERPs — 12 queries, Ireland/`en`, 2026-08-12

MGH appears in the top 20 for **4 of 12**:

| Query | MGH live rank | Page-1 owners |
| --- | --- | --- |
| `gut microbiome test ireland` | **#14** | easyDNA (€149), thehealthlab, dublincfm, Randox #8 (€231) |
| `microbiome test ireland` | **#15** | same set |
| `cholesterol home test kit ireland` | **#16** | webdoctor (€89), thenutritionstore, letsgetchecked, mccauley, Randox |
| `home cholesterol test ireland` | **#18** | thenutritionstore (€19.99), webdoctor (€89), letsgetchecked, pharmacies |
| `home blood tests ireland` | absent | letsgetchecked #1, Randox #2, bloodworks, webdoctor |
| `stool testing ireland` | absent | btsireland, HSE bowel screening, GastroLife, **3-result local pack** |
| `haemochromatosis test cost ireland` | absent | Randox #2 (€91), thehealthlab (€130), genetrack (€300), bloodwise (€150) |
| `at home coeliac test` | absent | pharmacy self-tests (SELFCheck ~€13–20) hold the featured snippet and #3/#8 |
| `lactose intolerance test at home` | absent | Randox #6, easyDNA, genetrack, Amazon |
| `randox home test kit` | absent | **Randox owns 4 of the top 8** |
| `at home vitamin d test` | absent | Randox featured snippet, letsgetchecked, Boots |
| `b12 test kit` | absent | Boots, Randox, Superdrug, Medichecks |

GSC's page-1 positions for the `randox …` queries are **not reproducible live** — they
are averages over 1–8 impressions with high variance. Treat them as noise, not as
rankings.

#### 5. Winning page format

Two distinct formats win, by query type. Specific-test queries (gut microbiome,
haemochromatosis, lactose) go to **e-commerce product pages** — Randox, easyDNA,
genetrack, thehealthlab — with price, sample type and turnaround above the fold.
Category queries (`home blood tests ireland`) go to **catalogue/brand landing pages**
(letsgetchecked, Randox "Health at Home"). Generic non-geo consumer queries (`at home
coeliac test`, `b12 test kit`) go to **pharmacy retail product pages** (Boots, McCauley,
Hickey's, thenutritionstore) at €10–25 price points. `stool testing ireland` additionally
returns a **local pack** — physical Irish clinics — which MGH structurally cannot enter.

MGH's detail pages already are the first format: price, sample type, turnaround and a
marker list above the fold. **Page format is not the gap.**

#### 6. Randox supplier-overlap analysis — the mandatory check

Compared MGH's `gut-microbiome-test` and `vitamin-d-test` against Randox's own product
pages, rendered.

| Dimension | Randox | MGH |
| --- | --- | --- |
| Opening copy | "Understanding your health starts with your gut. The trillions of bacteria living in your gut influence everything from digestion & immunity to mood, skin and even sleep…" | "Your gut microbiome influences digestion, immunity and mood. This kit sequences the organisms present in a stool sample you collect at home and returns a profile of your microbial composition with insights you can act on. **It is a wellbeing profile, not a diagnostic test for gut disease.**" |
| Marker list | 3 collapsed groups (Archaeal / Bacterial / Viral Composition) | 11 named markers broken out (F/B ratio, butyric-acid producers, oxalate-degrading bacteria, pathogenic bacteria…) |
| Framing | Sales-led ("Better gut health can lead to more energy, stronger immunity, clearer skin…") | Clinically hedged, plus an explicit "will this diagnose IBS or coeliac disease? **No.**" FAQ |
| Ireland-specific content | none | IMC registration, GDPR/DPC, HSE/HIQA alignment, 112 emergency guidance |

**Classification: SUPPLIER-DERIVED BUT VALUE-ADDED.** What is shared is *product fact*
— marker names, 4–6 week turnaround, stool sample, activate-and-post flow — which is
unavoidable and not duplication. The prose is independently written and, on the clinical
honesty axis, better than the supplier's. **There is no near-duplicate risk and no copy
rewrite is warranted.** This closes the largest open question from the selection pass.

#### 7. Commercial differentiation — where the real constraint is

**SEO/content differentiation is fine. The business offer is the problem, and only on
some products.**

| Product | MGH | Randox direct | Others on the SERP |
| --- | ---: | ---: | --- |
| Gut Microbiome | **€254** | **€231** | easyDNA €149 |
| Genetic Haemochromatosis | **€129** | **€91** | thehealthlab €130, bloodwise €150, genetrack €300 |
| Vitamin D | €57 | from €40 (QuickDraw total €52) | Boots/pharmacy rapid tests ~€15–25 |
| Genetic Coeliac | €129 | — | pharmacy antibody self-tests ~€13–20 (different test class) |
| General Health | **€57** | **€91** | — |
| Heart Health (Cholesterol) | **€57** | — | webdoctor €89, careoncall €89, strips €19.99 |

MGH is **cheaper** than Randox on the General Health panel and cheaper than the telehealth
competitors on cholesterol — but **more expensive than its own supplier** on the two
highest-impression specialist kits (gut microbiome +€23, haemochromatosis +€38), and the
gut page is the single most expensive result on its SERP. Compounding it, MGH's own page
states plainly: *"Your results are delivered to you directly by Randox."* The clinician
value-add — an IMC-registered doctor to interpret results — is **not included**; it is
"optional, from €45", making the full MGH proposition €299 against Randox's €231 for the
identical kit.

This is a **BUSINESS / OFFER** finding, not an SEO one, and it caps what any content or
schema work can achieve on the gut and haemochromatosis pages specifically. It does not
apply to General Health or Heart Health, where MGH is price-competitive.

#### 8. Structured data

Every lab page emits `BreadcrumbList`, `FAQPage`, `MedicalOrganization`, `WebSite`,
`ImageObject`, `ContactPoint`, `PropertyValue`; the hub adds `ItemList` with 17
`ListItem`s. **No `Product`, no `Offer`, no `AggregateOffer` anywhere** — while real
prices (€57 / €79 / €100 / €129 / €243 / €254), currency, availability, sample type and
turnaround are all present as visible page content.

**Classification: DATA AVAILABLE BUT NOT EXPOSED.** Genuinely missing and genuinely
justified by real commercial data — unlike the `AggregateRating` case, which stays closed
per SEO-GROWTH-015 and must not be revisited by this workstream. Not added in this task;
see the NOW decision for why it is not the first move either.

#### 9. Metadata and snippet — one verified defect, on the hub

The hub is the only page in the cluster ranking shallow enough to qualify under the
project's own CTR rule (position 14.7 in the last 7 days). It has two factual errors:

- `<meta name="description">`: *"Order a Randox home blood test kit … **from €89** …
  Results in **up to 10 days**."* The catalogue's actual entry price is **€57**, and the
  gut microbiome and DNA tests take **4–6 weeks**, not 10 days.
- The on-page FAQ repeats the stale figure: *"Is the doctor consultation included in the
  **€89**? No. The €89 covers the Randox test kit…"* — no product in the catalogue costs
  €89.

So the SERP snippet **understates MGH's own entry price by 36%** on a SERP where
competitors advertise price directly (webdoctor "€89", thenutritionstore "€19.99"). This
is a correctness defect first and an SEO defect second. Detail-page titles and
descriptions were checked and are accurate, intent-clear and Ireland-explicit — no issue
there. No metadata recommendation is made for anything ranking 40–90.

#### 10. Content completeness

Checked against the ranking competitors on all twelve of the review's criteria. MGH's
detail pages state what the test measures, who it is for, the sample type, the process,
turnaround, what is included, what happens after purchase, how results are delivered, that
clinical interpretation exists (and that it costs extra), that it is at-home, and that it
ships anywhere in Ireland. They additionally state **who the test is *not* for** — the
"not a diagnostic test" framing — which none of the ranking competitors do. **No content
completeness gap found.**

#### 11. Internal linking

Hub → detail: **14 real anchors**, descriptive ("Learn more : Gut Microbiome Test"),
direct to canonical URLs. No defect.

Into the hub: the Ireland homepage carries **exactly one** link to `/ireland/en/lab-tests`,
in the nav/footer structure, anchored **"Lab Test Booking"** — a phrase matching no query
in the cluster. No in-body contextual link from `/ireland/en`, and no homepage link to any
detail page. Google's referring-URL sample for the hub lists `/online-prescription`,
sibling-locale hubs and one doctor profile — not the Ireland homepage. For the detail
pages the sample lists sibling locales and the sitemap only.

**Real but minor, and explicitly not the bottleneck** — the pages are indexed and
ranking, so discovery is not blocked. Flagged for the follow-up, per the review's own
rule that an internal-link problem only counts if the commercially strongest pages are
genuinely under-supported.

#### 12. Authority

`get_domain_overview`, IE market (2372/`en`), 2026-08-12:

| Domain | Organic traffic | Organic keywords |
| --- | ---: | ---: |
| easydna.ie (ranks #2 for `microbiome test ireland`) | 5,249 | 508 |
| thehealthlab.ie (ranks #3–4) | 3,464 | 523 |
| **myglobalhealth.online** | **26** | **38** |

The two boutiques beating MGH are **133× and 202×** its Irish organic footprint —
they are not "modest-authority sites outranking MGH". Randox and LetsGetChecked are
larger again. This is a genuine **AUTHORITY** gap, though the fact that MGH reached #14
within one week of indexing shows it is not an absolute wall on the specific-test long
tail. No outreach recommended or started.

#### 13. The "5 days ago" SERP datestamp — resolved

Not from the page. Ruled out by direct inspection: no `dateModified`/`datePublished` in
any JSON-LD block, no visible date anywhere in the rendered text, no `Last-Modified`
HTTP header. Sitemap `lastmod` is also ruled out — every lab URL shares a bulk timestamp
seconds apart (`2026-08-06T01:56:40Z` … `01:57:00Z`), which would produce the *same*
displayed date on every page.

The dates match **Google's own last-crawl times exactly**: gut-microbiome crawled
2026-08-07 → shown "5 days ago"; heart-health crawled 2026-08-08 → shown "4 days ago";
SERP pulled 2026-08-12.

**Classification: LEGITIMATE FRESHNESS SIGNAL / HARMLESS.** It is Google's normal
treatment of recently-first-indexed URLs and should fade as the pages age. **Nothing to
remove** — there is no date on the page to remove.

#### 14. Bottleneck

**Primary: INDEXING RAMP.** The detail pages carry the entire cluster and have exactly
one week of ranking history; the hub→detail hand-off happened inside the measurement
window; cluster position improved 37.5 → 26.3 → 20.3 across the last three days. No
conclusion about a "ceiling" is available yet.

**Secondary, confirmed: SNIPPET / CTR — hub only.** The €89 / "10 days" errors, §9.

**Structural constraints, real but not fixable by this workstream:**
**AUTHORITY** (§12) and **BUSINESS / OFFER** (§7 — supplier undercuts MGH on the two
biggest kits and delivers the results itself).

**Also true, deliberately not prioritised now:** PRODUCT STRUCTURED DATA is genuinely
missing (§8); INTERNAL LINKING into the hub is thin (§11).

**Explicitly ruled out:** SUPPLIER COPY OVERLAP (§6 — independently written), PAGE
FORMAT (§5 — already the winning format), HUB / DETAIL INTENT and cannibalization
(§3 — resolving correctly on its own), CONTENT COMPLETENESS (§10).

#### 15. Ranked opportunities

| Rank | Test / query | Page | Impr (28d) | Pos | Bottleneck | Feasibility | Recommended action |
| ---: | --- | --- | ---: | ---: | --- | --- | --- |
| 1 | Gut microbiome / stool, Ireland | `…/gut-microbiome-test` | 107 | 22.2 | Indexing ramp, then BUSINESS/OFFER (€254 vs Randox €231, easyDNA €149) | Medium | Measure; the price question is the business's, not SEO's |
| 2 | `home blood tests ireland` and category terms | hub | 490 (11 in last 7d) | 14.7 (last 7d) | Snippet (€89 / "10 days" both wrong) | High | Correct the two factual errors — see the NOW note |
| 3 | Cholesterol / heart, Ireland | `…/heart-health-cholesterol-test` | 38 | 32.5 | Indexing ramp | Medium | Measure. MGH is price-competitive here (€57 vs webdoctor €89) |
| 4 | Vitamin D + B12 | `…/vitamin-d-test`, `…/vitamin-b12-test` | 102 | ~23 | Indexing ramp + retail wall on non-geo terms | Low–medium | Measure only |
| 5 | Product/Offer schema across the cluster | all 17 pages | 1,041 | — | Structured data absent, data available | High effort-to-value once ranks settle | Queue behind the re-measure |

Coeliac, lactose, haemochromatosis, PSA, thyroid and full-blood-count are **not** listed:
each is either priced against a different product class (pharmacy antibody strips at
€13–20 vs MGH's €129 genetic test), undercut by the supplier, or sitting at position
50–90 on generic non-Irish terms.

### SEO-FOUNDATION-001 — whole-site technical and shared-template audit, 2026-08-12

Investigation only. No code changed, nothing deployed. Scope was the **shared SEO
machinery**, not any market's copy: crawling/indexation, sitemap, canonicals, hreflang,
legacy routing, the metadata system, the doctor/service/country/blog/lab templates,
structured data, internal linking, images and automated regression coverage.

**Headline: the shared infrastructure is in good shape and no systemic defect with
demonstrated current search impact exists.** Eleven of fifteen audited systems pass on
current production evidence. The four that do not are latent risks and polish, not
losses — they are listed in §5 as `SEO-FOUNDATION-001-A` … `-E` and ranked below.

#### Completion matrix

| System | Status | Classification | Scope | Search/indexation impact |
| --- | --- | --- | --- | --- |
| Robots / indexing directives | **PASS** | NO MATERIAL DEFECT | global | Served robots.txt matches `app/robots.ts` exactly; portal/auth/API disallowed and additionally `noindex, nofollow` in-page; AI crawlers explicitly allowed; no legacy-Wix disallow (deliberate) |
| Sitemap | **PASS** | NO MATERIAL DEFECT | 1,906 URLs | 51/51 sampled URLs are 200 / `index, follow` / self-canonical. Per-locale eligibility filters in place for services, doctors, legal, `/health/*` and blog; retired and canonicalised-away slugs excluded |
| Canonicals | **PASS** | NO MATERIAL DEFECT | all templates | Self-canonical everywhere sampled, including non-default locales; query strings, trailing slashes, apex/`http` hosts and case variants all resolve to one form |
| Hreflang | **PARTIAL** | TECHNICAL | 7 URLs | `SEO-FOUNDATION-001-C`. Within-market clusters are complete and reciprocal (verified on services, doctors, lab tests, legal and the 33-URL cross-market tool cluster); only the `/` ↔ country-home seam is inconsistent |
| Legacy routing | **PASS** | NO MATERIAL DEFECT | 276 rules | Every legacy family still drawing impressions was re-probed and 308s in **one hop** to a 200 indexable target: `/online-prescriptions/*` (491 impr), `/cs/ireland-partner-clinic/*` (166), `/portugal/medical-certificate-for-driving-license` (132), `/post/*` (309), `/es/home-sp`, `/es/home`, `/home-pt`, `/cs/home-cz`, `/home-rm`, `/ireland-team`, `/home-delivery`, `/blog/{cs-slug}`, `/pt`, `/pt/about` |
| Metadata system | **PASS** | NO MATERIAL DEFECT | all templates | One correct `<title>`, description, OG and Twitter card per page in every locale sampled (en/cs/de/ro/es/pt). Length behaviour is deliberate and already closed (`SEO-METADATA-001`). Separate dead-code note: `SEO-FOUNDATION-001-E` |
| Doctor template | **PASS** | NO MATERIAL DEFECT | 343 URLs | Indexability predicate shared by page, hreflang cluster and sitemap; `Physician` schema carries council registration via `hasCredential`/`memberOf` and **only** where a real registration number exists; localized breadcrumbs; market-correct titles |
| Service templates | **PASS** | NO MATERIAL DEFECT | 642 detail + 57 hub URLs | Own `indexableServiceAlternates` cluster, `noindex, follow` for editorially incomplete rows, `Service`+`Offer`+`MedicalProcedure` schema, localized breadcrumbs, paginated catalogue crawlable (`service-catalog-crawlability.spec.ts`) |
| Country templates | **PASS** | NO MATERIAL DEFECT | 33 URLs | Localized titles/descriptions per market and locale, `MedicalOrganization` with a country-scoped `@id`, `FAQPage`, 85 unique internal links from the Ireland home |
| Blog framework | **PASS** | NO MATERIAL DEFECT | 53 + 1 URLs | One canonical per post; bare `/blog/{slug}` 308s to the country canonical; non-authored locale variants canonicalise to the real-content URL and carry `noindex`; per-locale native slugs drive the hreflang map; `Article` schema with `author`/`reviewedBy` Physician; pagination `noindex, follow`; 1–4 commercial links per post across all six markets |
| Lab/product template | **PARTIAL** | INDEXATION (latent) + STRUCTURED DATA | 84 + 12 URLs | `SEO-FOUNDATION-001-A` (no locale gate) and the already-recorded absent `Product`/`Offer` schema. Content itself is fine — all 14 tests verified genuinely translated |
| Structured data | **PASS** | NO MATERIAL DEFECT | all templates | Disciplined and fail-closed: `AggregateRating` emits nothing unless a real, positive, non-stale first-party snapshot exists; `LocalBusiness`/`MedicalClinic` deliberately **not** used for a virtual provider; specialty wrapped as a named node rather than asserted as an enum; addresses omitted for markets with no premises. Gaps are `Product`/`Offer` on lab pages and the breadcrumb-language item below |
| Internal linking | **PARTIAL** | INTERNAL LINKING | 84 URLs | `SEO-FOUNDATION-001-F`: lab-test detail pages ship **zero** sibling-test and zero service links (40 internal links, all nav/footer plus 2 to the hub), where service detail pages ship 8 sibling links. Separately, visible breadcrumb navigation exists only on `/tools/*` although `BreadcrumbList` JSON-LD is emitted on ~14 templates |
| Images | **PASS** | NO MATERIAL DEFECT | — | Template-level `alt` present on clinician, service and product imagery; decorative layers correctly `alt=""`/`aria-hidden`. No material accessibility or image-search defect found; no cosmetic audit run, by instruction |
| SEO regression tests | **GAP** | REGRESSION COVERAGE | the 1,906-URL artefact | `SEO-FOUNDATION-001-D`. Downstream helpers are well covered; the sitemap and robots route modules themselves are not covered at all |

#### Ranked findings

| Rank | Finding | Indexation risk | Scale | Likely search impact | Confidence | Effort | Regression risk |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `-A` lab-test locale gate + `-D` sitemap regression test | High if it fires, zero today | 84 URLs now, unbounded as tests/markets are added | Low today, high if a untranslated test ships | High | Small | Low |
| 2 | `-B` breadcrumb language | None | ~470 URLs carry an English node, ~390 of them non-English locales | Low | High | Medium (10 call sites) | Low |
| 3 | `-C` `/` ↔ country-home hreflang seam | Low | 7 URLs | None demonstrated | High on the flaw, low on the impact | Small | Medium — touches the site's two highest-value page families |
| 4 | `-F` lab-test sibling/service internal links | None | 84 URLs | Unmeasured | High on the gap | Small | Low, but **blocked** until the 2026-09-08 re-measure |
| 5 | `-E` dead `ROUTE_SEO` catalogue | None | 0 URLs | None | High | Trivial | None |

#### Recommended `SEO-FOUNDATION-002` — smallest high-confidence batch

The audit proposed pairing the lab-test locale-publication gate (`-A`) with the missing
sitemap/robots regression net (`-D`). **On authorization the batch was narrowed to `-D`
only** — see the delivered scope below. The lab-test gate was not implemented and remains
an open latent finding.

### SEO-FOUNDATION-002 — implemented, 2026-08-13

**Status: IMPLEMENTED · VERIFIED LOCALLY.** Not verified by a production check — this
batch has nothing to check in production, because it changed no production SEO behaviour.

**Scope delivered.** Regression coverage for the two shared SEO route artefacts, and
nothing else:

| File | Content |
| --- | --- |
| `frontend/tests/unit/seo/sitemap.test.ts` | 22 tests over `app/sitemap.ts`, driven entirely by fixtures — no backend or DB |
| `frontend/tests/unit/seo/robots.test.ts` | 7 tests over `app/robots.ts` |

**No production SEO behaviour changed.** `app/sitemap.ts`, `app/robots.ts` and every
helper they call are byte-identical; the batch adds two test files and nothing else. No
refactor or extraction was needed to make either module testable. Only the data fetchers
are mocked, so the real decision helpers (`publication-validation`,
`landing-locale-eligibility`, `health-service-canonical`, `exactLocalesForLegalType`,
`country-features`, `hreflang`, `newest-timestamp`) execute under test.

All four regressions `sitemap.ts` documents in its own comments now have a named test
rather than a happy-path URL count:

- **24 empty Spain service URLs** — a locale whose merged record fell back to the market
  default with an empty body is not submitted, while its real locale is.
- **79 unsubmitted legal locale variants** — every legal locale with its own exact-locale
  row *is* submitted; a locale that would serve the fallback body is not.
- **16 redirecting blog URLs** — a country-assigned post is absent from the bare
  `/blog/{slug}` and present under its country/locale canonicals.
- **14 withheld Ireland doctors** — doctors are read from the per-market endpoint, and a
  doctor whose editorial checklist is not ready is excluded.

Also pinned: production origin on every URL, bare-origin root with no trailing slash, no
duplicate URLs, self-referencing hreflang clusters, country-root exclusion, retired and
canonical-alias `/health/` exclusion, landing-page locale eligibility, feature-gated hub
routes, and the load-bearing `lastmod` rule — **no emitted `lastModified` may be build
time**, hubs date from their own children, and code-resident pages stay undated.

Deliberately **not** asserted: a fixed total URL count. Content totals change
legitimately; the audit's 1,906 is a snapshot, not an invariant.

**Validation.** New files 29/29 pass. Full frontend unit suite 835/837; the two failures
are pre-existing and unrelated (`lib/content/booking-address-copy.test.ts`,
`tests/unit/portal-breadcrumb-routes.test.ts`) — they fail identically without this
batch, which touches no source file. `tsc --noEmit` clean, `eslint` clean. Mutation-
checked: reverting the blog country-assignment filter and the retired-`/health/` filter
in `sitemap.ts` fails exactly the two tests that cover them.

**Policy question raised, not decided.** `app/robots.ts` disallows `/api/`, which also
covers `/api/og` — the OG image endpoint (`lib/seo/og-image.ts`). Crawlers that honour
robots.txt for image fetches (Twitterbot, facebookexternalhit) may therefore skip social
preview images. The tests pin the current policy as-is; changing it is a separate
decision, not part of this batch.

**Still open after this batch:** `-A` lab-test locale-publication gate (latent, frozen
with the rest of the lab cluster until ~2026-09-08), `-F` lab-test internal links
(frozen to the same date), `-B` breadcrumb localization, `-C` root/country hreflang seam,
`-E` dead `ROUTE_SEO` cleanup.

### SEO-FOUNDATION-003 — root ↔ country-home hreflang architecture, investigated 2026-08-13

**Investigation only. No hreflang output changed, nothing deployed.** Scope: `/` and the
six default-locale country homes. Advances `SEO-FOUNDATION-001-C`; closes nothing else.

**What `/` actually is.** A country/language entry gate at ONE URL, content-negotiated
server-side (`getSelectedLocale`: signed-in preference → `gh_locale` cookie / `x-gh-locale`
→ `Accept-Language` → `en`). Verified live: the same URL returns `<html lang>` and a
translated `<title>` for `en`, `pt`, `cs`, `ro`, `es` **and `de`**, falling back to English
for anything else (`fr` → English). It is not a market landing page: 45 KB against
645–708 KB, 14 internal links against 121–134, no `FAQPage`, no `Organization`, no service
or price content. Its GSC queries are ~entirely brand ("global health ireland", "global
health online", "my global health"). It is a **selector / navigation gateway with
brand-level global content** — not an alternate version of any country homepage.

**Live graph (Googlebot UA, 2026-08-13).** `/` emits six `{defaultLang}-{REGION}` rows,
one per market, plus `x-default → /`. Every default-locale country home emits its own
within-market cluster (`{lang}-{REGION}` for each supported locale), `x-default → itself`,
**plus one language-only row pointing back at `/`** — `en → /`, `cs → /`, `es → /`,
`ro → /`, and `pt → /` from **both** `/portugal/pt` and `/brazil/pt`. Non-default locale
variants (`/ireland/cs`, `/czechia/de`, …) emit no return link, all 200, self-canonical,
`index, follow`.

**Findings.**

1. **One URL declared as five languages.** Six pages each tag `/` with a different
   language-only code, while `/` tags itself `x-default`. A single URL cannot be the
   `en`, `cs`, `pt`, `es` and `ro` version simultaneously, so at most one of those five
   claims can be true and the annotation set is internally inconsistent. How Google
   resolves an inconsistent set is not documented precisely and is not asserted here —
   the defect is that the site is making claims it cannot all mean. This, not the
   duplicate `pt`, is the core finding.

   Note for the record: Google's documented model **does** permit a language-selector
   page to act as `x-default`. Nothing here says otherwise. The fix chosen below is
   driven by MyGlobalHealth's actual page architecture — six coherent market-specific
   locale clusters that are worth preserving — not by any claim that a selector page is
   ineligible for that role.
2. **Duplicate generic `pt`.** `/portugal/pt` and `/brazil/pt` both claim `pt → /`. Two
   pages in two different clusters assert the same tag for the same target.
3. **Semantically wrong alternate.** Because `/` is a selector rather than a market
   homepage, the country homes and `/` are not alternate versions of one another. The
   relationship should not exist, so the fix is removal, not repair.
4. **x-default overlap.** `/`'s return links transitively merge the six per-market
   clusters into one graph carrying **seven** `x-default` claims.
5. **Reciprocity is NOT the problem.** All six `/` ↔ default-home pairs are bidirectional
   today. Nothing is missing; the wrong things are present.
6. **Portuguese.** `pt-PT → /portugal/pt` and `pt-BR → /brazil/pt` are correct and should
   stay. Generic `pt` has no defensible target: `/` serves identical Portuguese copy to
   PT and BR visitors and is market-neutral, so it is not "the Portuguese version" of
   either market. `pt-PT` + `pt-BR` already cover the language; generic `pt` should not
   exist at all. The same reasoning voids generic `en`/`cs`/`es`/`ro`. Note the
   asymmetry that exposes the rule: `/` also serves German, yet no page claims `de → /`,
   because no market's default locale is German.

**Google evidence (GSC, latest complete date 2026-08-09; URL Inspection 2026-08-13).**
All seven pages `PASS` / "Submitted and indexed", `googleCanonical == userCanonical`,
crawled within the last three days. **No canonical divergence, no indexing damage, no
wrong-language homepage indexed.** `/` draws impressions from IE (110, pos 4.4), BR (78),
AE (71), RO (32), CZ (12), PT (7) — healthy multi-market brand demand, not
cannibalization. The one fragmentation signal is "global health ireland" (12 clicks,
pos 3.7, 54% CTR) served by `/` rather than `/ireland/en`, which is a brand query landing
on the brand root and not a loss.

**Classification: C — SEMANTIC / ARCHITECTURE DEFECT.** The tags parse; what they assert
is untrue. Not A (five conflicting language claims on one URL is a real defect, not merely
unconventional). Not D (code plus live behaviour fully determine what `/` is — no business
decision is required to remove a false claim).

### SEO-FOUNDATION-004 — CLOSED, VERIFIED BY PRODUCTION CHECK, 2026-08-12

**Status: CLOSED — VERIFIED BY PRODUCTION CHECK.** This is an architecture-correctness
fix, **not** a response to any demonstrated ranking loss: `SEO-FOUNDATION-003` found no
indexing damage before implementation and `/` remained the site's top page throughout.

**Deployment.** Railway project *Global Health*. The **Production** environment deploys
**Frontend and Backend from `main`** (Development deploys from `Dev-hassaan`). The push of
`cf2e8356` to `main` auto-triggered the deploy — no manual deployment was needed and none
was triggered. Production Frontend `cf2e8356` SUCCESS at **2026-08-12T20:15:48Z**, Backend
`cf2e8356` SUCCESS at 20:15:49Z. Verification ran against that revision from 20:19Z.

**Production result — eight pages, Googlebot UA, all HTTP 200, zero redirects.**

| URL | hreflang emitted | canonical | robots |
| --- | --- | --- | --- |
| `/` | **none** | `https://www.myglobalhealth.online` (bare origin) | index, follow |
| `/ireland/en` | `en-IE` `cs-IE` `de-IE` `es-IE` `pt-IE` `ro-IE` + `x-default → /ireland/en` | self | index, follow |
| `/ireland/cs` | identical Ireland cluster | self | index, follow |
| `/czechia/cs` | `cs-CZ` `de-CZ` `en-CZ` `es-CZ` `pt-CZ` `ro-CZ` + `x-default → /czechia/cs` | self | index, follow |
| `/portugal/pt` | `pt-PT` `cs-PT` `de-PT` `en-PT` `es-PT` `ro-PT` + `x-default → /portugal/pt` | self | index, follow |
| `/spain/es` | `es-ES` `cs-ES` `de-ES` `en-ES` `pt-ES` `ro-ES` + `x-default → /spain/es` | self | index, follow |
| `/brazil/pt` | `pt-BR` `en-BR` `es-BR` + `x-default → /brazil/pt` | self | index, follow |
| `/romania/ro` | `ro-RO` `cs-RO` `de-RO` `en-RO` `es-RO` `pt-RO` + `x-default → /romania/ro` | self | index, follow |

Confirmed on production: **no bare `pt` on `/portugal/pt` or `/brazil/pt`, no bare `en` on
`/ireland/en`, no bare `cs`/`es`/`ro`** on Czechia/Spain/Romania; no language-only key
anywhere; no hreflang target outside its own market; Portugal (`pt-PT`) and Brazil
(`pt-BR`) fully disjoint. `/ireland/cs` participates normally in the Ireland cluster.

**Unchanged, re-verified in production.** Locale negotiation on `/` still returns
`en`/`pt`/`cs`/`ro`/`es`/`de` per `Accept-Language` with an English fallback, and emits
zero alternates in every one of those renders. The gate still links all six markets in the
page body. Titles and canonicals on all seven pre-change captures are byte-identical
before vs after; H1s unchanged. `robots.txt` byte-identical to the pinned policy. Sitemap
200, 1,900 `<loc>` entries, all eight URLs present exactly once; its `xhtml:link` blocks
match the page-level clusters exactly and the `/` entry carries no alternates.

**Not claimed:** that Google has reprocessed the hreflang graph. Production verification
and Google recrawl/reprocessing are separate states. No reindexing was requested — an
hreflang change alone does not warrant it.

**What changed.** The global entry gate is decoupled from the market hreflang clusters.

| File | Change |
| --- | --- |
| `frontend/app/(global)/page.tsx` | `generateMetadata` no longer builds or passes `alternates.languages`; the per-market row loop and its `getPublicCountriesMerged` call are gone |
| `frontend/app/[country]/[lang]/page.tsx` | the default-locale-only `languages[defaultLocale] = "/"` return link is removed (it was the only emitter of it repo-wide) |
| `frontend/tests/unit/seo/home-hreflang.test.ts` | new, 10 tests |
| `frontend/tests/unit/seo/sitemap.test.ts` | untouched |
| `frontend/vitest.config.ts` + `frontend/tests/stubs/server-only.ts` | alias `server-only` to an empty module so a unit test can import a server page module |

`lib/seo/hreflang.ts` is unchanged — the whole fix sits at the two emitters.

**Before → after (verified on a local server against the production API):**

- `/` — was `x-default → /` plus six `{defaultLang}-{REGION}` market rows; now emits **no
  hreflang alternates at all**.
- `/portugal/pt` — was `pt → /` plus its Portugal cluster; now the Portugal cluster only
  (`pt-PT`, `cs-PT`, `de-PT`, `en-PT`, `es-PT`, `ro-PT`, `x-default → /portugal/pt`).
- `/ireland/en` — was `en → /` plus its Ireland cluster; now the Ireland cluster only.
- Same removal on `/czechia/cs` (`cs`), `/spain/es` (`es`), `/romania/ro` (`ro`),
  `/brazil/pt` (`pt`).
- `/ireland/cs` and every other non-default locale variant: unchanged, as they never
  carried the return link.

**Unchanged and re-verified:** every canonical (`/` still the bare origin with no trailing
slash), `index, follow` on all eight pages checked, locale negotiation on `/`, and the
gate's body navigation — all six market links still render.

**Validation.** New file 10/10; the SEO suite 39/39; full frontend unit suite 845/847 with
the same two pre-existing unrelated failures (`booking-address-copy`,
`portal-breadcrumb-routes`). `tsc --noEmit` clean, `eslint` clean. Mutation-checked:
restoring the return link fails 5 of the 10 new tests. Rendered metadata inspected on a
local Next server for `/`, `/ireland/en`, `/ireland/cs`, `/portugal/pt`, `/brazil/pt`,
`/czechia/cs`, `/spain/es`, `/romania/ro`.

**Deliberately not enforced by the tests:** any rule that a URL may never carry the same
hreflang value in more than one cluster. `pt-IE`, `pt-CZ`, `pt-PT` and `pt-BR` are all
legitimate and all distinct. Only the invariants this architecture actually requires are
pinned.

#### Original proposal (kept for the record)

Smallest change that removes every finding above:

- **`/`** — emit no `alternates.languages` at all. It belongs to no cluster because it is
  an alternate of nothing. Its six market links stay in the page body, where they already
  are.
- **Country homes** — delete the language-only return link. Each market keeps exactly the
  cluster it has today: `{lang}-{REGION}` for its supported locales, `x-default` → its own
  default-locale home. Six clean, fully reciprocal, non-overlapping clusters.
- **Unchanged:** `pt-PT`/`pt-BR` separation, every non-home route, `lib/seo/hreflang.ts`.

Code: `frontend/app/[country]/[lang]/page.tsx:120` (the only emitter of the return link,
repo-wide) and `frontend/app/(global)/page.tsx:30-37`. Tests: extend
`frontend/tests/unit/seo/` — no country-home cluster may contain a language-only key; no
two pages may claim the same hreflang tag for the same URL; exactly one `x-default` per
cluster, pointing inside that cluster.

Before: `/portugal/pt` → `pt → /`; `/brazil/pt` → `pt → /`; `/ireland/en` → `en → /`;
`/` → `x-default → /` + six market rows.
After: no page emits a language-only row; `/` emits no alternates; `/portugal/pt` keeps
`pt-PT → /portugal/pt` … `x-default → /portugal/pt`.

**Alternative requiring a product decision (not recommended now):** make `/` the single
global `x-default` in the textbook selector pattern. That is only fully reciprocal as the
complete 34-URL country × locale cross-product, all 34 pages emitting the same 35-row map,
and it removes each market's own `x-default`. Bigger diff, and it changes what an unmatched
visitor falls back to (the gate instead of the market home). Raise it only if the business
wants `/` to be the universal fallback in search as well as in navigation.

#### Explicitly ruled out this pass (false positives / expected behaviour)

- Soft-404s, crawl traps, indexable auth/account/admin routes, case-variant or
  trailing-slash duplicates, apex/`http` host duplication — none exist.
- Redirect chains — every probed legacy family is a single 308.
- Fallback-locale indexation leakage — legal and blog fallbacks are `noindex` **and**
  removed from their own hreflang clusters.
- Missing/duplicate H1 — one `<h1>` per page on every template sampled.
- Title/description length — closed (`SEO-METADATA-001`), not reopened.
- Missing translations — services, doctors, lab tests, blog, about and contact all serve
  genuine per-locale copy, not English fallback, on every locale sampled.
- `FAQPage` emitted broadly — eligible and useful for AI-search citation; not a policy
  violation and not a defect.

### SEO-FOUNDATION-005 — BreadcrumbList localization & consistency — CLOSED, VERIFIED BY PRODUCTION CHECK, 2026-08-13

Closes `SEO-FOUNDATION-001-B`. Narrow shared-template fix: `BreadcrumbList` JSON-LD `name`
values now read from the site's existing locale dictionaries instead of being hardcoded
English literals. No URL, canonical, hreflang, robots/indexability, title, description or
visible page content changed.

**Root cause.** The shared builder `breadcrumbJsonLd()` (`lib/seo/structured-data.ts`) is a
pure passthrough — it never carried the defect. Every one of the ~19 call sites across the
public route tree built its own `{ name, url }` array inline, and most literally wrote
`"Home"`, `"Doctors"`, `"Lab tests"`, `"Online GP consultation"`, `"See a specialist"`,
`"Book"`, `"Repeat prescription request"` as English string literals, and passed the
country's English-only `config.name` for the country crumb — regardless of the page's own
locale. Three templates (`about`, `tools/[slug]`, `doctor-profile` partially) had already
solved this correctly via `getCommonLocale(locale).countryNames?.[code] ?? config.name`;
every other template had not.

**Fix.** Every hardcoded English breadcrumb-name literal now reads the corresponding
existing key from the locale bundle already loaded on that page (`c.navigation.home`,
`.doctors`, `.blog`, `.about`, `.contact`, `.generalConsultation`, `.specialistConsultation`,
`.bookShort`, `.repeatPrescription`, `c.testsPage.watermark` for "Lab tests") — no new
translation strings were invented, all were already authored and translated in all 6
locales (`locales/{en,cs,de,es,pt,ro}/common.json`) but simply unused by these call sites.
Every country crumb now reads `c.countryNames?.[code] ?? config.name`, the same fallback
pattern `about`/`tools` already used — never a bare `config.name`.

**Deliberately NOT changed:** `config.name` / `routeCountryName` usages that feed *visible*
copy (hero titles, PageHero country labels, "Registered in {country}" pills) were left
exactly as they were. Where a page's existing breadcrumb-adjacent variable was also used
for visible content (`doctor-profile-page.tsx`'s `routeCountryName`, `contact/page.tsx`'s
hero `config.name`), a separate `breadcrumbCountryName`/`common` value was introduced
scoped only to the JSON-LD call, so no visible text on any page changed as a side effect.

**Affected files (16 emitters, all in `frontend/`):**
`app/[country]/[lang]/page.tsx`, `doctors/page.tsx`, `tests/page.tsx`,
`tests/[testSlug]/page.tsx`, `specialist-consultation/page.tsx`,
`general-consultation/page.tsx`, `prescriptions/page.tsx`, `book/page.tsx`,
`legal/page.tsx`, `contact/page.tsx`, `health/[slug]/page.tsx`,
`services/[serviceSlug]/page.tsx`; `app/(global)/about/page.tsx`, `app/(global)/page.tsx`;
`lib/content/blog-post-page.tsx`, `lib/content/blog-index-page.tsx`,
`lib/content/doctor-profile-page.tsx`. `about/page.tsx` and `tools/[slug]` needed no change
(already correct). `lib/seo/structured-data.ts` (`breadcrumbJsonLd`) untouched.

**Hierarchy audit (§6/§9 of the ticket).** Compared each template's structured-data trail
against its visible UI: `components/layout/Breadcrumbs.tsx` (the generic visible-trail
component) is **dead code** — zero import sites in the repo, confirmed by repo-wide grep.
The only visible breadcrumb-style UI on the public site is `tools/[slug]`'s own local
component (already locale-correct) and a single "back" link on `services/[serviceSlug]` and
blog posts (labels already sourced from the same dict values now feeding the JSON-LD). No
existing visible trail contradicted a structured-data trail, so no hierarchy shape changed
— only the `name` strings. `services/[serviceSlug]` and `health/[slug]` keep their existing
2-node trails (no "Home" node) unchanged; this is pre-existing template behaviour, not
something this ticket's scope covers changing.

**Blog classification (§7): Option A — existing hierarchy is semantically correct.**
`blog-post-page.tsx` / `blog-index-page.tsx` keep `Home / Blog [/ Post]` with no country
node, even under `/[country]/[lang]/blog/...`. Reasoning: no visible breadcrumb exists on
either blog template to disagree with; blog navigation is not presented anywhere on the site
as a child of a country hub (the "back to blog" link and nav item are both flat, country-
agnostic); and the country-scoped blog URL exists for locale/hreflang routing, not as a
navigable hierarchy level. Adding a synthetic country crumb would assert a page
(`/{country}/{lang}/blog`) as an intermediate hierarchy node the site's own navigation never
presents as one — exactly what §6 says not to do. Only the `Home`/`Blog` names were
localized (`c.navigation.home` / `c.navigation.blog`), not the structure.

**Representative before/after JSON-LD (all locale strings verified directly against the
`locales/{locale}/common.json` source, see `lib/i18n/breadcrumb-locale.test.ts`):**

`/czechia/cs/doctors` —
before: `[{"name":"Home",...},{"name":"Czechia",...},{"name":"Doctors",...}]`
after: `[{"name":"Domů",...},{"name":"Česko",...},{"name":"Lékaři",...}]`

`/ireland/cs/lab-tests/general-health-test` (country crumb + hub crumb only — title crumb
was already the DB-localized test title) —
before: `[...,{"name":"Ireland",...},{"name":"Lab tests",...},{"name":"Všeobecný zdravotní test",...}]`
after: `[...,{"name":"Irsko",...},{"name":"Laboratorní testy",...},{"name":"Všeobecný zdravotní test",...}]`

`/blog` (bare index, `ro` locale) —
before: `[{"name":"Home",...},{"name":"Blog",...}]`
after: `[{"name":"Acasă",...},{"name":"Blog",...}]` (unchanged structure, per §7 classification A)

**Tests.** `lib/seo/structured-data.test.ts` — added `breadcrumbJsonLd` coverage (sequential
`position`, absolute-URL resolution, passthrough of already-absolute URLs). New
`lib/i18n/breadcrumb-locale.test.ts` (39 assertions) — pins the exact translated string
every call site now reads, across cs/pt/es/ro/de/en, for the representative pages the ticket
named (Czech country home/doctors/GP hub, non-English lab detail, pt/es/ro/de pages, English
control, blog); a country-names sub-suite (`countryNames["cz"|"ro"|"ie"]` across all 6
locales); and an explicit mutation guard asserting the Czech translations differ from the
previously-hardcoded English literals (`"Home"`, `"Doctors"`, `"Lab tests"`,
`"Online GP consultation"`) — this is what would fail if a call site regressed back to a
hardcoded string. Chose dictionary-level tests over full-page render snapshots (§9 guidance)
because every call site is a thin, statically-typed lookup into the same dictionaries these
tests pin directly — a full-page render test would mock away the DB/backend layer these
pages depend on without adding coverage over the actual defect (the hardcoded string).

**Local verification.** `npx tsc --noEmit` — clean. `npx eslint` on all 19 changed/added
files — clean, zero warnings. `npx vitest run` (full suite) — 874/876 passing; the 2
failures (`tests/unit/portal-breadcrumb-routes.test.ts`, a doctor/admin-portal breadcrumb
route-table test unrelated to public-site JSON-LD; `lib/content/booking-address-copy.test.ts`,
Brazil-address-field copy) are in files this batch did not touch and pre-exist it. New tests:
39/39 passing (`structured-data.test.ts` breadcrumb cases + `breadcrumb-locale.test.ts`).
**Production deployment & verification (2026-08-13, `SEO-FOUNDATION-005` deploy ticket).**
`main` was already at `6d5733bc` (`origin/Dev-hassaan == origin/main`, no merge/push needed
— a prior session had already fast-forwarded it). Railway Production Frontend + Backend both
built and deployed commit `6d5733bc` (deployment created `2026-08-12T20:59:24Z`, polled to
`SUCCESS` on both services 2026-08-13 before any live check). Postgres unaffected (no schema
change in this batch).

Fetched live HTML (server-rendered, not client-hydrated) and parsed the `BreadcrumbList`
JSON-LD directly for 11 representative URLs:

| URL | Locale | Breadcrumb names (position order) |
|---|---|---|
| `/czechia/cs` | cs (country default) | Domů → Česko |
| `/czechia/cs/doctors` | cs | Domů → Česko → Lékaři |
| `/czechia/cs/gp-consultation-online` | cs | Domů → Česko → Konzultace s praktickým lékařem |
| `/ireland/cs/lab-tests/general-health-test` | cs (secondary) | Domů → Irsko → Laboratorní testy → Všeobecný zdravotní test |
| `/portugal/pt/doctors` | pt | Início → Portugal → Médicos |
| `/spain/es/doctors` | es | Inicio → España → Médicos |
| `/romania/ro/gp-consultation-online` | ro | Acasă → România → Consultație de medicină generală |
| `/ireland/de/doctors` | de (secondary — Ireland's default locale is `en`) | Startseite → Irland → Ärzte |
| `/ireland/en/doctors` | en (control) | Home → Ireland → Doctors (unchanged baseline) |
| `/ireland/en/blog/illness-benefit-ireland-how-to-claim` | en | Home → Blog → *(full localized post title)* |
| `/ireland/cs/blog/illness-benefit-irsko-jak-zazadat` | cs | Domů → Blog → *(full localized post title)* |

All 11: `@type: BreadcrumbList`, sequential `position` 1…N, every `item` an absolute
`https://www.myglobalhealth.online/...` URL matching the page's own canonical prefix, no
English fallback where a real translation exists (the `de`/`cs` secondary-locale cases above
are the direct proof — Ireland's and Czechia's-as-secondary-market pages localize correctly,
not just each country's own default locale). Blog hierarchy on both `en` and `cs` posts
confirmed **Option A**: `Home / Blog / Post`, no country node inserted, matching the
approved §7 classification — not reassessed, not changed.

Regression spot check, same 11 fetches: every page `HTTP 200`, `robots: index, follow`,
self-`canonical` unchanged, 7-entry `hrefLang` cluster present and unchanged on every
country/service page (bare `/czechia/cs` and the blog posts correctly carry no hreflang
cluster change from this batch — that surface is owned by `SEO-FOUNDATION-004`/blog
pagination and was not touched here), `<title>`/`<h1>` read as pre-existing content, not
new copy. No Google Rich Results / third-party schema validator was invoked — not wired
into the toolchain, and manual JSON-LD parsing already confirms structural correctness
(§5) without turning this into a broader schema audit.

**No ranking or CTR improvement is claimed.** Google has not necessarily reprocessed these
pages' rich-result presentation yet — that is a recrawl matter, not something this check
can observe or accelerate.

**Excluded per ticket §10/§2:** homepage hreflang (`-C`, closed), sitemap/robots policy, the
lab locale gate (`-A`) and lab internal links (`-F`, both frozen until 2026-09-08), lab
`Product`/`Offer` schema, the dead `ROUTE_SEO` catalogue (`-E`), titles/descriptions, country
keyword/content optimization, service/doctor copy. **Code: deployed to Production (`6d5733bc`)
and verified live, 2026-08-13.**

### NOW — one batch

**GLOBAL FOUNDATION. `SEO-FOUNDATION-001` is complete (this document).
`SEO-FOUNDATION-002` is implemented, verified locally and pushed to `origin/Dev-hassaan`
(`9c213b71`) — regression coverage only, no production SEO behaviour changed, not deployed.
`SEO-FOUNDATION-003` (investigation of `-C`) is complete: classification **C**.
`SEO-FOUNDATION-004` is **deployed (`cf2e8356`, 2026-08-12T20:15Z) and verified in
production** — the global gate is decoupled from the market hreflang clusters, with
canonicals, indexability, locale negotiation and navigation unchanged — so `-C` is closed.
`SEO-FOUNDATION-005` (BreadcrumbList localization, closing `-B`) is **deployed (`6d5733bc`,
Production Frontend + Backend, both `SUCCESS`) and verified in production, 2026-08-13.**
Nothing else in the foundation programme is now awaiting a deploy. Remaining findings: `-A`
(lab locale gate) and `-F` (lab internal links) stay frozen until the 2026-09-08
`SEO-GROWTH-016` re-measure; `-E` (dead `ROUTE_SEO` catalogue) is maintenance-only.
**GLOBAL SEO FOUNDATION — VERIFIED / MONITOR EXCEPTIONS**: every foundation defect that was
actionable now (`-B`, `-C`) is closed and production-verified; the three remaining rows are
each a deliberate, dated exception (`-A`/`-F` frozen for the lab-cluster measurement window,
`-E` a zero-impact maintenance note), not open implementation work.**

The old roadmap of isolated `SEO-GROWTH-*` tickets is superseded. The programme is:
**NOW** global foundation → **NEXT** only the systemic defects this audit confirmed →
**AFTER** the country waves below → **MONITOR** everything waiting on Google.

**Still running underneath it: WAIT / MEASURE — SEO-GROWTH-016 re-measure, due
2026-09-08.** That item is now a MONITOR row, not the NOW batch, but its embargo is
unchanged: do not rewrite, re-title or re-structure the Ireland lab-test cluster before
the re-measure. The indexing ramp is the dominant explanation and the cluster changed state seven days
ago. Every detail page has one week of ranking history; the hub→detail hand-off is still
in progress; cluster position improved on each of the last three days. Rewriting,
re-titling or re-structuring anything now would destroy the only clean measurement
window this cluster will ever have, and would be optimising against positions that are
still moving.

Re-measure on **2026-09-08**, which gives a full 28-day window (2026-08-12 → 09-08) in
which every detail page has been indexed throughout. Pull the same per-page and
`query`×`page` reports, then compare against the tables in §1–§2 above.

Act early only on these triggers:

| Trigger | Then |
| --- | --- |
| A detail page stabilises at position 8–15 on an Ireland-modified query with real impressions and still zero clicks | Snippet/CTR work on that one page |
| The gut or cholesterol page stalls at position 20–30 for two consecutive weeks | Re-open with the format/schema questions, not with a copy rewrite |
| Impressions collapse or pages fall out of the index | Technical, treat as an incident |
| Nothing changes materially | `Product`/`Offer` schema becomes the candidate batch (§8) — it is the only confirmed-missing, data-backed asset |

**Flagged separately, deliberately not bundled into this batch: the hub's €89 price is
wrong.** Its meta description advertises "from €89" and its FAQ answers a question about
"the €89" when the real entry price is €57 and no product costs €89; the same description
claims "results in up to 10 days" while the catalogue contains 4–6 week tests. This is a
customer-facing factual error about price and turnaround, not an SEO optimisation, and it
should be judged on those grounds. It needs explicit authorization as its own small
correctness fix; it is **not** the recommended SEO batch and should not be used as a
pretext to re-open the cluster's content.

Branch state (re-checked 2026-08-12 during `SEO-FOUNDATION-001`): `Dev-hassaan` is
**one commit ahead of `origin/Dev-hassaan`** — `26d5028c`, the `SEO-RESET-001` /
`SEO-GROWTH-016` rebaseline of this file, is committed locally and **not pushed**.
`origin/main` and `origin/Dev-hassaan` are both at `8d28b85e` and identical.
SEO-GROWTH-015 and TRUST-METRIC-001 landed in `013a198f`/`edcfe868` and are pushed.
The working tree also holds unrelated in-progress blog-UI work by a concurrent session
(`BlogCard.tsx`, `blog-index-page.tsx`, `blog-post-page.tsx`, `scope-blog-html.ts` and
its test, plus two untracked `backend/scripts/` probes) — **left untouched.**

### NEXT — up to four, evidence-backed

1. **`/ireland/en/services/referral-and-investigations` — intent-match investigation.**
   345 impressions / 3 clicks / 0.87% CTR / position 17.2, and it ranks **positions
   1–14** for a long list of exact-intent private-referral queries: `how to get a gp
   referral for private treatment` (pos 1), `cardiologist dublin` (3), `diagnostic
   appointment meaning` (6), `gp referrals to specialists` (8), `how long is a doctor
   referral letter valid for` (8), `how to ask for a referral from a doctor` (9),
   `can my gp refer me to a private specialist` (11), `doctor referral letter` (11),
   `gp referral letter ireland` (12), `referral letter online` (14, the page's 1 click).
   The open question is the reverse of the usual one: most of those queries are
   *informational*, and they are landing on a *transactional* service page. Verified
   clean technically (200, `index, follow`, self-canonical, sensible title/meta). Per-
   query impressions are 1–4, so size is unproven — that is the first thing to check.
2. **Portugal driving-licence / atestado cluster — feasibility check before any work.**
   `/portugal/pt/services/certificado-medico-carta-de-conducao` holds 460 impressions
   at position 14.2, but every head query visible in GSC sits deep: `exame medico carta
   condução` (27 impr, pos 44.6), `atestado medico` (20, 52.3), `atestado médico` (22,
   52.8), `atestado médico para carta de condução` (8, 42.3). Only the long tail is
   shallow (`atestado médico para carta de condução online`, pos 11). In Portugal this
   certificate is a regulated, in-person IMT process — **check for a BUSINESS / SERP
   WALL before assuming a content fix exists.**
3. **Czechia coverage.** Best CTR of any market (4.76%) on the smallest base, and the
   two Czech service pages that rank convert hard (`muzske-zdravi-online` 22.2% at pos
   2.2). No single cluster is yet big enough to be a batch; revisit if Czech commercial
   impressions grow.
4. **`Product` / `Offer` schema for the Ireland lab-test cluster** — promoted into NEXT
   by SEO-GROWTH-016 §8. Seventeen pages carry real prices, currency, availability,
   sample type and turnaround as visible content and expose none of it as structured
   data. Held behind the 2026-09-08 re-measure so it is not implemented against
   still-moving rankings. **Distinct from `AggregateRating`, which stays permanently
   closed** (SEO-GROWTH-015) — this is MGH's own first-party commercial data, not
   another site's reviews.

Dropped from NEXT this pass: *"Ireland lab-test cluster, other locales."* Only the `en`
cluster earns impressions, and SEO-GROWTH-016 found the `en` bottleneck to be the
indexing ramp — replicating anything into five more locales before the `en` pages have
settled would multiply an unmeasured guess.

**Removed from NEXT this pass — the homepage query-mix investigation.** It was NEXT-1
and is now demoted on fresh evidence, not deferred for lack of time. `/` draws 1,962
impressions / 146 clicks / 7.44% CTR / position 18.4 — the highest CTR of any material
page on the site. Its query mix, pulled directly (`page equals /`, current window), is
essentially all brand and brand-collision: `global health ireland` (12 clicks, 54.5%
CTR), `global health online` (8, 12.1%), `my global health` (7, 12.5%), `global health`
(5 clicks, 137 impr, pos 26.4), plus a zero-click tail of other organisations' names
(`global health care` 64 impr pos 45.0, `clinic global health ms clinic /#/ auth login`
59 impr pos 7.1, `centre for online health`, `doctors for global health`). There is no
commercial query cluster on the homepage to optimise, and the 7.44% CTR is not a CTR
problem. The **product** question the old entry bundled in — whether a country-selection
interstitial is the right destination for brand search — is unchanged and stays in
MANUAL. See DEFERRED.

This ranking is not fixed. If a future OpenSEO/GSC refresh surfaces something with
stronger evidence, it can outrank any of the above — do not carry this order forward by
default.

### AFTER GLOBAL FOUNDATION — country waves

Country-by-country optimisation starts only once the global foundation work above is
closed or explicitly waived. Wave order is set by current organic base, evidence quality
and the presence of a real commercial cluster, not by market size.

| Wave | Markets | Why this pairing | Entry condition |
| --- | --- | --- | --- |
| **COUNTRY-WAVE-001** | **Ireland + Czechia** | Ireland is the largest base (189 clicks / 6,114 impr) with the most page-level evidence already gathered; Czechia has the best CTR of any market (4.76%) on the smallest base, so incremental coverage converts hardest there | Global foundation closed **and** the SEO-GROWTH-016 re-measure done (2026-09-08). Ireland's lab cluster stays embargoed until then |
| **COUNTRY-WAVE-002** | **Portugal + Spain** | Portugal has a real but feasibility-doubtful cluster (atestado/carta de condução — head terms at 42–53, regulated in-person IMT process); Spain is a confirmed SERP/business wall (SEO-GROWTH-013). Both need a feasibility gate **before** any content work | Wave 1 measured. Run the Portugal feasibility check (NEXT-2) as the wave's first task, not after committing to it |
| **COUNTRY-WAVE-003** | **Brazil + Romania** | Smallest bases, good positions, almost no clicks — informational tool/blog traffic with no commercial page behind it in either market. Needs a commercial-page decision before an SEO batch is meaningful | Wave 2 measured, and a commercial page exists to rank |

Do not start a wave by re-running the full crawl. Each wave opens with a focused
OpenSEO/GSC pull for its two markets plus live production checks, per §0.

### MONITOR — waiting on Google or on data

Everything in §6, on the 2–3 week cadence stated there. Plus:

- **Ireland sick-cert cluster — MONITOR / MEASURE, not a work item.** Reconciled
  2026-08-12 against the completed SEO-GROWTH-008 series; do not reopen without a new
  specific defect. Current state, each point production-verified this pass:
  - Redirects corrected (SEO-GROWTH-008, live-checked in §6).
  - Intent investigation concluded **SUPPORTIVE CLUSTER** — the blog article and the
    service page serve different intent; no genuine current-page cannibalization was
    confirmed. Not an open problem.
  - Blog → service internal linking is **already in place**: the live article contains
    four links to `/ireland/en/services/sick-certificate-ireland` (three relative,
    one absolute), including contextual in-body linking — verified live 2026-08-12.
    The original audit undercounted this.
  - Service title/meta reviewed against six recurring page-1 competitors
    (SEO-GROWTH-008D): intent-clear, names Ireland explicitly, states IMC
    registration, same-day service, employer/college usage and €45 price — judged at
    least as informative as the competition. **No title/meta rewrite recommended.**
  - The confirmed format gap — a missing visible numbered process — was fixed
    (SEO-GROWTH-008E): a three-step "How it works" block is live.
    **VERIFIED BY PRODUCTION CHECK**, 2026-08-12 (three "How It Works"/step-heading
    matches in raw HTML of `/ireland/en/services/sick-certificate-ireland`).
  - Authority/housekeeping manual actions remain (see §7 MANUAL).
  - The blog's 1,616-impression / 0.68% CTR result is useful monitoring data, not
    on its own justification for another rewrite — no new on-page defect has been
    established. Do not reopen this cluster until fresh query-level evidence
    identifies a specific new problem.
- Czechia's CTR advantage (**4.76%** in the current window, down from 6.39% but still
  the best of any market) on the smallest impression base — watch whether new Czech
  service coverage sustains it.
- **Sitewide CTR and average position** (2.14% / 18.5, from 3.81% / 13.1). Confirmed
  again this pass as the tool/discovery mix shift of SEO-GROWTH-012, not a ranking
  loss; 2026-08-10 and 08-11 already show the same impression volume at positions 17.2
  and 14.7. Do not open metadata work against this number.
- **Desktop vs. mobile divergence** (desktop: more impressions than mobile, 1.68% CTR,
  position 20.7). New observation, no investigation run. Watch whether it persists once
  the tool long tail stabilises before treating it as anything.
- **Ireland lab-test cluster — INDEXING RAMP / WAIT-MEASURE.** Demoted from NOW to
  MONITOR on 2026-08-12 when `SEO-FOUNDATION-001` took the NOW slot; the classification
  and the embargo are unchanged. Re-measure **2026-09-08** with the early-exit
  triggers in §7 SEO-GROWTH-016. Track per-page position and whether the hub→detail
  hand-off completes. Do not rewrite, re-title or re-link anything in the meantime —
  that includes `SEO-FOUNDATION-001-F` (the missing sibling/service links), which is
  recorded but deliberately blocked until this re-measure.
- **Randox as both supplier and competitor.** ~57 Ireland impressions in the current
  window are supplier-brand searches (`randox home test kit`, `randox blood test
  ireland`, …) that MGH ranks for at GSC positions 6–13 with **zero clicks** and which
  are not reproducible on the live SERP. Expected, not an opportunity. Watch only for
  whether Randox's own IE presence displaces MGH on non-brand product terms too.
- **`/spain/en/services/consulta-medica-online`** — the known wrong-locale page has
  grown from 194 impressions / 0 clicks to **518 / 7** at position 23.2. Still not the
  Spain bottleneck (SEO-GROWTH-013 stands), but it is no longer negligible; if it keeps
  growing it becomes a real WRONG LOCALE item rather than a footnote.

### MANUAL — needs a business or operator decision

| Item | Why it is manual |
| --- | --- |
| Publish the Google OAuth consent screen | It is still in Testing, which caps refresh tokens at 7 days. The stated expiry (~2026-08-10) has passed, so the local `claude-seo` scripts may already be dead. OpenSEO MCP authenticates separately and is unaffected — all GSC data in this file came through it. |
| Write real bios for 5 doctors (26 `noindex` URLs) | Clinical/editorial content, correctly gated. See SEO-DOC-002. |
| Legacy Wix referrer outreach | `wix.to` alone holds 195 backlinks to old URLs. Ask high-value external referrers to point at current URLs. **Do not buy or build links for a medical site.** |
| Answer the homepage-destination question | Product call, not an SEO one. The SEO half of the old NEXT-1 is now closed on evidence (see NEXT, "Removed from NEXT this pass"); what remains is purely the product question of whether a country-selection interstitial is the right landing experience for brand search. |
| Decide the lab-kit pricing position against Randox | SEO-GROWTH-016 §7: MGH sells the **same Randox kits** at €254 (gut microbiome) and €129 (genetic haemochromatosis) where Randox sells them direct at €231 and €91, on SERPs where Randox itself ranks — and MGH's own page states results are delivered by Randox. MGH is cheaper on General Health (€57 vs €91) and on cholesterol vs telehealth rivals, so this is product-specific, not blanket. Whether to reprice, bundle the €45 clinician interpretation into the kit price, or accept the position is a commercial call. No SEO work can offset it. |
| Fix the hub's stale €89 price and "up to 10 days" turnaround | SEO-GROWTH-016 §9. Customer-facing factual error (real entry price €57; catalogue includes 4–6 week tests), appearing in both the SERP snippet and an on-page FAQ. Small, but it is a correctness decision rather than an SEO optimisation, and it was deliberately **not** bundled into the NOW batch. Needs explicit authorization. |
| Decide whether `CountryTrustBar`'s Ireland-only Doctify badge should show on every market | SEO-GROWTH-015 made the widget global everywhere else on the site; this one pre-existing `=== "ie"` gate is now the only inconsistency. Product/business call, not a code task — see §7 SEO-GROWTH-015. |

### DEFERRED — low value or blocked

- **Calculator/tool long tail — now confirmed sitewide, not Spain-only** (see
  SEO-GROWTH-012). BMI, calorie, blood-pressure, ovulation, ADHD-test and due-date
  calculators draw thousands of impressions across every market and locale, roughly a
  third of them at genuinely good positions (top 10–20), but convert at 0.48% CTR
  because the intent is informational/free-tool, not medical-service. Real impressions,
  no commercial value, high effort to move against dedicated calculator sites. This is
  the largest single component of the CTR dilution in §1 and should be understood as
  such rather than optimised.
- **Homepage query-mix / CTR investigation** — demoted from NEXT-1 on 2026-08-12 with
  the evidence recorded in §7 NEXT. The homepage's traffic is brand plus other
  organisations' brand collisions; its 7.44% CTR is the site's best. Nothing to
  optimise. Reopen only if a commercial (non-brand) query cluster appears on `/`.
- **Brand-collision queries** (`clinic global health`, `clinic.globalhealth`, `help
  global`, `global health care`) — several hundred impressions across `/`, `/pt/about`
  and `/about` at positions 7–9 with near-zero CTR. These are navigational searches for
  *other* organisations. Impressions are real; intent is not ours. Not a CTR defect,
  not addressable.
- **Ireland lab-test copy rewrite / supplier-differentiation rewrite** — investigated
  and rejected on evidence (SEO-GROWTH-016 §6). MGH's product copy is independently
  written and clinically more careful than Randox's own. There is no duplication to fix.
  Do not reopen without a specific new duplication finding.
- **Non-geo consumer test terms** (`b12 test kit`, `at home vitamin d test`, `at home
  coeliac test`, `cholesterol test`, `full blood count`) — MGH is absent from the top 20
  live and sits at positions 40–90 in GSC. These SERPs are owned by pharmacy retail at
  €13–25 price points against MGH's €57–129 lab kits. Different product class, not a
  ranking problem.
- **`stool testing ireland` and other local-pack queries** — the SERP returns a
  three-result local pack of physical Irish clinics. A remote service cannot enter it.
- **SEO-METADATA-005**, the CMS title inconsistency.
- `llms.txt` — optional and ignored by Google Search.
- Mass submission to the Indexing API — 200/day cap and officially JobPosting/
  BroadcastEvent-only. Abuse risks key revocation.

### CLOSED — do not reopen without new evidence

SEO-001 through SEO-008, SEO-METADATA-001 through 004, SEO-GROWTH-001 through 006,
SEO-GROWTH-008, SEO-GROWTH-009, SEO-GROWTH-010, SEO-GROWTH-011, SEO-GROWTH-012,
SEO-GROWTH-013, SEO-GROWTH-014, SEO-DOC-001, SEO-DOC-003. See §5 for each.
(SEO-GROWTH-013 closed INVESTIGATED / NO STRUCTURAL DEFECT. SEO-GROWTH-014 closed
GLOBAL DOCTIFY APPROACH CONFIRMED — its finding (no per-market Doctify profile exists)
stands; the follow-up decision was to use the one existing profile globally, carried
out in SEO-GROWTH-015, not to wait for per-market configuration. Do not reopen either
investigation without new evidence.)

---

## 8. Data limitations

- **GSC lags ~3 days.** As of the 2026-08-12 `SEO-RESET-001` pull the last date with
  any data is **2026-08-11**; no window in this file extends past it. 2026-08-10 and
  2026-08-11 were pulled with `dataState=all` and may still be incomplete — the
  position improvement on those two days should be re-read next pass before being
  relied on.
- **Adding dimensions to a GSC query changes the totals.** Observed directly this pass:
  `/portugal/en/services/baixa-medica` returns 196 impressions under `dimensions:
  ["page"]` but only 21 under `["page","country"]` for the identical window and filter.
  Single-dimension pulls are the trustworthy ones; treat any multi-dimension row as a
  lower bound on volume and never mix the two in the same comparison. Query-dimension
  pulls additionally omit anonymised rare queries, which is why per-page query lists
  sum to far less than the page's own impression total.
- **GA4 is not connected to the OpenSEO project.** `get_search_opportunities`, which
  joins GSC positions to GA4 business outcomes, is therefore unavailable. Every
  opportunity here is scored on GSC evidence alone, with no conversion data behind it.
  Separately, the GA4 property (`547083375`) has a consent-gated tag with a known data
  gap; treat its history as unreliable.
- **Google's index state is not production state.** Six of the eight watchlist rows have
  last-crawl dates that precede their fix date by 2–5 weeks. Any conclusion drawn from
  those rows about the *site* rather than about *Google* is invalid.
- **Backlink figures are DataForSEO estimates**, not Search Console link data, and carry
  at least one confirmed artefact (`brokenPages: 666`).
- **`SEO-FOUNDATION-001` ran no new full crawl either.** It used the live sitemap
  (1,906 URLs) as the URL inventory, a 51-URL stratified sample of it for status /
  robots / canonical verification, ~35 further targeted Googlebot-UA probes across every
  template family and legacy family with impressions, one GSC `["page"]` pull, and
  direct source inspection of the frontend and backend. That is deliberately **not** a
  crawl: the sitemap is the artefact under audit, so anything it omits would also be
  omitted from this sample. A full crawl remains the right instrument for discovering
  URLs the sitemap does not know about — it was judged unnecessary here because no
  finding pointed at one.
- **No full crawl was run this pass**, deliberately. Technical state in §3 comes from
  targeted live checks plus the 2026-08-09 crawl records. A full crawl is due only on
  the trigger conditions in §0. `SEO-RESET-001` added targeted live Googlebot-UA probes
  of six URLs and `inspect_urls` on seven; nothing in either suggested a global
  technical problem, which is why no crawl was triggered.
- **GSC `referringUrls` is a sample, not an inventory.** Three lab-test detail pages
  omit their own hub from that list while the hub demonstrably links to all 14 of them
  in raw HTML. Never conclude "not internally linked" from `inspect_urls` alone.
- **Country windows are searcher country.** Language is not market; a Portuguese-language
  page can serve a Brazilian or a Portuguese searcher.

---

## 9. Document map

| File | Purpose | Last meaningful update | Authoritative? |
| --- | --- | --- | --- |
| `seo/README.md` | Six-market workspace map and global/country ownership contract | 2026-08-31 | CURRENT — navigation, not status |
| `seo/<country>/` | Detailed dated market evidence: audits, keywords, competitors, content, technical analysis and exports | 2026-08-31 | EVIDENCE — this ledger wins on operational state |
| `docs/plans/seo-control-state.md` | **This file** — ledger, roadmap, watchlist, baseline | 2026-08-31 | **CURRENT — canonical** |
| `docs/plans/seo-indexation-plan-2026-07-28.md` | GSC indexation audit and carry-out plan | 2026-08-03 | PARTIALLY STALE — design decisions in §2 and the "explicitly not doing" list in §5 remain binding; all counts and scheduled checks superseded |
| `docs/audits/seo/commercial-opportunity-matrix-2026-08-10.md` | Commercial-query opportunity matrix | 2026-08-10 | HISTORICAL — findings promoted into §7 |
| `docs/audits/seo/ranking-growth-batch-2026-08-10.md` | Structural fixes + legacy-URL consolidation report | 2026-08-10 | HISTORICAL — implementation record |
| `docs/audits/seo/ranking-growth-batch-2026-08-09.md` | First ranking-growth batch | 2026-08-09 | HISTORICAL |
| `docs/audits/seo/health-landing-locale-integrity-2026-08-09.md` | `/health/*` locale integrity, doctor→service links | 2026-08-09 | HISTORICAL — implementation record |
| `docs/audits/seo/internal-discovery-crawl-depth-2026-08-09.md` | Recursive production crawl, orphan recovery | 2026-08-09 | HISTORICAL — note its own mid-analysis correction (1 orphan, not 306) |
| `docs/audits/seo/screaming-frog-technical-indexation-2026-08-09.md` | Screaming Frog technical defects | 2026-08-09 | HISTORICAL — the 33-URL head cluster is fixed |
| `docs/audits/seo/sick-cert-signal-consolidation-2026-08-09.md` | Sick-cert ghost-URL resolution | 2026-08-09 | HISTORICAL — redirects shipped; ranking half is the NOW batch |
| `docs/audits/seo/legacy-redirect-recovery-2026-08-08.md` | 478-URL legacy redirect chain audit | 2026-08-08 | HISTORICAL |
| `docs/audits/seo/doctor-indexability-migration-gap-2026-08-08.md` | Doctor `noindex` root-cause inventory | 2026-08-08 | HISTORICAL — 28 backfilled, 5 remain manual |
| `docs/audits/seo/site-audit-2026-07/` | Full site audit, July 2026 | 2026-07 | HISTORICAL |
| `myglobalhealth.online-audit/` | Original full audit and action plan | 2026-07 or earlier | OBSOLETE as status; keep as evidence |
| `docs/plans/ireland-internal-linking-seo.md` | Ireland internal-linking plan | 2026-07 | PARTIALLY STALE |
| `frontend/docs/template-route-map.md`, `frontend/docs/public-pages-completeness-audit.md` | Route inventories | 2026-08 | CURRENT for routes; both already carry the `/post/[slug]` correction |

No SEO document has been deleted. Historical files carry a header pointing here.

---

## 10. COUNTRY-WAVE-001 — Ireland + Czechia opportunity investigation (2026-08-13)

**Status: Global Foundation = VERIFIED / MONITOR EXCEPTIONS.** This is the first
country-wave pass run under that frozen foundation. Investigation only — no code
changed, nothing deployed, this section not committed as of writing (return for
review). No global finding (§3–§5, §8) was reopened; nothing here overrides §0's
"do not rerun the full crawl" rule — both markets were pulled with focused
OpenSEO/GSC calls only.

**Binding carry-forwards, reaffirmed, not reopened this pass:**
- Ireland sick-certificate cluster: **CLOSED — MONITOR** (SEO-GROWTH-008). Current
  numbers below are for context only.
- Ireland lab-test cluster: **WAIT/MEASURE, frozen until ~2026-09-08** (SEO-GROWTH-016,
  SEO-FOUNDATION-001-A/F). Not touched.

### 10.1 Fresh baselines (extracted 2026-08-13, `dataState=all`, latest complete day **2026-08-09** in both pulls — 08-10 onward excluded as incomplete)

| Market | Current 28d (07-13→08-09) | Prior 28d (06-15→07-12) | Direction |
| --- | --- | --- | --- |
| Ireland | 111 clicks / 9,965 impr / 1.11% CTR / pos 23.5 | 2 / 180 / 1.11% / pos 33.5 | Volume +55x (step-change from new content going live/getting indexed, not a ranking shift); CTR flat; position improved |
| Czechia | 90 clicks / 2,082 impr / 4.32% CTR / pos 14.3 | 46 / 734 / 6.27% / pos 8.05 | Clicks +96%, impr +184%, but **aggregate CTR/position falling — mix-shift, not confirmed ranking loss.** CZ-SEO-001 ran a matched-query cohort check: none of the 27 queries present in the prior 28d window (06-15→07-12, almost entirely branded doctor-name queries) dropped out or lost position in the current window — those held or improved. The ~184 new queries appearing this window are overwhelmingly low-commercial calculator/tool tail (BMI, ADHD test, ovulation, blood-pressure — 352+ impressions, pos 20-90) diluting the aggregate, same mechanism as SEO-GROWTH-012 sitewide. **Causality resolved for the matched cohort: no ranking deterioration found; decline is new-query-mix dilution.** |

**Correction to §2 country scoreboard:** the "Czechia — best CTR of any market" framing
(true at the 2026-08-12 snapshot, 4.76%) is now stale — CTR has continued falling to
4.32% and is trending down, not stable. §2's table is not rewritten here (that table's
own re-baseline is a separate housekeeping action); flagging so the next refresh
doesn't re-assert the old framing without checking.

### 10.2 Ireland opportunity map

| Cluster | Demand | Current perf. | Correct page? | SERP difficulty | Commercial value | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GP consultation (`gp-consultation-online`) | High | 313 impr / 2 clicks / pos 19.2 | Yes | 15+ dedicated IE telehealth brands own top 20; MGH absent | High | Authority/business-model wall | AUTHORITY-LIMITED |
| Country homepage | Brand + IMC navigational tail | 406 impr / 12 clicks / 2.96% CTR | Yes (brand only) | IMC/gov-owned for the tail | Brand defense only | None | NO MATERIAL OPPORTUNITY |
| Doctor profiles (21 active) | Strong, real name-search | 4–11% CTR at pos 2–10 | Yes | N/A (branded) | High — healthiest segment | None found (one CTR anomaly checked and cleared) | MONITOR |
| Doctor directory | IMC-register informational intent | 76 impr / 0 clicks / pos 13.3 | No — wrong intent | Gov-owned | Low | Intent mismatch, not content-fixable | WRONG PAGE (intent) |
| Sick-certificate cluster | — | Service 360/0/pos 46.8; blog 1,616/11/pos 15.8 | — | — | — | — | **MONITOR (binding)** |
| Lab-test cluster | — | Hub 481/3/pos 18.6; details ~0 clicks | — | — | — | — | **WAIT (binding, frozen to 2026-09-08)** |
| Referral & investigations | Thin, polluted by B2B + GEO-artifact queries | 328/3/pos 17.6 | Yes | Not tested | Low | Query-mix pollution, not page quality | LOW-VALUE TRAFFIC |
| Specialist pages (cardiology, neurology, psychiatry, etc.) | Very thin per-page | Mostly 0 clicks | Yes | Not tested (insufficient volume) | Low-moderate | Demand size, not page quality | MONITOR |
| Men's/women's health, dermatology, hair-loss, nutrition, paediatric, travel | 1–34 impr each | 0 clicks | Yes | Not tested | Low | Demand too small for a dedicated hub | MONITOR / NO MATERIAL OPPORTUNITY |
| Blog: sick-cert article | — | 1,616/11 | — | — | — | — | MONITOR (binding) |
| Blog: hand-foot-and-mouth-disease | Generic, not IE-differentiated | pos 75–99 | N/A | Not tested | None | Not competitively indexed | LOW-VALUE / DEAD CONTENT |
| Blog: when-to-see-a-gp-online-vs-in-person | 92/1/pos 17.2, verified linking into GP page + 2 doctors + directory | — | Yes | — | Low but structurally sound | None | SUPPORTIVE CLUSTER |
| Calculators/tools | High impressions | 0 clicks | N/A informational | — | None | Sitewide-deferred | DEFERRED (unchanged) |

New minor findings (not batch-worthy): Google overrides the declared canonical on
`/ireland/mental-health-assessment-consultation` (self-selects the legacy URL as
canonical instead of the current-shape page) — single-digit impressions; and
`/ireland/migraine-consultation` is a fully orphaned legacy URL with no current-shape
equivalent, 3 impressions. Doctor directory has zero outbound links to any
service/specialty page (real gap, low value given 0% directory CTR). Logged for the
next batch that touches directory or legacy-URL cleanup — not worth a standalone
batch today.

**Ireland verdict: no first-implementation batch justified.** Every material cluster
resolves to frozen/monitored, a confirmed authority wall, a healthy segment with no
defect, or a sub-material finding.

### 10.3 Czechia opportunity map

| Cluster | Demand | Current perf. | Correct page? | SERP difficulty | Commercial value | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GP/family doctor (`gp-consultation-online`) | Real, low-KD commercial ("praktický lékař online" family, ~60 impr) | 103 impr / 0 clicks / pos 12.9–14.7 | Yes in GSC's own 90d query×page attribution (GP page owns 100% of impressions for the exact query "praktický lékař online" and its variants; homepage owns 0 for that exact query). One live SERP snapshot showed the homepage at #20 with the GP page absent from top 20 — but the page is 27 days old (first impression 2026-07-17) with daily position swinging 1–45, so a single-day snapshot is not reliable evidence of a stable homepage-over-page pattern | Mixed: physical-clinic bookers + winnable telehealth peers at #5/#7/#20; not a wall | Real | **Ranking immaturity (page too young), not a confirmed on-page or authority defect — see CZ-SEO-001 root-cause pass** | **CANDIDATE — ROOT CAUSE VERIFIED, see 10.5/10.7. No edit justified this wave.** |
| Country homepage | Brand + thin Czech navigational | 212/7/pos 9.5 | Yes for brand; **unintentionally winning the GP query above** | — | Brand only (plus the GP-query side-effect) | — | MONITOR + feeds 10.5 |
| Men's health (`muzske-zdravi-online`) | **Zero measured impressions for "mužské zdraví online" itself in 3 months** — its celebrated pos 2.2 / 22% CTR is a long-tail-query artifact (near-nonsense queries), not real demand | 34 impr / 8 clicks page-level | Page exists, metric is misleading | Not tested — no real query | Effectively none currently measured | No real query to convert | **MONITOR — do not rebuild around this metric** |
| Prague/generic doctor (`lekar-online-praha`) | Mostly non-Czech (expat) demand | cs 21 impr pos 7.1; en 75 impr pos 5.9 | Partially | Local + telehealth mix | Low-medium | Genuinely low Czech-language volume | MONITOR |
| Travel medicine | `cestovni-medicina-praha` (20 impr/pos 13) **and** `travel-health-prague` (43 impr/pos 11.6) — two live cs-locale URLs for one topic | — | Possible duplicate — unconfirmed | 100% local-pack + vaccination-clinic organic, zero telehealth in top 20 | Low | **Business-model wall** on ranking; duplicate-URL question is separate | WRONG PAGE-TYPE (wall) + INVESTIGATE duplicate |
| Sick note (`neschopenka-online`) | Real, CZ-specific legal-doc intent | 25/2/pos 17.5 | Yes | Not tested this pass | Real | Position | MONITOR |
| Prescription renewal, referrals/exams, dermatology | Low volume (19–37 impr), pos 9.9–19.3 | — | Yes | Not tested | Medium | Volume/position | MONITOR |
| Mental health (`dusevni-zdravi-online`) | cs 3 impr/pos 86 vs. **en sibling 44 impr/pos 7.4 on the same topic** | cs effectively unranked | Yes, page exists | Not tested | Medium | cs authority/content gap vs. its own en version | **CONTENT GAP / IMPROVE candidate — investigate before rewriting** |
| Women's health (`zenske-zdravi-online`) | de/pt/ro variants exist and get impressions; **cs variant does not exist** — `inspect_urls`: "URL is unknown to Google" | N/A | **No — page missing in the market's own primary language** | Not tested | Unknown | Never built for cs | CONTENT GAP |
| Second opinion (`druhy-nazor-praha`) | de/es/ro have it; cs exists in sitemap but "Discovered — currently not indexed," referred only by a legacy page + the ES sibling, **zero cs internal links** | N/A | Missing/orphaned for cs | Not tested | Unknown | Not built + orphaned where present | CONTENT GAP |
| Weight/hair-loss/chronic-illness pages | 3–19 impr, pos 30–99 | Very weak | Yes | Not tested | Low-medium | Low authority/thin demand | WAIT |
| Tools (BMI, calorie, ovulation, due-date, ADHD, blood-pressure) | 352 impr combined — largest single pool in the market | 3 clicks total, pos 11.5–40 | Correctly non-commercial | Not tested | None | N/A | NO MATERIAL OPPORTUNITY (explains much of §10.1's position erosion) |
| Doctor directory | Thin | 19/2/pos 10.8 | — | — | Low | — | MONITOR |
| Doctor profiles | **Real driver of the market** — but nearly all traffic sits on **legacy URL shapes** (`/czechia-doctors/...`, `/cs/czechia-doctors/...`); only 2 of ~10 active profiles have moved to the current `/czechia/cs/doctors/...` shape | Top profile 40 clicks/132 impr/30.3% CTR/pos 4.4 | **Mostly no — legacy shape still winning** | N/A (branded) | High | Migration/consolidation lag, not content | MONITOR + WATCHLIST |
| Legacy Hlavatý (`/czechia-doctors/mudr-libor-hlavaty`) | 573 impr/2 clicks/pos 11.0 (3mo, matches control-state exactly) | Impressions declining (254→92 across the two 28d windows), 0 clicks | 308 confirmed live, target never picked up a single one of its ~9 name-variant queries in 3 months | — | High (branded) | Consolidation lag exceeding typical window | **WAIT-FOR-GOOGLE (existing watchlist item) — flag for re-check next batch if still unmoved** |
| Blog (cs) | Only 2 posts with any impressions, both thin | 1 and 9 impr | — | — | Negligible | — | LOW-VALUE / DEAD CONTENT |
| Blog cross-locale defect | Query "diabetes" (25 impr/pos 37.6, 3mo) resolves only to the **es and pt** diabetes articles — no cs article exists; zero clicks | — | Wrong-language match, no cs equivalent | — | None currently (0 clicks) | Missing cs content | CONTENT GAP (cheap future fix, not urgent) |

**Czechia verdict: one batch justified — see 10.5.**

### 10.4 Cross-country priority ranking

1. **CZ-SEO-001** (below) — real commercial demand, non-wall SERP, striking-distance
   position. **Root-cause pass complete (§10.7): classification D, ranking ramp — the
   page is 27 days old and already carries adequate on-page signal. No on-page edit is
   justified this wave; the action is to wait for ranking maturity, not rewrite
   metadata.**
2. Ireland directory→services internal link + two orphaned/mis-canonicalized legacy
   URLs — real but sub-material (low impression counts); worth folding into a future
   housekeeping batch, not a standalone one.
3. Czechia content gaps (`zenske-zdravi-online` cs missing, `druhy-nazor-praha` cs
   orphaned, `dusevni-zdravi-online` cs underperforming its own en sibling, no cs
   diabetes article) — real, but each needs a scoping/content decision before it's
   implementation-ready; none has the immediate evidence density of CZ-SEO-001.
4. Everything else in both maps: MONITOR, WAIT, AUTHORITY-LIMITED, or BUSINESS-WALL —
   no action justified this wave.

### 10.5 CZ-SEO-001 candidate — superseded by the §10.7 root-cause pass

This section originally proposed an on-page title/H1/meta rewrite for
`gp-consultation-online` based on a single live-SERP snapshot showing the homepage at
#20 for "praktický lékař online" with the GP page absent from the visible top 20.
**CZ-SEO-001 (§10.7) re-verified this against GSC's own 90-day query×page attribution
and production HTML and found the premise incomplete**: the GP page already owns 100%
of GSC-recorded impressions for the exact query family (homepage: 0), already carries
the exact phrase in title/H1/meta/breadcrumb/schema, and is 27 days old with daily
position swinging 1–45 — textbook ranking-ramp volatility, not a stable homepage-wins
pattern. **No implementation is proposed. See §10.7 for the full evidence and the
revised recommendation (wait for maturity, not rewrite).**

### 10.6 Measurement baseline (preserved for the eventual re-check)

- **Target queries:** "praktický lékař online", "praktik online", "prakticky lekar
  online", "praktickylekar online" — combined ~61 impressions / 0 clicks / pos
  12.9–17.5 (28d) on `gp-consultation-online`; 0 impressions on the homepage for these
  exact queries in the same window.
- **Target URL:** `/czechia/cs/gp-consultation-online`. **Current homepage URL:**
  `/czechia/cs` (212 impr / 7 clicks / pos 9.5 market-wide, but not attributed any of
  the exact GP-family queries in GSC's 90-day query×page data).
- **Query×page ownership baseline:** GP page owns the full GP-family query set in GSC
  attribution as of 2026-08-13. Live SERP is volatile (see §10.7.9) — a single-day
  homepage-at-#20 reading is not baseline-worthy on its own.
- **Evaluation window:** do not re-open this before the page reaches ranking maturity —
  remeasure ~**2026-09-08** (aligned with the Ireland labs window; ~7.5 weeks from
  first impression 2026-07-17), and only with a fresh `inspect_urls`/GSC pull
  confirming stable (non-volatile) position at that point.
- **Primary success criterion (if a future edit is ever proposed):** the dedicated GP
  page increasingly becomes Google's ranking page for the target query family while
  maintaining or improving total cluster clicks/impressions — not "title changed" or an
  immediate jump.

---

## 11. CZ-SEO-001 — Czech GP query ownership & on-page root-cause verification (2026-08-13)

**Status: CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE.** `/czechia/cs/gp-consultation-online`.
No metadata/H1 rewrite justified. Remeasure ~2026-09-08.

**Mode: narrow investigation only. No code changed. No deploy. Nothing committed.**

### 11.1 Matched-cohort correction (Czech market-level, resolves the §10.1 wording issue)

Pulled Czech `/czechia`-scoped query lists for both 28d windows (06-15→07-12 prior,
27 rows; 07-13→08-09 current, 231 rows) and compared by exact query string. **Zero
overlap query lost position or impressions** — the 27 prior-window queries are almost
entirely branded doctor-name searches (ahmed maklad, libor hlavatý, vojtěch černý,
etc.) and held or improved in the current window. All ~204 net-new queries are a
broad informational/tool tail (BMI/ADHD/ovulation/blood-pressure calculators — 352+
impressions alone, pos 20–90) that did not exist in the prior window. **Conclusion:
the aggregate CTR/position decline is entirely new-query-mix dilution. No matched
query shows ranking deterioration. Causality resolved, not merely "unresolved" —
resolved in favor of B (new-query discovery at lower positions), not A (real
ranking loss).**

### 11.2 GP query family — GSC query×page table (90d, `/czechia` pages only, filtered to lékař/praktick* stems)

| Query | Impr | Clicks | CTR | Avg pos | Ranking URL |
|---|---|---|---|---|---|
| praktický lékař online | 35 | 0 | 0% | 14.7 | `/czechia/cs/gp-consultation-online` |
| praktik online | 13 | 0 | 0% | 14.5 | `/czechia/cs/gp-consultation-online` |
| prakticky lekar online | 12 | 0 | 0% | 13.8 | `/czechia/cs/gp-consultation-online` |
| promluvte si s lékařem | 26 | 0 | 0% | 6.8 | `/czechia/cs/gp-consultation-online` (10) + `/czechia/cs` (16, pos 7.5) |
| online lékař | 3 | 0 | 0% | 15–30 | `/czechia/cs` |
| lékař online | 3 | 0 | 0% | 14.5–30 | `/czechia/cs/gp-consultation-online` (2) + `/czechia/cs` (1) |
| konzultace s lékařem online | 3 | 0 | 0% | 7–17 | `/czechia/cs` (2) + `/czechia/services/lekar-online-praha` (1) |
| praktickylekar online | 1 | 0 | 0% | 13 | `/czechia/cs/gp-consultation-online` |
| lékaři online / lékaři online 24 | 3 | 0 | 0% | 24–27.5 | `/czechia/cs/gp-consultation-online` + `/czechia/cs` |

Excluded as out of scope per the ticket's own guardrails: doctor-name queries, "kožní
lékař online" (dermatology intent, wrong cluster), tool/calculator queries. Prior-28d
comparison for this exact query set: **zero rows existed in the 06-15→07-12 window**
— the entire cluster is net-new discovery, consistent with §11.8's ramp finding.

### 11.3 Query × page ownership

For the query family above, GSC attributes essentially all commercial-intent
impressions to `gp-consultation-online`, not the homepage. The homepage only appears
for broader, more generic strings ("online lékař", "lékař online", "konzultace s
lékařem online") where it's plausibly the more literally-matching document, and for
"promluvte si s lékařem" ("talk to a doctor") where both pages get real traffic — a
genuine but low-severity overlap, not the head-term cannibalization the original
draft assumed. No legacy URL, no doctor profile, and no unexpected page appears in
this query set. **Not labeled cannibalization** — one soft overlap on one query,
otherwise clean ownership.

### 11.4 Legacy URL check — `/general-consultation-cz`

- Live HTTP: `301 → https://www.myglobalhealth.online/czechia/cs/gp-consultation-online`
  (confirmed via curl).
- `inspect_urls`: `coverageState: "Submitted and indexed"`, `pageFetchState:
  SUCCESSFUL`, **`googleCanonical` still self-referential** (Google's last crawl,
  2026-06-28, predates or hasn't yet processed the redirect being live), while
  `userCanonical` correctly points to `gp-consultation-online`.
- GSC impressions: real but fading and non-commercial-relevant — 1–2/day scattered
  through mid-July, effectively zero since 2026-07-19, 0 clicks in the last 90 days.
  No overlap with the GP-family query set in §11.2.
- **Verdict: properly consolidated, no longer materially participating in Google
  traffic. Closed as a confounder — the head-term ranking question is not explained
  by legacy-URL interference.**

### 11.5 Live production GP page signals (captured from HTML, not source defaults)

| Field | Value | Source |
|---|---|---|
| `<title>` | "Online praktický lékař \| Registrováno u ČLK \| Global Health Česká republika" | CMS `PageContent` override (template default would not carry the ČLK/pricing framing) |
| Meta description | "Konzultujte s praktickým lékařem registrovaným u ČLK z pohodlí domova. eNeschopenka, elektronický recept, doporučení ke specialistovi. Od 650 Kč. Termín ve stejný den." | CMS `PageContent` |
| H1 / hero | "Online konzultace s praktickým lékařem v [Česku]" | CMS `PageContent` (matches JSON-LD `name`) |
| Breadcrumb label | "Konzultace s praktickým lékařem" | CMS `PageContent` (breadcrumb structured data — same source fixed by commit 6d5733bc) |
| Structured data | `name`: "Online konzultace s praktickým lékařem v Česku"; `serviceType`: "General practitioner (GP) online consultation" | CMS `PageContent` |
| Canonical | self, `https://www.myglobalhealth.online/czechia/cs/gp-consultation-online` | code (route-level, correct) |
| hreflang | full 6-locale set + x-default, all pointing at this page's own locale variants | code (correct) |
| Indexability | `index, follow`, GSC verdict PASS, last crawl 2026-08-11 | — |

All visible/meta fields containing the target phrase are **CMS `PageContent`
overrides, not hardcoded template defaults and not locale-dictionary strings** — an
edit here, if one were ever justified, is a content change, not a code change.

### 11.6 Homepage signals vs. GP page

| | Homepage (`/czechia/cs`) | GP page |
|---|---|---|
| Title | "Online lékař Česko \| Registrovaní lékaři a specialisté" | "Online praktický lékař \| Registrováno u ČLK \| ..." |
| H1 | "Online lékařská péče v Česku" (no "praktický" at all) | "Online konzultace s praktickým lékařem v Česku" |
| Exact-phrase match to "praktický lékař" | **Meta description only** ("praktický lékař" appears once in the description, not in title/H1) | Title + H1 + breadcrumb + schema |

**The GP page's on-page signal is more tightly aligned with the exact query than the
homepage's.** This directly contradicts the "weak title/H1/meta" hypothesis from
COUNTRY-WAVE-001 — there is no material on-page gap to fix. Any homepage advantage in
one live SERP snapshot has to come from something other than on-page topical match
(most likely raw domain-level authority any homepage accrues over a newer subpage,
or plain SERP volatility on a young page — see §11.8).

### 11.7 Internal-link support

`gp-consultation-online` is linked from `SiteHeader.tsx`, `MobileNav.tsx`, and
`SiteFooter.tsx` — i.e. **sitewide template navigation present on every page,
including the homepage itself.** GSC's `inspect_urls` referring-URL sample (which is
non-exhaustive) additionally shows a contextual link from the ES general-consultation
sibling page and the Czechia team page. **Internal link support is already adequate
— nav-level presence on every page is the strongest internal signal available short
of dedicated body-copy backlinks from high-traffic pages. No internal-link batch is
justified.**

### 11.8 Ranking maturity

GSC date-series for `gp-consultation-online` shows **first impression 2026-07-17**
— 27 days before this investigation. Daily position from 07-17 to 08-09 swings from
1 to 45 (single-digit-impression days are naturally noisy), but the trend across the
most recent week (08-03→08-09) tightens to pos 5–17 with the **first-ever click on
2026-08-04**. This is classic new-page ranking volatility, not a stalled or declining
page. **Classification: RAMPING.** A page this young should not be judged — let alone
rewritten — against one competitive live-SERP snapshot.

### 11.9 Targeted live SERP check ("praktický lékař online", cs-CZ, 2026-08-13)

Top 20: #1 praktickylekar.online (informational/professional-only disclaimer site),
#2 Moje Ambulance (physical clinic network), #4/#12 EUC "Můj praktik online" (physical
clinic online extension), #5 zpmvcr.cz "Lékař na telefonu" (insurer-run **telehealth**,
free), #6 znamylekar.cz (directory), #7 Medevio (**telehealth booking platform**, same
model as this site), #8 smartMED (physical booking), #9 trade-press tag page, #10
Spotify podcast, #13 Moje Ambulance app, #14 uLékaře.cz (physical scheduling), #16
solo physical practice, #18 solo physical practice, #19 **konzultacelekare.cz — direct
telehealth competitor, same business model, ranking #19**, #20 **this site's
homepage**. GP page itself did not appear in the visible top 20 this specific day. At
least 3 of the top 20 (zpmvcr.cz, Medevio, konzultacelekare.cz) are genuinely
comparable online-only GP/telehealth providers, confirming the earlier "winnable
commercial SERP" read — the SERP is real telehealth demand, not a physical-clinic
wall, and the peers proving that are ranked both above and below where this site
currently sits.

### 11.10 On-page gap analysis vs. ranking telehealth peers

Medevio and zpmvcr.cz both lead with a single unambiguous value proposition
(free/insurer-backed telehealth, same-day) in title and first-screen copy — directionally
similar to what `gp-consultation-online` already does (ČLK registration, eNeschopenka,
e-prescription, same-day, price). No material intent-signal gap found: the page already
states booking intent, clinician registration/trust (ČLK), and Czech-market relevance
(price in Kč, eNeschopenka — a CZ-specific legal document, not generic content). No
word-count or generic-grade comparison was used, per the ticket's own constraint.

### 11.11 Root-cause classification: **D — INDEXING/RANKING RAMP**

The dedicated page is canonical, indexed, well-linked (sitewide nav), and already
carries on-page signal at least as strong as the homepage's for the target phrase. The
SERP is feasible (real telehealth peers rank both above and below this domain). But
the page is 27 days old with volatile day-to-day position and only its first click
eight days ago. **Classification A (on-page defect) is explicitly rejected** — the
"weak title/H1/meta" hypothesis from COUNTRY-WAVE-001 does not survive inspection of
the live page. Classification B (authority/ownership) is not supported either — GSC's
own attribution shows the GP page, not the homepage, owns the query. **Only
classification D fits the evidence.**

### 11.12 GP metadata rewrite: not proposed
*(the ticket that requested this pass called a would-be next batch "CZ-SEO-002" —
that ID was never used since classification A was rejected; the actual CZ-SEO-002
ticket is a separate, later investigation — see §12)*

Per the ticket's own rule, only classification A auto-advances to a metadata
optimization. Classification D does not. **No before/after title, H1, or meta change
is proposed.** Rewriting already-adequate metadata on a 27-day-old page would remove
the ability to attribute any future ranking change to either signal, and risks
resetting whatever crawl/relevance signal Google has already started to accumulate.

### 11.13 Recommendation

**CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE.** No batch, no on-page edit, no further
investigation needed this wave. Remeasure ~**2026-09-08** (aligned with the Ireland
labs remeasure window, §10.2, rather than a separate date) — if position is still
volatile or hasn't improved by then, the next step is a fresh matured-page read (not
an automatic content rewrite): re-run §11.2/§11.9 and only then decide between
D→resolved (mature, ranking as expected) or a genuine re-classification.

### 11.14 Control-state carry-forwards (unchanged by this pass)

Ireland = no implementation justified (§10.2). Sick-certificate cluster = MONITOR
(SEO-GROWTH-008, binding). Lab-test cluster = WAIT, frozen to 2026-09-08
(SEO-GROWTH-016 / SEO-FOUNDATION-001-A/F, binding). Global Foundation = VERIFIED /
MONITOR EXCEPTIONS (unchanged, not reopened).

**NO IMPLEMENTATION / NO DEPLOY / NO COMMIT.**

---

## 12. CZ-SEO-002 — Czech mental-health locale ownership investigation (2026-08-13)

**Mode: narrow investigation only. No content changed. No deploy. Uncommitted.**
**Latest complete GSC date used: 2026-08-09 (`dataState=all`).**

### 12.1 URLs and page family

- Czech: `https://www.myglobalhealth.online/czechia/cs/services/dusevni-zdravi-online`
- English (Czech market): `https://www.myglobalhealth.online/czechia/en/services/dusevni-zdravi-online`
- Note: the URL *slug itself stays the Czech string* (`dusevni-zdravi-online`) across
  every locale variant (en/pt/es/ro/de) — only the `/cs/`, `/en/`, etc. path segment
  changes. This is consistent with this service's `next.config.ts` rewrite mapping
  and matches the pattern used for `gp-consultation-online`, `muzske-zdravi-online`,
  etc. — not a defect specific to this page.
- Both variants: HTTP 200, self-canonical, `index, follow`, reciprocal 6-locale +
  x-default hreflang block (verified identical hreflang set on both pages), present in
  `sitemap.xml` (confirmed by direct fetch — an earlier `inspect_urls` read that
  omitted the `sitemap` field for the en URL was an API reporting gap, not a real
  absence). No fallback-locale or noindex condition on either page. No legacy URL
  found for this specific cluster (not reopening global hreflang architecture — no
  regression found here).

### 12.2 Locale-level GSC baseline (90d, 2026-05-13→2026-08-09)

| | cs page | en page |
|---|---|---|
| Impressions | 3 | 44 |
| Clicks | 0 | 0 |
| Avg position | 86.3 (one row: pos **252** on 07-23 — effectively unranked) | 7.36 |
| First real activity | 2026-07-20 (page indexed 2026-07-19) | 2026-07-19 (spike 07-20/07-21: 17+14 impr) |
| Recent trajectory | Sparse: 0 most days, single-digit blips | Front-loaded at launch, thin trickle since 07-28 |

### 12.3 Matched-query comparison — the headline 86-vs-7.4 gap does not survive

Filtering `query`×`page` to this page pair returns only **4 rows total** across
cs/en/pt combined — GSC's per-query privacy threshold suppresses the rest of both
pages' low-volume impressions (same limitation flagged in §8; expected, not a bug).
Of the rows that *are* visible:

- en page: 1 impression for **"czech republic crisis line 116 123 official"** and 1
  for **"czech republic 116 123 linka první psychické pomoci 24/7 official"** — both
  **English-language**, **informational** (crisis-hotline lookup), from **country=GBR
  and country=USA** (confirmed via a `country`×`page` pull — the only two decomposable
  rows for the en page).
- cs page: 0 individually visible queries (all 3 impressions below the reporting
  threshold).
- Broader sweep: queries containing "deprese", "terapeut", "psych", or "zdravi" on any
  `/czechia` page return **zero rows** in 90 days. **There is currently no observed
  Czech-language commercial mental-health search demand on this property at all** —
  for either page.

**The original 86-vs-7.4 comparison compared two non-equivalent populations**: the
cs page's number is built on 3 near-random impressions (one of which isn't really
"ranked" at position 252), and the only identifiable slice of the en page's number is
an English-language informational query from non-Czech countries — unrelated to
Czech commercial mental-health intent. **The apparent gap does not survive a
matched-intent comparison, because no matched Czech-intent query volume exists yet
to compare.**

### 12.4 Wrong-language ownership check

No Czech-language commercial query was found landing on any URL (cs page, en page,
homepage, doctor profile) in 90 days — there is nothing to misattribute yet. The one
decomposable English-language query correctly lands on the English page, from
English-speaking countries. **Classification: EXPECTED LANGUAGE MATCH** for the
visible data; **LOW-DATA NOISE** for the aggregate position figures themselves (both
pages have too few impressions for their average position to be a meaningful
ranking signal).

### 12.5 Maturity

Both pages were crawled and indexed on the same day (2026-07-19) and both show their
first real activity within the following 1-2 days. **Neither page is more mature than
the other** — both are ~3.5 weeks old as of this investigation, both **RAMPING /
INSUFFICIENT DATA**. A maturity mismatch does not explain the gap (there isn't one);
data insufficiency does.

### 12.6 Content-equivalence (live HTML, both pages)

| | cs | en |
|---|---|---|
| Title | "Duševní zdraví online \| Úzkost, deprese, vyhoření \| Lékař na videu" | "Mental Health Online \| Czech Republic \| English Speaking Doctor" |
| Meta description | Real authored Czech copy — "Diskrétní posouzení úzkosti, deprese a dalších duševních obtíží..." | Real authored English copy — "Confidential support for anxiety, depression, and other mental health concerns..." |
| Page size (proxy for content depth, not a diagnosis on its own) | 266,488 bytes | 270,217 bytes (near-identical) |
| Robots | index, follow | index, follow |

Both pages carry distinct, real, locale-appropriate authored copy — **the Czech page
is a genuine authored equivalent, not thinner, not field-by-field fallback content,
and not differently positioned** from its English sibling. No content-equivalence
defect found.

### 12.7 Targeted Czech SERP ("psycholog online" — the closest real Czech mental-health
commercial term; no GSC-observed query family exists to anchor this to more
precisely, per §12.3)

MyGlobalHealth (either locale) **does not appear in the top 20** for this query. The
SERP is dominated end-to-end by Czech **psychotherapy/counseling marketplaces**
(Mojra.cz, Terapie.cz, Hedepy.cz, Mendora.cz, Terapio.cz, psycholog-online.cz) —
platforms connecting users to talk-therapists/psychologists — plus a couple of
crisis-line/nonprofit resources. **This is a structurally different product category**
than MGH's page, which is a ČLK-registered-**doctor** assessment for anxiety/
depression (medical, potentially medication-adjacent), not a psychotherapy
marketplace. This is a real business-model distinction worth flagging for future
awareness, but **it cannot be scored as the root cause of the cs-vs-en gap** — the
page doesn't rank for this query in *either* locale, and no Czech demand for it has
materialized in GSC yet either way.

### 12.8 Internal-link comparison

Neither locale variant is hardcoded into sitewide nav (header/footer/mobile-nav) —
unlike the flagship `gp-consultation-online`, this specialty page is reached through
the services directory/hub listing, which is architecturally symmetric between the cs
and en locale trees (same component, same listing logic, different locale content).
**No meaningful cs-vs-en internal-link asymmetry found** — not recommending more
links on the strength of "more are possible."

### 12.9 Legacy / competing-page check

No historical Czech mental-health URL, no duplicate current URL, and no doctor-page
or blog article competing for this cluster were found. Not a factor.

### 12.10 Root-cause classification: **A — NO REAL ASYMMETRY**

The original position comparison used different, non-comparable query populations:
the en page's visible signal is English-language, non-Czech-country, informational
crisis-hotline traffic; the cs page's number is statistical noise from 3 impressions.
Both pages are equally young, equally well-formed technically, and equally
content-complete for their locale. **No wrong-language ownership, no content gap, no
internal-authority gap, and no legacy interference were found.** (Secondary note:
insufficient real Czech-language demand — bordering on classification D territory —
further reinforces that this is a data-volume problem, not a defect to fix.)

### 12.11 Implementation gate

**Classification A → WAIT / MONITOR, not a rewrite**, per the ticket's own rule. No
CZ-SEO-003 implementation is proposed.

### 12.12 Measurement baseline (for a future re-check only)

- **Czech page baseline:** 3 impr / 0 clicks / pos 86.3 (90d), first real activity
  2026-07-20.
- **English page baseline:** 44 impr / 0 clicks / pos 7.36 (90d), first real activity
  2026-07-19.
- **Target Czech query family:** none currently supported by observed GSC demand —
  re-derive from a fresh GSC pull at re-check time rather than assuming "psycholog
  online" / "psychiatr online" will be the eventual real family.
- **Query×page ownership baseline:** no Czech-commercial-intent query currently
  attributed to any URL on this property.
- **Re-check trigger:** not date-driven (no active ramp to time against, unlike
  CZ-SEO-001) — fold into the next country-wave GSC refresh once real Czech query
  volume appears for this cluster, rather than a fixed calendar date.

### 12.13 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland = no current
implementation (§10.2). Sick-certificate cluster = MONITOR (SEO-GROWTH-008). Ireland
labs = WAIT until ~2026-09-08 (SEO-GROWTH-016 / SEO-FOUNDATION-001-A/F). Czech GP
(`gp-consultation-online`) = **CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE**, remeasure
~2026-09-08 (§11).

**NO IMPLEMENTATION / NO DEPLOY / CZ-SEO-002 UPDATE UNCOMMITTED.**

---

## 13. CZ-SEO-003 — Czech women's-health demand & primary-locale gap validation (2026-08-13)

**Mode: narrow investigation only. No page created. No translation. No metadata/CMS
change. No deploy. Uncommitted.** Extraction date 2026-08-13; latest complete GSC
date 2026-08-09 (`dataState=all`).

### 13.1 Actual current inventory — `zenske-zdravi-online` is NOT missing

Live check reverses the COUNTRY-WAVE-001 §10.3 finding: the Czech page **exists, is
public, and is correctly authored**.

| | cs | en |
|---|---|---|
| URL | `/czechia/cs/services/zenske-zdravi-online` | `/czechia/en/services/zenske-zdravi-online` |
| HTTP | 200 | 200 |
| Title | "Zdraví žen online \| Hormony, antikoncepce, menopauza \| Lékař na videu" | "Women's Health Online \| Czech Republic \| English Doctor" |
| Meta description | Real authored Czech copy (PCOS, hormonal issues, menopause) | Real authored English copy (contraception, hormonal health, menopause) |
| Robots | index, follow | index, follow |
| Canonical | self | self |
| hreflang | full 6-locale + x-default, reciprocal | same |
| Sitemap | present, `lastmod` 2026-07-19 | present |
| `inspect_urls` verdict | **NEUTRAL — "URL is unknown to Google"** | PASS — indexed, crawled 2026-07-19 |
| Page size | 265,811 bytes | 263,045 bytes (near-identical) |

**Root cause of the "cs missing" read: earlier inventory error.** COUNTRY-WAVE-001
read `inspect_urls`' "URL is unknown to Google" (Google has never crawled it) as "the
page doesn't exist." Those are different facts — the page has existed, live and
correctly authored, since the same 2026-07-19 launch batch as every other Czech
service page in this wave. It is not: missing a translation row, unpublished, service-
less, route-excluded, on a different slug, or English-only. **It is simply
un-crawled** — same crawl-discovery lag pattern already established for the GP page
(§11.8) and the mental-health page (§12.5), consistent with a page not linked from
sitewide nav (reached via the services hub, like the other specialty pages).

### 13.2 Product / clinician scope (as authored, not invented)

The page's own copy scopes itself to a **GP-led discreet video assessment** for
"PCOS, hormonal issues, menopause and other women's health concerns" — not a
gynecological examination or procedure. The two clinicians it links to,
**MUDr. Romana Pavlů** and **Dr. Ahmed Maklad**, are both listed on their own profile
pages as **"Praktická lékařka"/"Praktický lékař"** (general practitioner) — **not**
gynecologists. This is an honestly-scoped page: it doesn't claim gynecology, and the
service it actually offers (GP consultation, contraception guidance, menopause
symptom discussion, referral where needed) matches who's actually available.

### 13.3 Fresh GSC demand discovery — none found

Broad Czech-language sweeps across the whole property, 90d:

| Stem searched | Rows found |
|---|---|
| "zensk" (ženské) | 0 |
| "gynek" | 0 |
| "antikoncep" | 0 |
| "menopauz" | 0 |
| "hormon" (any language) | 21 rows, all Ireland English/Portuguese hormone-test queries — none Czech, none on a Czechia page |
| page contains `zenske-zdravi-online` (any query) | 2 rows: 1 Portuguese ("ginecologista teleconsulta") on the pt variant, 1 German ("online-konsultation frauengesundheit") on the de variant — neither Czech, neither on cs/en |

**There is currently no observed Czech-language search demand — commercial or
otherwise — for women's health/gynecology/contraception/menopause on this property.**
The en page itself has only 2 total impressions in 90 days (07-21, 07-29, 1 each),
effectively no signal either.

### 13.4 Demand classification, ownership, SERP

No query survives filtering to justify a demand table — §13.3 is the complete
finding. Query×page ownership: **N/A, no eligible query exists to own.** Targeted
live SERP for the closest real Czech commercial term, **"gynekolog online"**
(context/product-fit check, not demand-backed): top 20 is **100% dedicated online
gynecology services** (Gynline.cz, Gynclin, Gynlink, Gynmedico — all staffed by named
gynecologists, offering e-prescription and gynecological e-consultation) plus a
directory (znamylekar.cz) and a hospital Q&A page. **MyGlobalHealth does not appear.**
This is a real, noted business-model/specialty distinction (gynecologist-branded
demand wants a gynecologist) but it cannot be scored as an active defect — no
matching Czech demand has materialized either way, and the existing page correctly
does not claim to be a gynecology service.

### 13.5 English page assessment

Genuinely useful and commercially aligned in principle (correctly scoped to
contraception/hormonal/menopause GP care, real authored copy, not thin or obsolete)
— but has no demonstrated demand or performance of its own (2 impressions/90d) to
point to as evidence a Czech translation is overdue. Translating a page that itself
has not proven demand is not a defect fix.

### 13.6 Clinician / business feasibility

Current supply (GP-level clinicians) supports exactly the scope the page already
claims (hormonal/contraception/menopause discussion, not gynecological exams or
procedures). If genuine Czech demand for a **gynecologist-specific** service were
ever observed, that would be a **classification D** business/clinician-supply
question for a future pass — not something to resolve now, since no such demand
exists yet.

### 13.7 Internal architecture

No change proposed. The page already sits in its natural location (the services
hub/catalogue, same pattern as every other specialty page) and is already reachable
from the four linked clinician profiles. Not adding links or a new hub — no
search/product evidence requires one.

### 13.8 Root-cause classification: **B — EXISTING PAGE ALREADY SATISFIES INTENT**

The apparent missing slug was a misreading of Google's crawl status, not a real
content gap. **Reinforced by C (no meaningful search demand)**: even setting the
inventory error aside, there is no Czech-language demand signal on this property to
build a case around. Neither A, D, E, F, nor G applies — there's no true gap (A), no
demonstrated demand for D/E to be about, no wrong-page ownership since no query
exists to misattribute (F), and no publication defect (G) — the page is public,
indexable, and correctly formed; it is simply new and not yet crawled by Google
(routine, not a defect).

### 13.9 Implementation gate

**No new page. No CZ-SEO-004.** Per the ticket's own rule, classifications B/C
recommend no new page. Nothing to repair (ruling out G) — the page is already live
and correct. The un-crawled status is a passive wait, not an action item.

### 13.10 Measurement baseline (for awareness only — no active target)

- **Target Czech query family:** none currently supported by GSC evidence.
- **Current ranking URLs:** none — no query owns a ranking on this page yet.
- **Current cluster performance:** cs page 0 impr/0 clicks (never yet shown for a
  real query); en page 2 impr/0 clicks/90d.
- **Trigger for revisiting:** if/when Google crawls the cs page (self-resolving, same
  as §11.8/§12.5) **and** real Czech-language demand appears in a future GSC pull —
  re-run §13.3 at that point rather than on a fixed date.

### 13.11 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland = no implementation
(§10.2). Ireland labs = WAIT ~2026-09-08 (SEO-GROWTH-016 / SEO-FOUNDATION-001-A/F).
Czech GP (`gp-consultation-online`) = CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE,
remeasure ~2026-09-08 (§11). Czech mental health (`dusevni-zdravi-online`) =
CZ-SEO-002 — NO REAL ASYMMETRY / MONITOR (§12).

**NO IMPLEMENTATION / NO DEPLOY / CZ-SEO-003 UPDATE UNCOMMITTED.**

---

## 14. CZ-SEO-004 — Czech doctor legacy URL consolidation & ownership investigation (2026-08-13)

**Mode: investigation only. No redirect changes. No doctor-profile edits. No
canonical changes. No schema changes. No deploy.** Extraction date 2026-08-13;
latest complete GSC date **2026-08-09** (`dataState=all`).

### 14.1 Live Czech doctor roster (current, scraped from production)

8 doctors publicly listed at `/czechia/cs/doctors` today: Vojtěch Černý, Ahmed
Maklad, Gabriele Felici, Michael Nytra, Khoiamul Islam, Nataliya Kharlamova,
Romana Pavlů, Yasmin Holz. **Libor Hlavatý is not on this list** — first
material finding, see §14.3.

| Doctor | Current URL (`/czechia/cs/doctors/…`) | Live status | Live `robots` meta | In sitemap |
|---|---|---|---|---|
| Vojtěch Černý | `mudr-vojtech-cerny` | 200 | `index, follow` | Yes |
| Ahmed Maklad | `dr-ahmed-maklad` | 200 | `index, follow` | Yes |
| Romana Pavlů | `mudr-romana-pavlu` | 200 | `index, follow` | Yes |
| Yasmin Holz | `mudr-yasmin-holz` | 200 | `index, follow` | Yes |
| Khoiamul Islam | `khoiamul-islam` | 200 | `index, follow` | Yes |
| Michael Nytra | `dr-michael-nytra` | 200 | **`noindex, nofollow`** | **No** |
| Nataliya Kharlamova | `mudr-nataliya-kharlamova` | 200 | **`noindex, nofollow`** | **No** |
| Gabriele Felici | `dr-gabriele-felici` | 200 | **`noindex, nofollow`** | **No** |
| Libor Hlavatý (disposition unresolved — not confirmed retired) | `mudr-libor-hlavaty` | **404**, page carries `noindex` (site's not-found template) | n/a | No |
| Jana Cyplinská (disposition unresolved) | `mudr-jana-cyplinska` | 404 (broad rule 308s to a dead slug, then middleware 410 — restored to this pending state 2026-08-08, see `gone-content.ts`) | n/a | No |
| Andrei Lavrov (disposition unresolved — not confirmed retired) | `mudr-andrei-lavrov` | **404** | n/a | No |

### 14.2 Legacy-vs-current GSC ownership, 90d (`sc-domain:myglobalhealth.online`, 2026-05-09→2026-08-09)

All Czech doctor rows, both URL shapes, ranked by impressions:

| Doctor | Legacy shape total (impr/clicks, all locale-prefixed variants) | Current shape total | Ownership |
|---|---|---|---|
| Libor Hlavatý | 573 / 2 (bare `/czechia-doctors/…` only; encoded/locale variants add none material) | **0 / 0 — URL never existed in GSC** | **LEGACY URL STILL OWNS (only URL that exists)** |
| Vojtěch Černý | 194+181+2 = 377 / 32 (cs-prefixed dominant) | 0 / 0 | LEGACY URL STILL OWNS |
| Michael Nytra | 140 / 15 | 0 / 0 | LEGACY URL STILL OWNS |
| Ahmed Maklad | 153+60+14+2+2+1 = 232 / 23 | 1 / 1 (single impression) | LEGACY URL STILL OWNS (current barely seen) |
| Jana Cyplinská | 132(es)+56+17+6+2+15 = 228 / 48 | 0 / 0 | LEGACY URL STILL OWNS — but this is an unresolved-identity case, not a routing defect (§14.1) |
| Nataliya Kharlamova | 46+7+1 = 54 / 5 | 0 / 0 | LEGACY URL STILL OWNS |
| Romana Pavlů | 45+2 = 47 / 5 | 0 / 0 | LEGACY URL STILL OWNS |
| Andrei Lavrov | 18 / 2 | 0 / 0 | LEGACY URL STILL OWNS (trivial volume) |
| Yasmin Holz | 17 / 2 | 0 / 0 | LEGACY URL STILL OWNS |
| Gabriele Felici | 1 / 0 | 0 / 0 | NO MATERIAL SEARCH DEMAND |
| Khoiamul Islam | 0 / 0 (no legacy Czech rows — his legacy history is under `/ireland-doctors/`, a different market) | 3+7+1 = 11 / 3 | CURRENT URL OWNS |

**Every Czech doctor with real query volume is still 100% legacy-shape-owned in
GSC's reporting.** That reads as one systemic pattern, but §14.4 shows it is
two unrelated causes layered together.

### 14.3 Hlavatý case study

- **Legacy URL:** `/czechia-doctors/mudr-libor-hlavaty` — live check: `301` (via
  redirect.pizza edge) → `/czechia/cs/doctors/mudr-libor-hlavaty` (single hop,
  permanent).
- **"Current" URL:** `/czechia/cs/doctors/mudr-libor-hlavaty` — live check:
  **404**, served by the site's own Next.js not-found template (`<title>Global
  Health</title>`, `<meta name="robots" content="noindex">`), confirmed on the
  `www` origin directly (not a CDN/redirect-layer artifact). Tried
  `/czechia/en/…`, `dr-libor-hlavaty`, `libor-hlavaty` slug variants — all 404.
- **Roster:** Hlavatý is absent from the live 8-doctor Czechia listing (§14.1).
- **`gone-content.ts` check:** Hlavatý is **not** in `GONE_DOCTORS`. That list
  currently holds exactly one entry (`dr-grainne-ahern`, Ireland). So he is in
  neither state the codebase has a mechanism for — not an active roster member
  (would 200) and not a formally-confirmed departure (would 410 via the
  documented `GONE_DOCTORS` + `slugMatcherExcludingGone` mechanism). He falls
  through the broad `/czechia-doctors/:slug` rule, which rewrites the slug
  unchanged onto a profile that no longer exists.
- **90d GSC (legacy URL only, current URL has zero rows):** 573 impr / 2
  clicks / pos 10.98. Query breakdown (13 distinct query rows, ~233 of the 573
  impressions attributable — the rest fall under GSC's per-query privacy
  threshold): `mudr libor hlavatý` (87 impr, pos 16.8), `libor hlavatý` (61
  impr, pos 8.8), `mudr hlavatý české budějovice` (57 impr, pos 9.9 — a
  location-qualified branded query), plus 10 minor name-spelling variants. All
  are exact-clinician-name queries; none carry "online consultation" or
  specialty qualifiers.
- **URL Inspection (`inspect_urls`, both URLs):** both show
  `coverageState: "Excluded by 'noindex' tag"`, `indexingState:
  BLOCKED_BY_META_TAG`, **`googleCanonical` already set to the current URL**
  on both — Google has already accepted the intended consolidation target
  signal-wise. Last crawl **2026-07-30** for both — consistent with Google
  having crawled the current URL *after* it had already gone 404/noindex.
  `pageFetchState: SUCCESSFUL` on a 404 is expected — the not-found template
  is a real page that fetches fine and simply declares itself noindex.
- **Backlinks:** zero external backlinks to the legacy URL (`get_backlinks_profile`,
  page scope) — rules out external-history residue as an explanation.
- **Trend:** per the existing audit doc (`doctor-indexability-migration-gap-2026-08-08.md`
  §10), legacy impressions were already declining (254→92 across two prior 28d
  windows) before this pass, with 0 clicks in the most recent window —
  consistent with Google's index gradually purging a page it has already
  marked noindex, not a page still actively "winning."
- **Classification: not "stuck," and not implementation-ready either.** The
  prior "still stuck" framing assumed an alive current-shape profile losing a
  consolidation race. That premise is false — there is no live successor page
  to consolidate into. But roster/database absence is **not itself evidence
  of retirement** — `gone-content.ts`'s own Cyplinská writeup makes exactly
  this point (410 shipped on absence alone, then reverted same-day once no
  positive confirmation existed). The same standard applies to Hlavatý.
- **Assigned status: UNRESOLVED IDENTITY / DATA STATE — SEO terminal state
  wrong, remediation blocked on identity confirmation.** Confirmed facts: the
  legacy URL correctly redirects (single hop, permanent) to the historical
  current-shape identity, and that identity's destination is now absent/404 —
  a bad terminal state. Not confirmed: *why*. Three dispositions remain open,
  none positively established by this pass:
  - **CONFIRMED RETIRED** — would authorize adding him to `GONE_DOCTORS` (410).
  - **LIVE UNDER ANOTHER IDENTITY** — would authorize a specific redirect to
    his real current slug (same pattern as the existing `CORRECTIONS` tables).
  - **DATA / MIGRATION GAP** — would authorize restoring the profile.
  No HTTP repair is authorized until one of these is positively established.
  This is deliberately **not** classified against the ticket's A–G routing
  scale, the same way Cyplinská isn't — the defect is upstream of routing, in
  unresolved doctor identity/disposition.

### 14.4 Why "legacy still owns" for everyone else: a second, unrelated cause

Live-checking the 5 sitemap-eligible active doctors' current pages (§14.1)
found **3 of 8 active Czech doctors have their current-shape profile actively
`noindex, nofollow` right now** — Michael Nytra, Nataliya Kharlamova, Gabriele
Felici. `isPublicDoctorRecordIndexable()`
(`frontend/lib/content/publication-validation.ts:126-142`) requires BOTH
editorial validation to pass AND `editorialChecklist.readyToIndex === true`.
The `readyToIndex` half is **not** the live cause here — the 2026-08-08
migration audit (`doctor-indexability-migration-gap-2026-08-08.md` §6)
already backfilled the checklist for these three (it was `null`
pre-migration) and explicitly found each has **its own genuine content
validation failure independent of that flag** — empty bio in every locale,
logged as "SHOULD REMAIN NOINDEX (needs content)". Live re-verification
2026-08-13 (rendered profile pages, not the historical doc) confirms this
still holds: all three show a generic templated meta description, an empty
"O [Name]" bio section, no specialty title beyond generic "Doctor", **and,
newly noted, "Dosud nebyly přiřazeny žádné služby" (no services assigned)
and no online booking slots configured in Czechia** — see §14.9. **Correct
framing: CONTENT VALIDATION BLOCK (empty bio fails the ≥120-character
requirement), not an editorial-flag gap** — nothing to route differently,
nothing to consolidate; the current pages are correctly excluded from the
index because the underlying profile content is incomplete, and setting
`readyToIndex` alone would not change that (validation still fails).

For the other 5 (indexable, sitemap-present, `index, follow` live) — Černý,
Maklad, Pavlů, Holz, Khoiamul Islam — the redirect chain and canonical are
both correct. Černý's own `inspect_urls` result shows the SAME
"Excluded by noindex" verdict Google recorded on **2026-08-03/08-07** — i.e.
crawled *before* his page's indexability was fixed. His live page is
`index, follow` now. That is exactly what normal recrawl lag looks like: the
fix is live, Google's cached verdict is stale, and it will clear on the next
crawl. Ahmed Maklad already shows the target end-state — `inspect_urls`
verdict `PASS`, `coverageState: "Submitted and indexed"`, last crawl
**2026-08-12** (fresh), `googleCanonical` = current URL. **This is the
control case proving the pattern resolves once (a) the page is indexable and
(b) Google has recrawled since the fix — no redirect change was or is
needed for these five.**

### 14.5 Sitemap and internal links

`/sitemap.xml` lists exactly 5 Czech doctors × 6 locales = 30 current-shape
URLs (Černý, Maklad, Pavlů, Holz, Khoiamul Islam) — precisely the 5 that are
live-indexable. **Zero legacy-shape URLs in the sitemap.** The live doctor
directory (`/czechia/cs/doctors`) links only to current-shape URLs (verified
by extracting every `/doctors/` href from the rendered page — 8 links, all
`/czechia/cs/doctors/…`, matching §14.1's roster exactly, no legacy hrefs).
**Zero remaining internal legacy links** — confirms SEO-GROWTH-001 (footer)
plus this pass (doctor directory) between them cover the internal-linking
surface for this market.

### 14.6 Systemic-vs-isolated assessment

Two independent findings, not one:

1. **Unresolved doctor-identity/data-state gap** (legacy → 404 successor):
   confirmed for **Hlavatý** (material, 573 impr) and **Andrei Lavrov**
   (trivial, 18 impr) — both absent from the active roster AND absent from
   `GONE_DOCTORS`. Shared symptom, but **not yet a shared confirmed cause** —
   see §14.3, roster absence alone does not establish retirement. **Isolated
   to these two identities**, not a broad redirect-rule problem — the
   mechanism itself (`GONE_DOCTORS` + `slugMatcherExcludingGone`) is proven
   correct (it already works for `dr-grainne-ahern`).
2. **Content validation block** (current page itself correctly noindexed):
   confirmed for 3 of 8 active doctors (Nytra, Kharlamova, Felici) — empty
   bio in every locale, not a `readyToIndex` gap (that was already backfilled
   2026-08-08). Real, active-supply, content-ops issue — routed to
   CZ-SEO-005 below rather than folded into this ticket's routing scope.

### 14.7 Root-cause classification

**No A–G routing classification is assigned for Hlavatý.** The redirect
*mechanics* audited across all 8 active doctors are clean (single-hop,
permanent, correct slug, no chains, no internal legacy links, clean sitemap),
but Hlavatý's terminal state (legacy → dead current URL) cannot be assigned a
routing classification until his disposition is known — see §14.3's
UNRESOLVED IDENTITY / DATA STATE status. This is a deliberate non-classification,
mirroring how `gone-content.ts` already treats Cyplinská.

The separate, larger-looking "legacy still owns" pattern across the 5 healthy
active doctors is **A — NORMAL CONSOLIDATION LAG** (Maklad is the proof case).
The content-validation block on 3 doctors (§14.4) is real but is a content
opportunity, not a routing defect — see CZ-SEO-005 (§15 below), opened as a
separate, higher-priority ticket per reviewer direction.

### 14.8 Implementation gate

**No batch is authorized for Hlavatý / Andrei Lavrov in this pass.** Per the
Cyplinská precedent, database/roster absence is not positive evidence of
retirement — adding either to `GONE_DOCTORS` (or writing any other HTTP
repair) requires first establishing which of CONFIRMED RETIRED / LIVE UNDER
ANOTHER IDENTITY / DATA-MIGRATION GAP actually applies. **Recommendation:
WAIT — flag for a cheap identity-evidence check on future passes** (owner
statement, AuditLog search, cross-market roster search — the same evidence
classes `gone-content.ts` used for Cyplinská), not a routing/code batch.

The active-doctor content-validation finding (§14.6 item 2) is the batch this
pass actually authorizes: **CZ-SEO-005 — Active Czech Doctor Indexability &
Content-Completion Investigation** (see §15) — investigation-only, evaluating
whether Nytra/Kharlamova/Felici have authoritative first-party content
available to complete their profiles.

### 14.9 Measurement baseline

- Hlavatý legacy URL: 573 impr / 2 clicks / pos 10.98 (90d to 2026-08-09),
  trending down (254→92 impr across the two most recent 28d windows per the
  prior audit). Zero live current-URL competitor to compare against today.
  No success criterion defined until disposition is resolved — premature to
  set a target for an unauthorized repair.
- Andrei Lavrov: 18 impr / 2 clicks (90d) — track only, same disposition gap
  as Hlavatý, far lower priority.

### 14.10 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland = no implementation.
Ireland labs = WAIT ~2026-09-08. Czech GP (`gp-consultation-online`) =
CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE, remeasure ~2026-09-08. Czech mental
health = CZ-SEO-002 — NO REAL ASYMMETRY / MONITOR. Czech women's health =
CZ-SEO-003 — EXISTING PAGE / NO DEMAND / NO ACTION.

**NO IMPLEMENTATION / NO DEPLOY / CZ-SEO-004 UPDATE UNCOMMITTED.**

---

## 15. CZ-SEO-005 — Active Czech doctor indexability & content-completion investigation (2026-08-13)

**Mode: investigation only.** No bios written, no `readyToIndex` set, no
credential changes, no manual robots/indexability change, no deploy.

### 15.1 Access ceiling (stated up front)

This pass has **no authenticated admin/CMS/database access** — only the
public site, GSC, and the repository. "Verify from production API/database"
in the ticket is answered as far as public evidence reaches: the public
roster listing, the rendered profile page (title, robots, canonical, visible
bio/services/booking state), and repo-level archived content (datasheets,
prior audits). Anything that would require an authenticated admin session
(raw `editorialChecklist.readyToIndex` DB value, internal "bookable" flag,
onboarding status) is reported as **inferred from public behavior**, not
directly read, and flagged as such below.

### 15.2 Current clinician status (public evidence)

All three — **Dr Gabriele Felici, Dr Michael Nytra, MUDr Nataliya Kharlamova**
— are:
- listed on the live `/czechia/cs/doctors` roster (8 doctors total, scraped
  2026-08-13);
- shown with a "REGISTRACE · OVĚŘENO" (registration verified) badge and a
  real ČLK number on the listing card (Felici `1170392192`, Nytra
  `1164807191`, Kharlamova `5170066188`);
- reachable at a live, 200-status current-shape profile URL with a working
  "Ověřit registraci" (verify registration) link.

But on the **individual profile page**, all three also show, identically:
- generic title "Doctor" (not a specific title like the other 5 active
  doctors' "Praktický lékař"/"Praktická lékařka");
- an "O [Name]" (About) section with **no body text under it**;
- **"Dosud nebyly přiřazeny žádné služby."** — no services assigned;
- **"[Name] momentálně nemá nastavené online rezervace v Czechia."** — no
  online booking slots configured in Czechia.

**This is the ticket's own distinction in practice: administratively
verified (real ČLK registration) but not yet complete as a public,
bookable profile** — no services and no open slots means a patient cannot
currently book any of these three even by finding the page.

### 15.3 Publication predicate re-run

`isPublicDoctorRecordIndexable()` = validation passes AND
`editorialChecklist.readyToIndex === true`. Per-doctor, from the union of
live evidence + the 2026-08-08 migration audit + the 2026-08-09 Screaming
Frog audit (three independent sources, all agreeing):

| Doctor | `readyToIndex` | Bio failure | Credential failure | Blocked-copy failure | Title/name failure | Final indexability |
|---|---|---|---|---|---|---|
| Dr Gabriele Felici | `true` (backfilled 2026-08-08; noindex persists after, so this is confirmed not the blocker) | **Yes — empty** (<120 chars) | No (ČLK verified) | No | No (generic but non-empty) | **noindex — live-confirmed 2026-08-13** |
| Dr Michael Nytra | `true` (same) | **Yes — empty** | No | No | No | **noindex — live-confirmed 2026-08-13** |
| MUDr Nataliya Kharlamova | `true` (same) | **Yes — empty** | No | No | No | **noindex — live-confirmed 2026-08-13** |

The 2026-08-08 audit logged all three as "SHOULD REMAIN NOINDEX (needs
content)" specifically because bio failed independent of the checklist
backfill. The 2026-08-09 Screaming Frog audit independently confirms the
same three URLs are blocked by "Thin/generic fallback bio (auto-generated
'is a Doctor registered in Czechia' description — **no authored profile
content yet**)". Live check 2026-08-13 (this pass) confirms the bio is
**still** empty. **The August 8 diagnosis still holds — nothing has changed.**
No new/different blocker has appeared; this is not case §3's "content
completed but still noindexed for another reason" scenario.

### 15.4 Live-page verification (detail)

All three, current-shape URL, checked 2026-08-13:

| | Felici | Nytra | Kharlamova |
|---|---|---|---|
| HTTP | 200 | 200 | 200 |
| Canonical | self | self | self |
| Robots | `noindex, nofollow` | `noindex, nofollow` | `noindex, nofollow` |
| Sitemap | Absent | Absent | Absent |
| Title | "Dr Gabriele Felici — Doctor · Global Health" | "Dr Michael Nytra — Doctor · Global Health" | "MUDr Nataliya Kharlamova — Doctor · Global Health" |
| H1/name | "Dr Gabriele Felici" | "Dr Michael Nytra" | "MUDr Nataliya Kharlamova" |
| Bio | Empty (no text under "O Dr Gabriele") | Empty (no text under "O Dr Michael") | Empty (no text under "O MUDr Nataliya") |
| Services | None assigned | None assigned | None assigned |
| Booking | No online slots in Czechia | No online slots in Czechia | No online slots in Czechia |
| Registration link | Present, "Ověřený profil" | Present, "Ověřený profil" | Present, "Ověřený profil" |

Not weakening the guard is correct: these are genuinely thin medical-professional
profiles by any reasonable editorial standard, not a false-positive gate.

### 15.5 GSC demand/equity, 90d (query-level, not just page totals)

Page-level totals (§14.2) understate how thin this actually is — pulling
query-level rows for each name shows most of the page-total impressions are
below GSC's per-query reporting threshold (diffuse long tail), not
concentrated branded-name search:

| Doctor | Page-level total (legacy, 90d) | Query-level rows visible | Query quality | Clicks (any URL, any query) | Tier |
|---|---|---|---|---|---|
| Michael Nytra | 140 impr / 15 clicks (`/czechia-doctors/mudr-michael-nytra`, + minor locale variants) | 3 rows, 15 impr total ("dr nytra" 1, "my nytra" 13, "nytra" 1) — genuine but thin name-anchored queries | Real but weak | 15 clicks recorded at page level, **0 at query level** (attribution gap — see note) | **EARLY DISCOVERY** |
| Nataliya Kharlamova | 46+7+1 = 54 impr / 5 clicks | 1 row, 1 impr ("natalya kharlamova") | Almost entirely below query-reporting threshold — diffuse, not concentrated | 5 at page level, 0 at query level | **NO MATERIAL DEMAND** (page-level clicks don't reconcile to any visible branded query) |
| Gabriele Felici | 1 impr / 0 clicks | 4 rows, ~5 impr total, all "mudr gabriele felici" variants | Real but negligible volume | 0 | **NO MATERIAL DEMAND** |

Note on the click/query mismatch (Nytra, Kharlamova): GSC's query-level API
omits rows below its anonymization floor, so page-level clicks can exceed the
sum of visible query rows — this is a reporting artifact, not evidence the
clicks are illegitimate. It does mean the "real" query mix is more diffuse
and less clearly name-branded than the page totals alone suggest, which is
exactly the caution the ticket's §5 asks for.

### 15.6 Redirect equity

All three: legacy `/czechia-doctors/{slug}` → single-hop `308` → current
`/czechia/cs/doctors/{slug}` → `200`, `noindex, nofollow`. No chains, no
locale corruption, no wrong-successor mapping (Felici's legacy slug uses the
old `mudr-` prefix and correctly resolves to the current `dr-gabriele-felici`
slug via the dynamic slug-candidate matcher — verified live, not a defect).
**Exactly the case the ticket names as the significant one**: the redirect
preserves navigation (a human following the legacy link reaches the real,
correct, live profile) but the current profile still cannot enter search
because it's noindexed. Nothing wrong with the redirects themselves.

### 15.7 What content is actually missing, and whether first-party material exists

Repo-wide search for any archived/migration source (`czechia-doctors-datasheet.ts`-style
files, or any other seed/migration record) mentioning any of the three names:
**no matches outside audit docs and test fixtures.** The 2026-08-09 Screaming
Frog audit independently reports the same: "no authored profile content yet"
for all three. Combined with §15.1's access ceiling (no admin/CMS/database
session in this pass to check for an unpublished draft), the correct framing
is a scope limit, not a definitive negative:

**No authoritative biography source found in repository-accessible
first-party data; admin/CMS/owner verification required**, for all three.
Three independent sources (this pass, the 2026-08-08 audit, the 2026-08-09
audit) over five days all found the same empty state *within the surfaces
each could reach* — none had authenticated admin/CMS/database access, so an
unpublished draft or owner-held record cannot be ruled out from this evidence
alone. No fabrication from third-party sources
is proposed or acceptable here, per the ticket's own instruction.

### 15.8 Commercial relevance

All three carry a real, verified ČLK registration and appear on the live
roster — genuinely real, licensed clinicians associated with the Czechia
market, not placeholder/test records. But **zero assigned services and zero
open booking slots** on all three means none is currently bookable through
the platform regardless of indexability. This is a material caveat the
ticket specifically asks to surface (§9): completing the bio alone would
make the page indexable but would **not** make it bookable — service
assignment and availability setup are a separate, additional prerequisite,
likely owned by the same person/team who would supply the bio (clinician
onboarding), but a distinct piece of work from "write the SEO copy."

### 15.9 Per-doctor classification

| Doctor | Classification | Basis |
|---|---|---|
| Michael Nytra | **B — CONTENT-COMPLETION BLOCK, SOURCE MISSING** (best of the three on demand signal, still thin) | Real if weak query demand, verified active/registered, bio + services + booking all incomplete, no first-party source found |
| Nataliya Kharlamova | **B — CONTENT-COMPLETION BLOCK, SOURCE MISSING**, bordering **E — NO MATERIAL SEO VALUE** | Demand is effectively noise at query level; same completeness gap |
| Gabriele Felici | **B — CONTENT-COMPLETION BLOCK, SOURCE MISSING**, bordering **E — NO MATERIAL SEO VALUE** | Near-zero demand (1 impression, 0 clicks, 90d); same completeness gap |

No doctor qualifies for **A** (source exists, ready to complete) from what is
verifiable in this environment — that would require an admin/CMS check this
pass could not perform.

### 15.10 Batch decision: OWNER INPUT REQUIRED

Not "IMPLEMENT EDITORIAL COMPLETION" (would need a confirmed-A case) and not
"NO SEO IMPLEMENTATION" (Nytra's signal, thin as it is, means C/E does not
cleanly dominate). **OWNER INPUT REQUIRED**: someone with admin/CMS access
should (a) confirm no draft bio already sits unpublished in the system before
assuming content must be authored from scratch, and (b) obtain real bio copy
and service/availability setup from the clinicians or clinic ops — content
work, not a code batch. **`CZ-SEO-006` is not proposed in this pass** — the
implementation gate requires a confirmed A, which this pass could not
establish. Recommend a cheap follow-up: one admin-panel check for existing
unpublished draft content on these three records, which would either
upgrade Nytra to A (propose `CZ-SEO-006` then) or confirm B stands.

### 15.11 Hlavatý — cheap check only, status unchanged

No new authoritative identity/disposition evidence surfaced for Hlavatý in
this pass (no repo-level datasheet, no additional GSC/backlink signal beyond
§14.3). Status remains **UNRESOLVED IDENTITY / DATA STATE** — not 410'd, not
restored, not redirected elsewhere.

### 15.12 Measurement baseline

- Nytra: 140 impr / 15 clicks (legacy, 90d), 0 on current shape. Baseline to
  beat if content is ever completed: current URL should start owning
  `nytra`-family queries and total clinician-query volume should hold or grow.
- Kharlamova: 54 impr / 5 clicks (legacy, 90d), effectively no clean query
  signal — track, do not prioritise ahead of Nytra.
- Felici: 1 impr / 0 clicks (legacy, 90d) — lowest priority of the three.

### 15.13 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland = no implementation.
Ireland labs = WAIT ~2026-09-08. Czech GP = CZ-SEO-001 — RANKING RAMP /
WAIT-MEASURE, remeasure ~2026-09-08. Czech mental health = CZ-SEO-002 — NO
REAL ASYMMETRY / MONITOR. Czech women's health = CZ-SEO-003 — EXISTING PAGE /
NO DEMAND / NO ACTION. Czech doctor legacy consolidation = CZ-SEO-004 —
Hlavatý/Lavrov UNRESOLVED IDENTITY / DATA STATE (§14), 5 healthy active
doctors NORMAL CONSOLIDATION LAG.

**NO IMPLEMENTATION / NO DEPLOY / CZ-SEO-005 UPDATE UNCOMMITTED.**

---

## 16. CZ-SEO-006 — Czech active doctor public-supply & first-party content resolution (2026-08-13)

**Mode: read-only investigation.** No doctor-content writing, no database
writes, no `readyToIndex`/roster/service/schedule/indexability changes, no
deploy. CZ-SEO-005 closed separately (commit `7f933acc`, pushed to
`origin/Dev-hassaan`) before this pass began.

### 16.1 Data sources inspected

- **Production database, read-only** — `Doctor`, `DoctorTranslation`,
  `DoctorCountry`/`DoctorMarketTranslation`, `ServiceDoctor`,
  `DoctorAvailability`, `DoctorTimeSlot`, `Appointment`, `AuditLog`, queried
  via Prisma `findMany`/no writes, run with `backend/.env` (production
  `DATABASE_URL`) through a one-off script kept at
  `backend/scripts/investigate-cz-doctor-supply.ts` (uncommitted, read-only).
  This supersedes CZ-SEO-005's "no admin/CMS/database access" ceiling
  (§15.1) — that ceiling has been lifted for this pass.
- **Admin API** — not separately queried. The direct DB read already covers
  every table the admin API surfaces for this question, at higher fidelity
  (raw `editorialChecklist`, raw `AuditLog.metadata`), so a second read
  through the API layer would be redundant.
- **Application code** — `backend/src/modules/doctors/doctors.service.ts`
  (`listDoctors`, `getDoctorByCountryAndSlug`) read directly to determine the
  actual roster/detail-page query predicates (§16.4).
- **GSC 90-day query data** — not re-pulled; CZ-SEO-005 §15.5's 2026-08-13
  extraction is carried forward unchanged (no production change occurred
  between the two same-day passes that would move it).
- **Public site** — not re-scraped separately; CZ-SEO-004/005's 2026-08-13
  live-pass results (§14.1, §15.4) are the same-day baseline.

### 16.2 Per-doctor business/public-supply state

| Doctor | `active` | `DoctorCountry` (CZ) | `assignedServices` | `DoctorAvailability` rows | Recent `DoctorTimeSlot` rows | Historical appointments |
|---|---|---|---|---|---|---|
| Dr Gabriele Felici | `true` | active, verified, ČLK `1170392192` | **0** | **0** | **0** | 1, `COMPLETED`, 2026-01-28 |
| Dr Michael Nytra | `true` | active, verified, ČLK `1164807191` | **0** | **0** | **0** | 1, `COMPLETED`, 2026-02-17 |
| MUDr Nataliya Kharlamova | `true` | active, verified, ČLK `5170066188` | **0** | **0** | **0** | 2, `COMPLETED`, 2026-02-16 (×2) |

All three carry `legacyMongoId` (legacy-imported records, not test/native
placeholders) and a linked `User` login (`DOCTOR_INVITED` AuditLog rows show
a real `userId` + `emailed: true` for each, 2026-07-17). The completed
appointments predate the Doctor rows' own `createdAt` (2026-07-15) — they
were migrated in alongside the doctor record, i.e. **genuine pre-migration
consultation history**, not fabricated activity.

**Classification: PUBLIC PROFILE, NOT CURRENTLY BOOKABLE, for all three.**
Zero slots is **not** a temporary scheduling gap — there are zero
`DoctorAvailability` windows configured at all, so there is nothing to
generate slots from. This is a structural absence, confirmed by AuditLog:
each doctor has exactly two `DOCTOR_UPDATED` events (2026-07-17 creation,
2026-07-26 bulk field-normalization pass) and neither event's `changed`
field list includes `bio`, `translations`, or anything service/availability
related — content and scheduling setup were never touched after the initial
invite, for any of the three.

### 16.3 Biography-source resolution

**C — NO FIRST-PARTY BIO SOURCE FOUND**, for all three, with one residual
caveat stated below. Database evidence (not just repo evidence, correcting
CZ-SEO-005 §15.1's access ceiling):

- `Doctor.bio` = empty, `DoctorTranslation` = **0 rows**,
  `DoctorMarketTranslation` (CZ market row) = **0 rows**, for all three —
  not merely blank strings, no locale rows exist at all.
- Every `AuditLog` entry for all three doctors is reproduced in full in
  §16.2 — no entry's `changed` list ever includes `bio` or `translations`.
- Direct contrast with Hlavatý (§16.8): his 2026-06-29 `DOCTOR_UPDATED`
  creation event's `changed` list explicitly includes `"title","bio",
  ...,"translations"` — i.e. the audit trail shows content *was* actively
  authored for him at creation time, and shows it *was not* for any of the
  three CZ-SEO-006 doctors, ever.

**Residual caveat:** a doctor-portal self-edit path or an out-of-band script
(the `editorialChecklist.readyToIndex` backfill itself left no `AuditLog`
trail, confirming scripts can write around the audit log) could in
principle have set and then cleared content without a surviving trace. This
is why the classification is **C**, not an absolute-zero certainty — but
every surface actually inspected (repo, DB content columns, DB audit trail)
agrees on empty, so C is the correct call, not D.

### 16.4 Why these profiles are on the public roster despite noindex / no services / no slots

Roster inclusion, indexability, and bookability are governed by **three
independent predicates**, confirmed by reading the query code directly:

1. **Roster inclusion** (`listDoctors`, `doctors.service.ts:379-380`) —
   `where: { active: true }` only. No filter on `readyToIndex`, content
   completeness, assigned services, or availability.
2. **Detail-page existence** (`getDoctorByCountryAndSlug`,
   `doctors.service.ts:660-681`) — same `active: true` gate (+ country
   active). This is also the exact mechanism behind Hlavatý's current-URL
   404 — see §16.8.
3. **Indexability** (`isPublicDoctorRecordIndexable`,
   `frontend/lib/content/publication-validation.ts`, per CZ-SEO-004 §14.4)
   — a separate, later check applied at render/sitemap time on top of an
   already-active, already-existing record.
4. **Bookability** — a fourth, independent gate enforced by the booking
   flow: `assignedServices` + `DoctorAvailability` + open `DoctorTimeSlot`
   rows, unrelated to the other three.

**This is deliberate product architecture** (four orthogonal gates), not a
routing bug and not stale data. The specific reason these three sit at
"active + verified + zero content + zero services" is best read as
**incomplete/stalled onboarding**: `DOCTOR_INVITED` fired for all three on
2026-07-17 (accounts created, invite emails sent), but no subsequent
content-authoring, service-assignment, or availability-setup step was ever
completed — while the sibling cohort onboarded in the same window (Černý,
Maklad, Pavlů, Holz, Islam, and Hlavatý — see §14.4, §16.8) all did receive
full content + service + availability setup. That makes this a genuine
**product/operations state inconsistency** for these three specifically,
not a defect in the roster/indexability/bookability mechanism itself.

### 16.5 SEO/business priority

Ranking these three by legacy-URL GSC impressions alone (Nytra 140,
Kharlamova 54, Felici 1 — CZ-SEO-005 §15.5) would reward search visibility
for pages that currently cannot be booked through, which is exactly the
mis-prioritization the ticket warns against (§6). Correct framing:
**bookability-readiness gates priority, not demand.** Demand only becomes
relevant *after* a doctor is confirmed as intended live supply and
service/availability setup is completed — at that point Nytra (real, if
thin, click-through demand: 15 clicks recorded) would be the clear priority
of the three; Kharlamova and Felici would remain low-priority even then
(CZ-SEO-005 §15.5: demand at or below GSC's query-reporting noise floor for
both).

### 16.6 Per-doctor decision

| Doctor | Decision | Basis |
|---|---|---|
| Dr Michael Nytra | **D — PRODUCT/OPERATIONS STATE NEEDS RESOLUTION** | Verified, real clinician with real (thin) demand and genuine prior consultation history, but zero services/availability — an onboarding gap, not a content gap. Would become the strongest **B** candidate once onboarding is resolved. |
| MUDr Nataliya Kharlamova | **D — PRODUCT/OPERATIONS STATE NEEDS RESOLUTION** | Same onboarding gap; demand is effectively noise (§16.5), so even once resolved this borders **E**. |
| Dr Gabriele Felici | **D — PRODUCT/OPERATIONS STATE NEEDS RESOLUTION** | Same onboarding gap; near-zero demand (1 impression, 0 clicks, 90d), lowest priority of the three even once resolved. |

No doctor reaches **A** or a clean **B** this pass — the immediate blocker
for all three is the roster-vs-bookability conflict (§16.4), which sits
upstream of "does a biography source exist."

### 16.7 Implementation gate

**`CZ-SEO-007` is NOT justified this pass.** No doctor lands on A, and B
would understate the actual blocker: writing a bio alone (even with an
owner-supplied source) would make a page indexable-eligible while still
advertising a doctor with zero assigned services and zero booking slots —
directly conflicting with product intent (a patient could find but never
book). **Recommended next step, ownership-level, not content or code**:
confirm for each of the three whether onboarding is meant to be completed
(intended live supply — then complete content + services + availability
together, one editorial/ops batch) or whether the record should be paused
(`active = false`, mirroring Hlavatý's mechanism — an ops decision, not an
SEO one). Once that ownership decision lands, re-run this ticket's content
question (§16.3) only for whichever doctor(s) are confirmed as intended
supply — that is the trigger condition for a future `CZ-SEO-007`.

### 16.8 Hlavatý — new positive disposition evidence

**New evidence found — status changes from CZ-SEO-004/005's "UNRESOLVED
IDENTITY / DATA STATE."** `AuditLog` (`entityType=Doctor`,
`entityId=cmqz4zqju007j01luo8hq12bk`) shows:

```
2026-08-12T10:03:29.828Z  DOCTOR_DEACTIVATED  actorRole=ADMIN  metadata=null
```

— one day before CZ-SEO-004/005's 2026-08-13 live pass. `Doctor.active` is
now `false`. Both `listDoctors` and `getDoctorByCountryAndSlug` (§16.4)
gate on `active: true`, so this single field flip **mechanically explains**
both his absence from the live roster (§14.1) and his current-shape URL's
404 (§14.3) — no routing defect, no migration/data gap. His underlying
record is otherwise fully intact: bio authored in **6 locales**, **13**
active `assignedServices`, a full 6-day `DoctorAvailability` schedule, and
`DoctorTimeSlot` rows still `OPEN` as far out as **2026-09-07** — this is
not what a stale or corrupted record looks like; it is a complete, live-
ready profile that was deliberately switched off.

**Disposition: does not cleanly match any of the three original candidates**
(CONFIRMED RETIRED / LIVE UNDER ANOTHER IDENTITY / DATA-MIGRATION GAP —
ruled out, record is intact). The positive fact established is narrower and
different: **ADMIN-DEACTIVATED, 2026-08-12, reason not logged**
(`metadata: null` on the `DOCTOR_DEACTIVATED` row, unlike every other
`DOCTOR_UPDATED` row for him which does carry a `changed`/`registration`
payload). This is a real, deliberate, recent business action — not a data
defect — but *why* (retirement, temporary suspension pending review, or an
erroneous click) is not established by any source available to this pass.

**No HTTP/roster repair authorized.** Recommended next step: a single
ownership question to whoever deactivated the record on 2026-08-12 — same
"cheap check" spirit as CZ-SEO-005's recommendation, now narrowed from
"was he ever real" (answered: yes, extensively) to "why was he turned off
one day before this audit, and is it permanent." Legacy-URL equity (573
impr / 2 clicks, 90d) stays parked either way until that answer lands.

### 16.9 Measurement baseline (carried, unchanged)

Same as CZ-SEO-005 §15.12 — Nytra 140/15, Kharlamova 54/5, Felici 1/0
(legacy, 90d) — no new GSC pull this pass (§16.1).

### 16.10 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland = no
implementation. Ireland labs = WAIT ~2026-09-08. Czech GP = CZ-SEO-001 —
RANKING RAMP / WAIT-MEASURE, remeasure ~2026-09-08. Czech mental health =
CZ-SEO-002 — NO REAL ASYMMETRY / MONITOR. Czech women's health = CZ-SEO-003
— EXISTING PAGE / NO DEMAND / NO ACTION. Czech doctor legacy consolidation =
CZ-SEO-004 — Andrei Lavrov UNRESOLVED IDENTITY / DATA STATE unchanged (not
in DB under any searched name spelling this pass — out of this ticket's
scope), 5 healthy active doctors NORMAL CONSOLIDATION LAG. Hlavatý —
upgraded from UNRESOLVED IDENTITY / DATA STATE to **ADMIN-DEACTIVATED
2026-08-12, REASON UNCONFIRMED** (§16.8). Active-doctor content gap =
CZ-SEO-005 — superseded by this ticket's finer-grained per-doctor D
classification (§16.6).

**NO DATA WRITES / NO SEO IMPLEMENTATION / NO DEPLOY / CZ-SEO-006 UPDATE
UNCOMMITTED.**

---

## 17. CZ-SEO-007 — Czech travel-medicine duplicate URL & search-ownership investigation (2026-08-13)

**Mode: read-only investigation.** No redirects, no canonical changes, no page
deletion, no metadata/content edits, no CMS publication changes, no deploy.
CZ-SEO-006 closed separately (commit `505b9011`, pushed to
`origin/Dev-hassaan`) before this pass began.

### 17.1 The alleged duplicate pair, resolved exactly

Source: §10.3's opportunity map (`Travel medicine` row, 2026-08-12), the only
place in the repo's evidence trail naming this pair. Not resolved from memory
— cross-checked against `frontend/next.config.ts`, the CZ localized-slug
migration script, the live sitemap and a live Googlebot-UA fetch.

| | `cestovni-medicina-praha` | `travel-health-prague` |
| --- | --- | --- |
| Full cs URL | `/czechia/cs/services/cestovni-medicina-praha` | `/czechia/cs/services/travel-health-prague` |
| HTTP (live probe, Googlebot UA) | 200 | **308** → the cestovni URL |
| CMS/service identity | Live `Service` row, CZ market | **Same row** — not a second service |
| Sitemap | Yes, all 6 locale variants | No |
| Canonical (declared) | Self | n/a (redirect, no page to canonicalize) |
| Robots | `index, follow` | n/a |

**These are not two services or two CMS pages — they are one Service row
under its current slug, plus a legacy English slug kept alive only as a
`next.config.ts` redirect rule.** `backend/scripts/migrate-localized-service-slugs.ts`
(also mirrored in `frontend/next.config.ts:557`) **renames the Service row's
`slug` column in place** (`UPDATE ... SET slug = newSlug`, in a transaction,
idempotent) — it does not create a second row. The script's own conflict
guard (`!! CONFLICT ${newSlug} held by ACTIVE ${holder.id}`) is the only path
that could have produced a genuine second live row, and nothing in the repo
or live site shows that path was taken for this slug. The redirect rule
(`"travel-health-prague": "cestovni-medicina-praha"`) was added in commit
`79083081`, **2026-07-19**, alongside `/services` and `/consult` coverage.
Live probe confirms both sections 308 correctly today, including
`/czechia/en/services/travel-health-prague` (also 308, same target family).

### 17.2 Live intent/content comparison

Only one page exists to compare — the redirect target. Live fetch,
Googlebot UA, 2026-08-13:

- **Title:** "Cestovní medicína online | Předpis na malárii a příprava na cestu"
- **Meta description:** malaria-prevention medical prep for travel; explicit
  that antimalarials are prescription-only and not available at a
  vaccination center; ČLK-registered doctor risk assessment + eReceipt;
  same-day appointment.
- **H1:** "Cestovní medicína — předpis na malárii a příprava na cestu online"
- **Robots:** `index, follow`. **Canonical:** self.
- **hreflang cluster:** 6 locales (cs/en/pt/es/ro/de) + `x-default` → cs, all
  present in the sitemap.

**Classification: not a duplicate-content question at all — there is one
document.** The "duplicate" is a live URL vs. a dead URL that still returns a
body via redirect, not two competing pieces of content.

### 17.3 GSC demand and query×page ownership

Fresh pull, `get_search_console_performance`, 90-day window
**2026-05-09 → 2026-08-09** (`dataState=all`, last complete date consistent
with §1's lag note), `page` dimension, filtered per URL family:

| Page (all locales) | Clicks | Impr | Notes |
| --- | ---: | ---: | --- |
| `cestovni-medicina-praha` — cs | 2 | 20 | pos 13.0 |
| `cestovni-medicina-praha` — pt | 0 | 9 | pos 23.4 — Portuguese-language queries landing on the CZ market's page (§17.3 note below) |
| `cestovni-medicina-praha` — de/en/es/ro | 0 | 9 (combined) | pos 4.5–75.7, all ≤3 impressions each |
| `cestovni-medicina-praha` total | **2** | **38** | — |
| `travel-health-prague` (legacy) — cs | 2 | 43 | pos 11.6 |
| `travel-health-prague` (legacy) — en | 0 | 19 | pos 8.0 |
| `travel-health-prague` total | **2** | **62** | — |

Query-level breakdown is mostly withheld by GSC's own low-count anonymization
(query×page pull for both URL families returns only 8 named rows combined,
covering ~10 of the 100 total impressions) — **there is no identifiable
commercial query cluster to test for cannibalization; the visible fragments
are noise** (a bare "ano", "antimalarika cena" at position 2 with 1
impression/0 clicks, "do they speak english?", and four Portuguese
"consulta do viajante" variants that are themselves a locale-mismatch
curiosity, not commercial signal). Daily time series for `travel-health-prague`
(16-month pull) shows **zero impressions before 2026-07-19** and a thin,
continuous trickle from **2026-07-19 through 2026-08-09** (1–7/day) — i.e.
the legacy URL's GSC activity starts the same day the redirect rule shipped
and has continued since, not a residual tail from before the migration.

**Per rule 4: do not manufacture a commercial cluster where GSC contains
none.** At ~100 combined impressions and 4 clicks over 90 days, this is
sub-material demand by this document's own standard (compare §2's country
scoreboard, where whole-market Czechia is 90 clicks/1,891 impressions in 28
days) — thinner than every other Czech content-gap row in §10.3 except the
tools cluster.

### 17.4 Cannibalization test

Applying the four-part test from the ticket:

1. Intent materially overlaps — **trivially yes**, since both URLs render/
   redirect to the same content.
2. Both URLs participate in the same query family — **weakly**; the two
   named cs queries visible in GSC ("ano", "cestovní medicína") are
   split one-each across the two URLs, but the sample is too small (2
   queries) to establish a real family.
3. Ownership unstable/split, or the wrong URL wins — **the legacy URL
   currently draws more impressions in GSC's own attribution** (62 vs. 38
   combined; cs 43 vs. 20) — superficially matching "wrong URL wins."
4. Consolidation plausibly improves clarity — **no**: the correct
   consolidation (a 308 to the canonical, self-canonical target, full
   hreflang cluster, sitemap inclusion) **already shipped** on 2026-07-19.
   There is nothing left to consolidate in code.

**Verdict: NOT true cannibalization.** Condition 4 fails outright — this
document does not classify "Google hasn't yet processed an already-correct
redirect" as cannibalization anywhere else (see §6 watchlist: Hlavatý,
Telmo Coelho, the Ireland sick-cert/atestado pairs, `ie-medical-consultation`
— all show the identical "legacy URL still earning impressions/clicks despite
a live, correct 308" pattern, all classified WAITING FOR GOOGLE, none
classified as cannibalization or given a redirect/canonical implementation
beyond the one already shipped).

### 17.5 URL Inspection / canonical evidence

`inspect_urls`, 2026-08-13, all three relevant URLs:

| URL | Verdict | Coverage | Google's canonical | Last crawl | Referring URLs |
| --- | --- | --- | --- | --- | --- |
| `.../services/travel-health-prague` (cs) | PASS | Submitted and indexed | **itself** (not yet flipped to "Page with redirect") | **2026-07-18** — one day *before* the redirect rule shipped | `/czechia` (bare, unlocalized — itself now a 308 to `/czechia/cs`, per §3's canonicalisation table; stale referrer) |
| `.../services/cestovni-medicina-praha` (cs) | PASS | Submitted and indexed | self, matches user canonical | 2026-07-20 | `/general-consultation-cz` (legacy alias, itself a 308 → `/czechia/cs/gp-consultation-online` — live-probed this pass), sitemap.xml |
| `.../services/travel-health-prague` (en) | PASS | Submitted and indexed | itself | 2026-07-19 | `/czechia/cs/services/travel-health-prague` |

**Google has not recrawled the legacy cs URL since before the redirect
existed.** This is the same mechanism documented throughout §5/§6 for every
other legacy-slug consolidation in this repo — a live, correct redirect that
Google's index has not yet caught up to. It is not evidence of a routing
defect, a wrong canonical, or competing live content.

### 17.6 Internal-link ownership

Live-probed CZ homepage (`/czechia/cs`) and repo-wide grep, 2026-08-13:

- `/czechia/cs` links to the current-shape URL **three times** (two nav/body
  anchors + one `/czechia/cs/book?service=cestovni-medicina-praha` CTA).
  **Zero** live anchors to `travel-health-prague` anywhere in production
  markup.
- Repo-wide grep for the legacy slug outside `next.config.ts` and the
  migration script returns only Next.js's auto-generated `routes.d.ts`
  typegen artifacts (build output, not authored links, not shipped markup).
- `cestovni-medicina-praha` is not hardcoded anywhere in `frontend/` — it is
  entirely CMS-driven through the generic `[serviceSlug]` route, same
  architecture as every other service page in the catalog.

**No conflicting internal-link signal exists in production.** Google's
stale self-canonical on the legacy URL is explained entirely by crawl
timing (§17.5), not by any current internal link still pointing at it.

### 17.7 Bookability / product state

`cestovni-medicina-praha` renders a full booking CTA
(`/czechia/cs/book?service=cestovni-medicina-praha`) on the live page and
sits in the same CZ consult/services catalog architecture as
`neschopenka-online`, `lekar-online-praha` and the rest of §10.3's Czechia
map — none of which carry any open bookability question in this document.
No indication of a CZ-SEO-006-style onboarding gap (that pattern was
doctor-record-specific: zero `DoctorAvailability`/`assignedServices` rows).
A full DB dive was judged disproportionate to a sub-100-impression cluster
with no positive signal of a supply problem; not performed this pass.

### 17.8 Targeted SERP

Not re-run this pass — §10.3's live-SERP finding from the same 2026-08-12
rebaseline already answers this question and nothing in production changed
since: **100% local-pack + vaccination-clinic organic results, zero
telehealth competitors in the top 20** for the Czech travel-medicine query
set. This is a page-type/business-model wall (patients search this as a
"where do I get a travel vaccine near me" local-intent query, not a
telehealth query), independent of and orthogonal to the duplicate-URL
question this ticket was scoped to resolve.

### 17.9 Primary classification

**Corrected 2026-08-13 (COUNTRY-WAVE-001-CLOSE): E — INDEXING/CRAWL
TRANSITION / NORMAL REDIRECT RECRAWL LAG** (superseding this section's
original G call — G's "different technical defect" framing overstated it;
there is no defect, just Google not yet having recrawled a correct fix).

- Old slug (`travel-health-prague`) and new slug (`cestovni-medicina-praha`)
  are **one `Service` row** — the migration script renames the slug column
  in place, it does not create a second row (§17.1).
- The legacy URL **already 308s directly** to the current canonical, both
  `/services` and `/consult`, one hop, correct target (§17.1, §17.5).
- **No live legacy internal links** anywhere in production — the CZ
  homepage and every grepped source link only the current slug (§17.6).
- Google's legacy-canonical evidence is a crawl dated **2026-07-18**, one day
  **before** the 2026-07-19 redirect shipped (§17.5) — stale-by-construction,
  not a live conflict.
- **No duplication and no cannibalization** — see §17.4; condition 4
  (consolidation would improve clarity) fails outright since the correct
  redirect is already live.
- **Recheck ~2026-09-01**, aligned with the existing §6 watchlist cadence.
- **No implementation** — nothing to redirect, canonicalize, retarget or
  noindex that isn't already correct in production.

Not A/B/C/D under this ticket's original G-track reasoning (§17.4, still
valid): no true cannibalization, no product-state problem, no live
duplicate-URL shape, and the canonical page is not "too new" (crawled
2026-07-20, 3+ weeks of history). Not F outright, since ~100 impressions/90d
is not literally zero — but it is thin enough that no implementation is
justified regardless.

### 17.10 CZ-SEO-008 — not proposed

**No implementation gap exists to propose one for.** The correct fix — a
308 from the legacy English slug to the canonical Czech slug, covering both
`/services` and `/consult`, self-canonical target, full hreflang cluster,
sitemap-eligible — **already shipped in commit `79083081` on 2026-07-19**.
The only remaining state is Google's own recrawl of a URL it indexed one day
*before* that fix landed. There is nothing left to redirect, canonicalize,
retarget or noindex. Add both URLs to the existing §6 indexation watchlist
(same recheck cadence, next due 2026-09-01) rather than opening a new
ticket; escalate only if `travel-health-prague`'s last-crawl date fails to
advance past 2026-07-19 by the next recheck **and** Google's verdict is
still self-canonical rather than "Page with redirect."

### 17.11 Control-state carry-forwards (unchanged by this pass)

Global Foundation = VERIFIED / MONITOR EXCEPTIONS. Ireland labs = WAIT
~2026-09-08. Czech GP = CZ-SEO-001 — RANKING RAMP / WAIT-MEASURE, remeasure
~2026-09-08. Czech mental health = CZ-SEO-002 — NO REAL ASYMMETRY / MONITOR.
Czech women's health = CZ-SEO-003 — EXISTING PAGE / NO DEMAND / NO ACTION.
Czech doctor supply (Felici / Nytra / Kharlamova) = CZ-SEO-006 — D,
PRODUCT/OPERATIONS STATE NEEDS RESOLUTION, frozen pending an ownership
decision — not reopened this pass. Hlavatý = ADMIN-DEACTIVATED 2026-08-12,
REASON UNCONFIRMED — frozen, not reopened this pass.

**§6 watchlist addition (both new rows, not yet applied to §6 — see note
below):**

| URL | Production state | Google's stored state | Last crawl | Status |
| --- | --- | --- | --- | --- |
| `/czechia/cs/services/travel-health-prague` | 308 → `.../cestovni-medicina-praha` (live since `79083081`, 2026-07-19) | Self-canonical, "Submitted and indexed" | **2026-07-18** (pre-dates the fix by 1 day) | WAIT FOR GOOGLE (added 2026-08-13, CZ-SEO-007) |
| `/czechia/en/services/travel-health-prague` | 308 → `.../cestovni-medicina-praha` (en) | Self-canonical, "Submitted and indexed" | 2026-07-19 | WAIT FOR GOOGLE (added 2026-08-13, CZ-SEO-007) |

*Note: these two rows describe the intended §6 addition; the actual §6 table
edit is deferred to keep this section's diff isolated for review — apply
verbatim to §6 when this ticket's docs commit is authorized.*

**NO IMPLEMENTATION / NO DEPLOY / CZ-SEO-007 UPDATE UNCOMMITTED.**

---

## 18. COUNTRY-WAVE-001-CLOSE — Ireland mental-health legacy canonical resolution (2026-08-13)

**Mode: narrow read-only investigation.** No redirects, no canonical changes,
no content edits, no deploy.

### 18.1 URL family, resolved exactly

Not guessed — resolved from `frontend/next.config.ts`, live Googlebot-UA
probes, the sitemap, and GSC.

| URL | Role |
| --- | --- |
| `/ireland/en/services/mental-health-consultation` | **Current canonical.** In sitemap (6-locale hreflang cluster: en/pt/es/cs/ro/de), self-canonical, `index, follow`. |
| `/ireland/mental-health-assessment-consultation` | **Legacy Wix-shape URL**, bare `/ireland/{slug}`. 308 → the current canonical, single hop (verified live). Not in sitemap. |
| `/es/ireland/mental-health-assessment-consultation` | **Locale-prefixed legacy variant.** 308 → the current canonical (as of the 2026-07-30 fix — see §18.6). Not in sitemap. Near-dead in GSC (2 impressions/90d, pos 89.5). |
| `/ireland/{cs,es,pt,ro}/services/mental-health-consultation` | Sibling-locale current-shape pages, all in sitemap, all thin but present in GSC. |

No other legacy slug for this service was found (repo-wide grep, sitemap,
GSC page-dimension pull all agree on this one legacy shape plus its
locale-prefixed variant).

### 18.2 Live HTTP migration signals

All live-probed 2026-08-13, Googlebot UA:

| URL | HTTP | Hops | Final target | Final status | Canonical (declared) | Robots | hreflang | Sitemap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/ireland/mental-health-assessment-consultation` | 308 | 1 | `/ireland/en/services/mental-health-consultation` | 200 | self (target page) | `index,follow` (target) | 6-locale cluster (target) | No (legacy) / Yes (target) |
| `/es/ireland/mental-health-assessment-consultation` | 308 | 1 | same target | 200 | same | same | same | No (legacy) / Yes (target) |

**Healthy migration shape confirmed: legacy → one permanent redirect → exact
current canonical.** No chain, no wrong target, no 200 legacy duplicate, no
redirect-to-home/directory, no locale mismatch. (An earlier, cruder rule
shipped 2026-07-24 sent the locale-prefixed variant to a generic specialist
hub instead of the exact page — see §18.6 — but that was superseded 6 days
later and is not live today.)

### 18.3 90-day GSC ownership

Extraction 2026-08-13, `dataState=all`, window **2026-05-10 → 2026-08-10**
(latest complete date consistent with the doc's standard 3-day lag).

| Page | Clicks | Impr | CTR | Avg pos |
| --- | ---: | ---: | ---: | ---: |
| `/ireland/en/services/mental-health-consultation` (current) | **1** | **82** | 1.2% | 20.1 |
| `/ireland/mental-health-assessment-consultation` (legacy bare) | 0 | 50 | 0% | 41.8 |
| `/es/ireland/mental-health-assessment-consultation` (legacy es) | 0 | 2 | 0% | 89.5 |
| `/ireland/{cs,es,pt,ro}/services/mental-health-consultation` (current, other locales) | 0 | 21 (combined) | 0% | 4.3–12.75 |

**Current already owns 61% of combined impressions and the only click.**
This corrects the original Country Wave 1 note's "single-digit impressions"
characterization — the legacy URL's real 90-day volume is 50 impressions,
not single digits — but the ownership direction it flagged (Google still
showing the legacy URL) is real, just not dominant.

Query×page attribution (26 rows, `contains: mental-health`) shows the
overlapping query set directly: "mental health assessment," "mental health
assessment ireland," "mental health assessment specialists," "mental health
evaluation," and "psychiatric assessment ireland" all appear on **both**
URLs. **On every one of these shared queries, the current page ranks better
than the legacy page** (e.g. "mental health assessment ireland": current
pos 16 vs. legacy pos 40; "mental health assessment specialists": current
pos 29.75 vs. legacy pos 40.5). The legacy page has never converted a
click in this window; the current page has one.

**Ownership is transitioning, in the current page's favor, not stuck.**

### 18.4 URL Inspection / canonical evidence

`inspect_urls`, 2026-08-13:

| URL | Verdict | Coverage | User canonical | Google canonical | Last crawl | Referring URLs |
| --- | --- | --- | --- | --- | --- | --- |
| `/ireland/mental-health-assessment-consultation` | PASS | Submitted and indexed | current-shape page (declared correctly) | **itself** — Google overrides the declared canonical | **2026-05-29** | `/general-consultation-ie` (itself now a 308 → `/ireland/en/gp-consultation-online`, live-probed this pass — a second-order stale referrer) |
| `/ireland/en/services/mental-health-consultation` (current) | PASS | Submitted and indexed | self | self, matches | **2026-08-12** | `/ireland/en` (homepage), `/ireland/ro/services/mental-health-consultation` (sibling locale) |
| `/es/ireland/mental-health-assessment-consultation` | PASS | Submitted and indexed | itself (no redirect target declared at last crawl) | itself | **2026-05-02** | none |

**Google has not recrawled either legacy URL since before either redirect
fix shipped.** The bare legacy URL's last crawl (05-29) predates the
correct exact-target fix (07-30) by two months and even predates the
current page's own ranking ramp (first GSC impression 07-18). The
locale-prefixed legacy URL's last crawl (05-02) predates the *first*
redirect attempt for it (07-24) by nearly three months, and its
`userCanonical` at that stale snapshot is itself — consistent with it
having no redirect at all yet at crawl time.

### 18.5 Timeline

| Event | Date |
| --- | --- |
| Google's last recorded crawl of `/es/ireland/mental-health-assessment-consultation` | 2026-05-02 |
| Google's last recorded crawl of `/ireland/mental-health-assessment-consultation` (bare) | 2026-05-29 |
| First redirect for the locale-prefixed shape shipped (`126a84e3`) — to a generic specialist hub, not the exact page | 2026-07-24 |
| Current page's first GSC impression | 2026-07-18 |
| Correct exact-target redirect shipped for both bare and locale-prefixed shapes (`699a89b2`) | 2026-07-30 |
| Google's last recorded crawl of the current-shape page | 2026-08-12 |
| Today (this investigation) | 2026-08-13 |

**Reading:** both legacy crawls predate both redirect fixes by weeks to
months. Google simply has not recrawled either legacy URL since the site's
current migration state (whichever version of it) existed — this is
**normal migration lag**, not a persistent post-fix conflict, because there
has been no post-fix crawl to be persistent about yet.

### 18.6 Internal links and sitemap

- Sitemap contains **only** the current-shape URL, all 6 locales — confirmed
  by live sitemap fetch, zero legacy rows.
- Ireland homepage (`/ireland/en`) links the current-shape URL twice (nav/
  body anchor + `/ireland/en/book?service=mental-health-consultation` CTA).
  Zero anchors to either legacy shape.
- Repo-wide grep for the legacy slug outside `next.config.ts` and Next's
  typegen build artifacts returns exactly one hit:
  `frontend/data/routes.ts:79`, a static Wix-migration checklist file
  ("Route inventory mirrored from README... implement gradually") with
  **zero importers anywhere in the codebase** — the same dead-code pattern
  already documented for `lib/seo/page-seo.ts` in §5
  (`SEO-FOUNDATION-001-E`). It renders nothing and links nothing live.
- **Quantified remaining live legacy links: zero.**

### 18.7 Content/product identity

The legacy slug (`mental-health-assessment-consultation`) and current slug
(`mental-health-consultation`) represent the **same service** — this is a
same-service Wix-era slug simplification, the identical pattern used
site-wide for every other Ireland/CZ/PT/RO legacy-to-current rename in this
document (§10.1's redirect table, the CZ localized-slug map in §17.1, etc.),
not a case of two distinct services being conflated. The current page's
query set ("mental health assessment," "psychiatric assessment ireland,"
"mental health evaluation") is squarely the same patient intent the legacy
slug's own name describes. No broader content audit performed or needed —
out of this ticket's scope per its own instruction.

### 18.8 Root-cause classification

**A — NORMAL REDIRECT / CANONICAL REPROCESSING LAG.** Migration signals are
clean (§18.2: single hop, correct exact target, verified live for both
shapes), the legacy crawl evidence predates both redirect fixes by weeks to
months (§18.4, §18.5), and query×page attribution already shows the current
page winning every shared query and the majority of total impressions
(§18.3) despite Google's stale canonical record. Not B (redirect is clean).
Not C (no post-fix crawl exists yet to conflict with anything). Not D (zero
live internal legacy links, §18.6). Not E (same service, same intent,
§18.7). Not F (50 impressions/90d on the legacy URL is real, not
negligible — it just isn't evidence of a defect).

### 18.9 Implementation gate

**A → close as WAIT/MONITOR. No `IE-SEO-001` proposed** — there is no
redirect, canonical, internal-link or content defect to repair; the code is
already correct and verified live. Recheck alongside the next scheduled
`inspect_urls` pass (§6 cadence, next due 2026-09-01): escalate only if by
then the legacy bare URL's last-crawl date has advanced past 2026-07-30
**and** Google's `googleCanonical` is still self-selecting the legacy URL
rather than resolving to the current page.

### 18.10 Country Wave 1 closure

All IE + CZ open items reassessed against current evidence:

| Item | State |
| --- | --- |
| Ireland sick certificate | MONITOR (unchanged) |
| Ireland labs | WAIT ~2026-09-08 (unchanged) |
| Ireland general GP | Authority wall / no action (unchanged) |
| **Ireland mental health** | **NORMAL REDIRECT LAG (A) / WAIT-MONITOR — resolved this pass, added to §6 watchlist cadence** |
| Czech GP | Ranking ramp / remeasure ~2026-09-08 (unchanged) |
| Czech mental health | No real asymmetry (unchanged) |
| Czech women's health | Existing page / no demand (unchanged) |
| Czech doctor incomplete onboarding (Felici/Nytra/Kharlamova) | Operations dependency, frozen (unchanged, CZ-SEO-006) |
| Hlavatý | Admin-deactivated / reason unconfirmed, business dependency, frozen (unchanged) |
| Czech travel medicine | Normal redirect recrawl lag (E, corrected) / recheck ~2026-09-01 (CZ-SEO-007, unchanged this pass) |

**No open IE/CZ item resolves to B–E (an actual defect) this pass.** Every
item is either already-healthy-and-monitored, a genuine recrawl-timing wait,
or an operations/business dependency outside SEO's remit.

**COUNTRY WAVE 1 — IRELAND + CZECHIA: COMPLETE / MONITOR EXCEPTIONS.**

### 18.11 Next-wave recommendation

Country Wave 1 closes without an actionable SEO implementation. Recommend
**COUNTRY WAVE 2 — PORTUGAL + SPAIN** as the next wave. Not started this
run, per this ticket's own scope limit.

### 18.12 §6 watchlist addition (deferred, apply on commit authorization)

| URL | Production state | Google's stored state | Last crawl | Status |
| --- | --- | --- | --- | --- |
| `/ireland/mental-health-assessment-consultation` | 308 → current canonical (live since `699a89b2`, 2026-07-30) | Self-canonical (overrides declared canonical), "Submitted and indexed" | **2026-05-29** (predates the fix) | WAIT FOR GOOGLE (added 2026-08-13, COUNTRY-WAVE-001-CLOSE) |
| `/es/ireland/mental-health-assessment-consultation` | 308 → current canonical (live since `699a89b2`, 2026-07-30) | Self-canonical, "Submitted and indexed" | **2026-05-02** (predates both fixes) | WAIT FOR GOOGLE (added 2026-08-13, COUNTRY-WAVE-001-CLOSE) |

**NO IMPLEMENTATION / NO DEPLOY / CLOSURE UPDATE UNCOMMITTED.**

---

## 19. COUNTRY-WAVE-002 — Portugal + Spain opportunity investigation (2026-08-13)

**Mode: read-only investigation.** No redirects, no canonical/metadata/schema
changes, no content edits, no deploy, no commits. Two read-only Prisma scripts
added this pass (both untracked, both select-only, modeled on
`investigate-cz-doctor-supply.ts`): `backend/scripts/investigate-pt-doctor-service-supply.ts`,
`backend/scripts/investigate-es-market-inventory.ts`.

Extraction date: **2026-08-13**, closecheck normalization pass same day.
**Latest complete GSC date (both markets, `dataState=final`): 2026-08-10.**
Verified by pulling `dataState=final` sitewide for 2026-08-05→08-13: rows stop
at 08-10, confirming Google's own settle point — not a per-market difference,
so no divergent dates to preserve. The original draft's "2026-08-11/12" was an
artifact of using `dataState=all` (includes still-settling partial days); this
pass uses `final` throughout §19.2.

### 19.1 Closed items — reaffirmed, not reopened

| Item | Status | New evidence found? |
| --- | --- | --- |
| Telmo Coelho (Portugal) | **WAIT FOR GOOGLE** (SEO-GROWTH-007) | None — `coverageState` still "Excluded by 'noindex' tag", last crawl still 2026-07-26, current page still genuinely `index,follow` in production. Not reopened. |
| Alfredo del Valle cross-locale (Spain) | **CLOSED** (SEO-GROWTH-011) | None — all 5 locale URLs still PASS/self-canonical/indexed; legacy `/pt/spain-doctors/...` stub still outside the hreflang cluster, still not indexed. Not reopened. |
| Robots/sitemap/global-canonical/hreflang framework, breadcrumb localization, root-homepage hreflang | Closed via `SEO-FOUNDATION-004/005` | None — not re-audited, per scope. |
| SEO-GROWTH-013 (Spain SERP/business wall) | Closed — INVESTIGATED / NO STRUCTURAL DEFECT | Re-verified live with fresh GSC + 2 fresh SERP pulls; conclusion unchanged (§19.5). |
| SEO-GROWTH-014 (Spain Doctify feasibility, global-widget decision) | Closed | Not reopened; superseded by SEO-GROWTH-015 shipping (§19.0 below). |

### 19.0 Ledger correction found in passing (data only, not a Wave-2 finding)

§5's SEO-GROWTH-015 row currently reads **"IMPLEMENTED — VERIFIED, NOT DEPLOYED
(uncommitted)."** That is stale. `git log` confirms commit **`770ee012`**
("fix(trust): make Doctify integration global and locale-aware", 2026-08-12
11:34 +0500, Brxerq) is present on `main`, `Dev-hassaan`, and `Dev-nauman`, and
live production (`curl -A Mozilla/5.0` against `/spain/es/gp-consultation-online`)
serves "45.057+ consultas" with no "Valorado en Doctify" pairing — the
post-fix copy, not the pre-fix copy. **SEO-GROWTH-015 is live in production.**
Re-verified again during the COUNTRY-WAVE-002-CLOSECHECK pass (2026-08-13,
same curl check, same result). §5's row is corrected in this pass to
**CLOSED — VERIFIED BY PRODUCTION CHECK** — this was a stale-ledger fix, not a
Wave-2 finding, and involved no runtime code change.

### 19.2 Fresh GSC baselines — normalized (page-path scope, matched definition)

The original draft compared **incompatible scopes** — Portugal used a
page-path cut (`/portugal/`, broad, includes every locale) while Spain used a
searcher-country cut (`country=esp`). Corrected here: both markets now use the
**same definition** — primary-locale page-path (`/portugal/pt/`,
`/spain/es/`), all searcher countries, `dataState=final`, ending on the shared
latest-complete date **2026-08-10**.

**Portugal** (page-path `contains /portugal/pt/`, all searcher countries):

| Window | Dates | Clicks | Impr | CTR | Avg pos (impr-weighted) |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-14 → 08-10 | 14 | 1,757 | 0.80% | 22.0 |
| Prior 28d | 2026-06-16 → 07-13 | 0 | 0 | n/a | n/a |

**Spain** (page-path `contains /spain/es/`, all searcher countries):

| Window | Dates | Clicks | Impr | CTR | Avg pos (impr-weighted) |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-14 → 08-10 | 25 | 1,383 | 1.81% | 28.1 |
| Prior 28d | 2026-06-16 → 07-13 | 0 | 0 | n/a | n/a |

Under the matched scope, **both markets' prior-28d window is a hard zero**
(not "~zero" as the mismatched-scope draft phrased it) — the primary-locale
pages genuinely did not exist/were not indexed before this window. This
*strengthens*, not weakens, the "new discovery, not ranking loss" read: there
is no established cohort to have lost ranking on. Reassessed and unchanged.

**Secondary views (searcher-country cuts, kept separate, not mixed with the
above):** Spain `country=esp` sitewide (any page) showed current 28d
78 clicks / 3,377 impr / pos 23.6 vs. prior 33 / 546 / pos 13.6 in the original
draft's pull (2026-07-13→08-10) — wider than the primary-locale scope because
it includes non-`/es/`-locale Spain pages and non-`/spain/`-path pages ranking
for Spain-country searchers. Not re-pulled this pass; retained for reference
only, not used for the headline comparison above.

### 19.3 Portugal inventory highlights

68 `/portugal/pt/*` sitemap URLs; 16 primary-market doctors (15 active), 42
services (22 active+sitemapped, 20 inactive+correctly unindexed, 0 unstaffed
active services found for Portugal — all active PT services are staffed).
Full cluster-by-cluster table: see agent transcript §2 (not reproduced in
full here — condensed into §19.6 below).

### 19.4 Spain inventory highlights

327 `/spain/*` sitemap URLs across 6 locales; 14 doctors (13 active), 40
services (20 active+sitemapped, **4 active+bookable+`noindex`** — see §19.5.1
— 16 fully inactive/unstaffed).

#### 19.5.1 4 Spain services correctly noindexed on a content gate — resolved exactly

`consulta-diagnotico-vascular`, `consulta-flebologia-y-linfologia`,
`consulta-online-medicina-estetica`, `consulta-salud-vascular-circulatoria`:
all `isActive=true`, `visibility=PUBLIC`, each has exactly 1 real bookable
doctor, all serve live 200s, all `noindex, follow`, self-canonical, absent
from sitemap, internally linked (`follow`, not orphaned).

| URL | Service name | Kind | Doctor | ES translation row | ES `detailBody` |
| --- | --- | --- | --- | --- | --- |
| `/spain/es/services/consulta-diagnotico-vascular` | Consulta Diagnóstico Vascular | SPECIALIST | Dr. Leandro Wang | Exists (name OK) | `<p><br /></p>` — 0 plain-text chars |
| `/spain/es/services/consulta-flebologia-y-linfologia` | Consulta Online Flebología y Linfología | SPECIALIST | Dr. Leandro Wang | Exists (name OK) | `<p><br /></p>` — 0 plain-text chars |
| `/spain/es/services/consulta-online-medicina-estetica` | Consulta Online Medicina Estética | GENERAL | Dra. María Fernanda Ocampo Mora | Exists (name OK) | `<p><br /></p>` — 0 plain-text chars |
| `/spain/es/services/consulta-salud-vascular-circulatoria` | Consulta Salud Vascular / Circulatoria | GENERAL | Dra. Eszter Szilágyi | Exists (name OK) | `<p><br /></p>` — 0 plain-text chars |

Re-queried live from Prisma (`Service` + `ServiceTranslation`, `es`
`countryDefaultLocale`) this pass: root cause confirmed exactly, not
approximately — `detailBody` for all 4 is the literal empty-paragraph HTML
stub `<p><br /></p>` (strips to 0 chars), `summary` and `heroDescription` are
also empty in ES, so `isPublicServiceRecordIndexable`'s "body" check
(§`publication-validation.ts:291-297`) fails correctly. `seoTitle`/
`seoDescription` exist (auto-generated boilerplate: "Book X with a licensed
doctor..."), which is why the pages 200 but stay `noindex` — not a defect,
confirms SEO-DOC-002's pattern exactly. **The content-length diagnosis was
right — classification E (technical/publication defect) does not apply to
any of the 4.**

**First-party source content check (DB-wide, not invented):** a
Prisma search across all countries for vascular/vein/circulation/phlebology/
lymphology-named services found nothing outside Spain's own empty rows — no
translatable source exists for the 3 vascular/phlebology services. Aesthetic
medicine is different: Ireland runs `aesthetic-medicine-consultation` with a
real 6,747-character English `detailBody` — an available translation source
for `consulta-online-medicina-estetica` specifically.

**Demand test (property-wide GSC, `dataState=all`, 16-month lookback,
`query contains` each service's Spanish stem — not scoped to the noindexed
pages, which correctly have no data of their own):**

| Service | Query stems checked | Property-wide GSC hits |
| --- | --- | --- |
| Diagnóstico vascular | `vascular`, `venos*`, `circulator*` | 1 impression total, English "vascular consultation" (not the Spanish stem), pos 9, landing on the legacy-shaped `/spain/vascular-circulatory-health-consultation` URL — not a Spanish-query signal |
| Flebología y linfología | `flebolog*`, `linfolog*`, `varic*` | 0 rows, any language, any window tried (28d/90d/16mo) |
| Medicina estética | `estetic*` | 0 rows, any language, any window tried |
| Salud vascular circulatoria | `vascular`, `venos*`, `circulator*` | Same 1 English impression as diagnóstico vascular (shared stem) |

**Classification: NO OBSERVED MGH DEMAND** for all 4 in their actual Spanish
product language — zero Spanish-query impressions anywhere on the property
across 16 months, not merely zero on their own (correctly noindexed) pages.
Per the ticket's own instruction, this is not inferred from the noindexed
page's own zero impressions; it is a direct property-wide Spanish-query
search that came back empty.

**Targeted SERP check — run once, for the one service with plausible
commercial value and an available content source** (aesthetic medicine is a
mainstream consumer category and has the Irish source copy to translate;
vascular diagnostics/phlebology are niche specialist procedures with zero
demand signal and no source content, so no SERP credits spent there per the
ticket's "only for services with at least plausible commercial value" gate):

"medicina estetica online" (es-ES, live SERP pull, 2026-08-13) returns **zero
patient-telehealth or clinic competitors in the top 20** — the entire page is
professional-training content (Máster/Curso en Medicina Estética from
universities and training academies: UNIR, Escuela Clínica, Emagister,
GrupoCTO, etc.) plus an AI Overview on the same training topic. The query's
search intent is **aspiring aesthetic-medicine practitioners looking for
certification courses, not patients looking to book a consultation** — a
different audience than MGH's product entirely, not merely a competitive
wall. Confirms and explains the zero property-wide GSC demand: the natural
Spanish query for this service doesn't reach a patient audience at all.

**Per-service classification (§7 rubric):**

| Service | Classification | Reasoning |
| --- | --- | --- |
| `consulta-diagnotico-vascular` | **D — NO MATERIAL DEMAND** | Zero Spanish-query GSC signal, 16mo, property-wide; no first-party source content exists anywhere in the DB to translate even if demand appeared |
| `consulta-flebologia-y-linfologia` | **D — NO MATERIAL DEMAND** | Same — zero demand, no source content |
| `consulta-salud-vascular-circulatoria` | **D — NO MATERIAL DEMAND** | Same — zero demand, no source content |
| `consulta-online-medicina-estetica` | **C — SERP/BUSINESS-MODEL WALL** | Zero demand in the patient-intent sense is explained, not just observed: the head Spanish query is dominated by professional-training intent, not patient-booking intent. A complete Spanish page (translation source exists) would not compete for this query's actual searchers |

**No classification A found among the 4.** Action for all 4 remains
editorial/content, but is now downgraded from "write ES body copy to unlock
indexing" (implying a waiting SEO opportunity) to "no SEO case exists to
prioritize this content" — genuinely a product-completeness/consistency task
if pursued at all, not a ranked SEO backlog item.

### 19.5 Doctor ecosystem findings

**Portugal** — Telmo's WAIT-FOR-GOOGLE pattern is not unique to him. Two more
doctors sit behind the identical mechanism (current-shape URL genuinely
`index,follow` in production; Google's cached coverage state is stale,
predating the SEO-DOC-001 backfill `52c42d1a`, 2026-08-08):

| Doctor | Current URL Google state | Legacy URL Google state | 90d name-demand | Status |
| --- | --- | --- | --- | --- |
| Telmo Coelho (psychiatry) | Excluded (noindex tag), last crawl 2026-07-26 | PASS, indexed | ~354 impr / 32 clicks, pos 2.3–5.7, all on legacy | WAIT FOR GOOGLE (unchanged) |
| **Vitor Hugo de Matos Pais** (GP) | Excluded, last crawl **2026-07-16** (oldest) | PASS, indexed, last crawl 2026-06-28 | ~67 impr / 0 clicks, pos 3.9–6.7 | **WAIT FOR GOOGLE — new watchlist addition** |
| **Pedro Santos** (oncology) | Excluded, last crawl **2026-08-06** (freshest — canonical already resolved correctly, just not lifted yet) | Also excluded, same crawl date | Includes a generic query: "melhor oncologista de portugal" 14 impr pos 11.8 | **WAIT FOR GOOGLE — new watchlist addition** |
| Rui Diogo Rodrigues (cardiology) | PASS, fresh crawl 2026-08-11 | — | ~25 impr, transitioning correctly | No action — healthy |

No Portugal doctor offers a stronger *actionable* opportunity than Telmo —
Vitor Pais and Pedro Santos are the same recrawl-timing mechanism, not a
distinct, code-fixable defect, and are recommended as siblings on the same
watchlist entry rather than separate tickets.

**Spain** — `dr-tomas-ruiz-palacios` confirmed strong and stable (~7 clicks/36
impr/90d, pos 2.2–2.4, es page) — already optimal, no action needed.
**Correction**: the prior note that `dr-luz-marina-zuluaga-rios` held "25% CTR
at pos 1.9" does not reproduce — fresh 90d pull shows 3 impressions / 0 clicks
across every locale and URL variant for her name. **Reclassified: LOW-DATA
NOISE**, was almost certainly a 1-click/small-denominator artifact from an
earlier window. Not a candidate. No other Spain doctor surfaces as a new
opportunity.

### 19.6 Commercial-service opportunity findings

**Portugal — atestado/carta de condução cluster (the roadmap's own flagged
candidate), re-verified with fresh evidence:**
Product gate passes (2 active bookable doctors), internal linking confirmed
live from `/portugal/pt` and booking CTAs, but every head query sits at
position 42–53 ("exame medico carta condução" pos 44.6, "atestado médico para
carta de condução" pos 42). Live SERP check (2 queries, pt/Portugal): MGH
absent from top 20 on both; page one is government/regulatory sources
(sns24.gov.pt, iasaude.pt, ordemdosmedicos.pt) plus **8–10 dedicated
Portugal-specific atestado telemedicine competitors** live since the ~2017
regulation date, plus a 3-result local pack, plus an AI Overview.
**Classification: SERP-BUSINESS WALL — CONFIRMED (upgraded from "feasibility
looks poor" to a verified negative).** No content batch recommended.
`baixa-medica` (separate, correctly-distinct regulatory cluster) sits at a
materially healthier position (pt pos 6.2) on real if modest volume — MONITOR,
not a batch.

**Spain — médico general / consulta online cluster, re-verified:** homepage
(669 impr/pos 32.8), GP hub (87/32.6), GP detail (`consulta-medica-online`,
best-positioned, 54 impr/pos 22.1) form a legitimate **SUPPORTIVE CLUSTER**
(brand landing / catalog+trust-stats / single-service FAQ — no consolidation
case). Live SERP check ("medico online", es-ES): MGH absent from top 20; page
one is an AI Overview plus national insurers (caser.es, dkv.es, sanitas.es,
segurcaixaadeslas.es, aegon.es) and marketplace aggregators (doctoralia.es,
topdoctors.es). **SERP-BUSINESS WALL — reconfirmed, unchanged from
SEO-GROWTH-013.**

**Spain — dermatología especialista, re-verified:** the prior "trust
presentation gap" root cause **has already shipped** (SEO-GROWTH-015,
`770ee012`, live — see §19.0). Live SERP check ("dermatologia online",
es-ES): MGH absent from top 20; wall is lower than the GP cluster (boutique
solo-practitioner dermatology sites + 1-2 aggregators, no insurers) but still
real. Ranking upside from the shipped fix is capped by an unchanged
architectural fact: the Doctify widget stays client-rendered
(`ssr:false`) and consent-gated by design (SEO-GROWTH-014's own conclusion,
correctly not reopened) — Googlebot's crawled DOM is unaffected by the fix; it
corrects a customer-facing factual claim and may lift conversion, not
necessarily rankings. **No further SEO work justified; re-measure after a
normal recrawl-and-ramp window.**

### 19.7 Query ownership / cannibalization

Portugal: atestado/baixa-medica/certificados-medicos families confirmed
**CORRECT CLUSTER** (distinct regulatory intents, non-overlapping query sets).
Doctor legacy-vs-current pairs are **TRANSITIONAL LEGACY OWNERSHIP** (recrawl
lag), not cannibalization. Spain: médico-general homepage/hub/detail overlap
reconfirmed **SUPPORTIVE CLUSTER with a minor INTENT SPLIT**, not
cannibalization — detail page already wins the shared head terms. No TRUE
CANNIBALIZATION found in either market this pass.

### 19.8 Blog/content

Portugal: 4 PT-locale posts, all near-zero PT-locale impressions; one EN
variant (baixa-medica self-declaration) draws 13 impr/pos 4.4, informational,
correctly supportive, not competing. Spain: 1 ES post
(`diabetes-una-enfermedad-silenciosa`), **zero impressions/clicks, 90d**.
Neither market's blog content is a material asset or a candidate this pass.

### 19.9 Internal-link check (top candidates only)

Portugal: homepage → atestado/baixa-medica confirmed live (direct anchors +
booking CTAs); Telmo's profile → services links match his assigned services
exactly. Spain: both `dermatologia-especialista-online` and
`consulta-medica-online` confirmed healthy, contextual sibling/hub/doctor
linking, live-fetched. No internal-link defect found on any top candidate in
either market.

### 19.10 Product/operations gate

All top candidates in both markets pass the product/operations gate (real,
active, bookable clinicians) **except** the 4 Spain vascular/aesthetic
services (§19.5.1 — content-completion dependency, not a supply problem) and
Portugal's 12 unstaffed specialist services (already correctly unindexed, no
action possible until staffed).

### 19.11 Secondary locales

No wrong-language ownership or meaningful primary-locale displacement found
in either market. Two minor, non-actionable notes flagged for awareness only:
Portugal's `consulta-de-psiquiatria` ranks better on its en-locale URL (pos
5.7) than pt-locale (pos 21.4) for the same market's service — plausibly
thinner pt-query volume, not investigated further. Spain's
`/spain/en/services/consulta-medica-online` draws 7 clicks/514 impr globally,
0 of the clicks from Spain-country searchers (they're non-resident
English-language demand, e.g. "doctor spain," "telemedicine spain") — flat vs.
the prior measurement, confirmed still not a bottleneck.

### 19.12 Portugal opportunity map

| Cluster | Demand | Current performance | Correct page? | Maturity | SERP feasibility | Commercial value | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atestado/carta de condução | Real (60+ impr head terms) | Pos 42–53 | Yes | Mature | **Confirmed poor** (10 competitors + gov + local pack + AI Overview) | Medium | SERP-BUSINESS WALL | NO WORK RECOMMENDED |
| Baixa-medica (sick note) | Modest, growing | pt pos 6.2 | Yes | Recovering | Untested, position already healthy | Medium | None found | MONITOR |
| Telmo Coelho | Strong branded (354 impr/32 clicks) | On legacy URL only | Yes | Backfilled 08-08 | n/a | High | Google recrawl lag | WAIT FOR GOOGLE |
| Vitor Hugo de Matos Pais | Real branded (~67 impr) | On legacy URL only | Yes | Same backfill batch | n/a | Medium-high | Google recrawl lag | WAIT FOR GOOGLE (new) |
| Pedro Santos | Real, partly generic (14 impr pos 11.8) | Both excluded, canonical resolved | Yes | Same batch, furthest along | n/a | Medium | Google recrawl lag | WAIT FOR GOOGLE (new) |
| GP generic cluster (homepage/hub/detail) | Real ("medico online portugal" 57 impr) | Pos 28.9–46.9 | Ambiguous | Mature | Untested, pattern matches confirmed IE/ES walls | Medium | Authority/competition | AUTHORITY-LIMITED |
| 12 unstaffed specialist services | None (correctly unindexed) | n/a | n/a | n/a | n/a | Zero until staffed | No clinician | PRODUCT-OPERATIONS CONSTRAINT |
| Travel medicine | Weak (120 impr, pos 49.3) | Poor | Yes | Immature | Untested | Low-medium | Unproven at this position | NO MATERIAL DEMAND yet |
| Blog (4 PT posts) | Negligible | n/a | n/a | n/a | n/a | Low | Thin demand | MONITOR |

### 19.13 Spain opportunity map

| Cluster | Demand | Current performance | Correct page? | Maturity | SERP feasibility | Commercial value | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dermatología especialista | Real, small (93 impr) | Pos 42.9 | Yes | New (first crawl 07-19) | Lower wall (boutique + aggregators) | Medium | Trust-presentation — **fix shipped, awaiting recrawl** | MONITOR, re-measure |
| Médico general / consulta online | Real, largest (669+87+54 impr) | Best pos 22.1 | Yes (supportive cluster) | New (first crawl 07-17) | Hard wall (insurers + aggregators + AI Overview) | High in theory | SERP-BUSINESS WALL | MONITOR only |
| Salud mental online | Minimal (3 impr) | n/a | Yes | New | Untested, too small | Low | Low-data | MONITOR |
| `/spain/en/…consulta-medica-online` | Small, non-resident (7 clicks/514 impr) | Flat | Wrong-locale for the bulk; sliver legit | Established, plateaued | n/a | Negligible | Minor, non-blocking | MONITOR |
| 3 vascular/phlebology services (diagnóstico vascular, flebología/linfología, salud vascular circulatoria) | **D — none found** (0 property-wide Spanish-query GSC hits, 16mo; no source content anywhere in DB) | n/a | n/a (correctly noindexed) | Not indexed | Not run — demand gate not met | None demonstrated | Content-completion gate | NO MATERIAL DEMAND — not an SEO candidate |
| Medicina estética service | **C — SERP/business-model wall** (0 demand; SERP is 100% professional-training intent, not patient intent) | n/a | n/a (correctly noindexed) | Not indexed | Tested — wrong audience, not just competitive | None viable via this query | Content gate + wrong intent | NOT ACTIONABLE — wrong-intent wall, not a content-completion opportunity |
| Other 17 active ES service pages | Zero Spain-country demand | 0 impr each | Yes | New | Untested | n/a | NO MATERIAL DEMAND | MONITOR |
| Tomás Ruiz Palacios (doctor) | Real, strong (pos 2.2–2.4) | Already winning | Yes | Established | n/a | High CTR, low volume | None | NO ACTION |
| Luz Marina Zuluaga Ríos (doctor) | Evaporated (3 impr/90d) | Not reproducible | n/a | n/a | n/a | Negligible now | Was low-data noise | CORRECTION, not a candidate |
| Blog | Zero | 0 impr/90d | n/a | n/a | n/a | Negligible | No demand | MONITOR |

### 19.14 Cross-market ranking

Nothing in either market clears the bar for **ROOT CAUSE CONFIRMED —
IMPLEMENTATION READY**. Ranked by remaining signal strength (all are
zero-remaining-code-work items):

1. **Spain dermatología re-measure** — highest confidence of eventual signal (fix already shipped 2026-08-12), zero further implementation, pure wait.
2. **Portugal doctor recrawl trio** (Telmo + Vitor Pais + Pedro Santos) — strongest raw demand of anything found this wave (354+67+14 impr on branded/near-branded queries), zero further implementation, pure wait — same mechanism already proven out by SEO-DOC-001.
3. **Portugal atestado wall / Spain médico-general wall** — largest raw impression volume in both markets, but both independently confirmed SERP/business walls this pass. Correctly ranked last of the real candidates: high volume, low feasibility.
4. **Spain 4 noindexed bookable services** — resolved exactly this pass (§19.5.1), not left open: 3 have zero demonstrated demand and no first-party content to translate (classification D), the 4th (medicina estética) is a confirmed SERP/business-model wall on wrong search intent (classification C). None is classification A. Ranked last because none is an open opportunity, not because of low confidence.

A high-volume authority wall (#3) is deliberately ranked above the fully-closed
item (#4), per this ticket's own instruction that a wall with real volume
still outranks a dependency with none.

### 19.15 Selected candidate

**NO IMPLEMENTATION JUSTIFIED — MONITOR / MOVE TO NEXT WAVE.**

No PT-SEO-001 or ES-SEO-001 is proposed. Every candidate surfaced this pass is
either (a) a confirmed SERP/business wall with no code-side lever (including,
after this closecheck pass, all 4 of the Spain noindexed services — 3 on zero
demand, 1 on wrong search intent), (b) already fixed and pending Google
recrawl/ramp, or (c) blocked on non-SEO editorial/content work with no SEO
case behind it. This mirrors how Country Wave 1 closed (§18) — no manufactured
ticket where the evidence says "wait" or "no."

### 19.16 Measurement plan (watchlist additions, apply on next ledger housekeeping pass)

| Item | Target | Success condition | Failure condition | Recheck window |
| --- | --- | --- | --- | --- |
| Spain dermatología (`/spain/es/services/dermatologia-especialista-online`) | Position/CTR movement post-SEO-GROWTH-015 | Position improves from 42.9 and/or CTR rises off 0% within one normal recrawl-and-ramp cycle | No movement after cycle → treat as confirming the SERP wall, not the widget fix | ~2026-09-08 (matches SEO-GROWTH-016 cadence) |
| Portugal doctor trio (Telmo, Vitor Pais, Pedro Santos) | Current-shape URL `coverageState` via `inspect_urls` | Coverage flips to "Submitted and indexed" / PASS and legacy URL impressions migrate to current URL | Coverage still stale past 2026-09-01 with no recrawl progress | ~2026-09-01 (existing §6 cadence) |
| Spain 3 vascular/phlebology services | Property-wide Spanish-query GSC demand | New Spanish-query impressions appear property-wide for vascular/flebología/linfología stems | n/a — no SEO-side check needed unless demand appears | Not scheduled — no signal to watch for |
| Spain medicina estética service | n/a — closed as SERP/business-model wall, not a content-completion watch item | n/a | n/a | Not scheduled |

**NO COUNTRY-WAVE-002 IMPLEMENTATION / NO DEPLOY / WAVE-2 UPDATE UNCOMMITTED.**

---

## 20. COUNTRY-WAVE-003 — Brazil + Romania opportunity investigation (2026-08-13)

**Mode: read-only investigation.** No redirects, no canonical/metadata/schema/content
changes, no deploy, no commits, no database writes. Two read-only Prisma scripts added
this pass (both untracked, both select-only, modeled on `investigate-cz-doctor-supply.ts`):
`backend/scripts/investigate-br-market-inventory.ts`,
`backend/scripts/investigate-ro-market-inventory.ts`. Run via
`node --env-file=.env --import tsx scripts/<name>.ts` against production `DATABASE_URL`
(same pattern as the CZ/PT/ES precedent).

Extraction date: **2026-08-13**. Two independent agents (Brazil, Romania) each verified
the sitewide `dataState=final` settle point separately: both pulls confirm rows stop at
**2026-08-10**, the same date Wave 2 found — not a per-market artifact.

### 20.1 Closed items — reaffirmed, not reopened

| Item | Status | New evidence found? |
| --- | --- | --- |
| SEO-GROWTH-005 (bare Brazil legacy families) | **CLOSED** | None — no legacy Brazil URL pattern surfaced in either agent's GSC pull. Not reopened. |
| SEO-GROWTH-006 (locale-prefixed Brazil legacy families) | **CLOSED** | None. `/brazil/pt/general-consultation` confirmed still 308→`gp-consultation-online`, correct target, part of the already-closed family. Not reopened. |
| `readyToIndex` / editorialChecklist publication migration (global, incl. BR/RO) | **CLOSED** | None — the migration itself was not touched. Both markets' doctor findings this pass are pure Google-recrawl-lag ramp cases on top of the already-correct backfill, not new gaps in the migration. |
| Global systems (robots, sitemap, canonical, hreflang architecture, breadcrumb localization) | Closed via SEO-FOUNDATION-004/005 | None — Romania's hreflang cluster spot-checked as still correct (§20.11); not re-audited otherwise, per scope. |

### 20.2 Fresh normalized GSC baselines (primary-locale page-path scope, matched to Wave 2's definition)

Both markets use the same definition: primary-locale page-path (`/brazil/pt/`,
`/romania/ro/`), all searcher countries, `dataState=final`, current 28d vs prior 28d
ending on the shared latest-complete date **2026-08-10**.

**Brazil** (`/brazil/pt/`):

| Window | Dates | Clicks | Impr | CTR | Avg pos (impr-weighted) |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-14 → 08-10 | 12 | 1,418 | 0.85% | 11.9 |
| Prior 28d | 2026-06-16 → 07-13 | 0 | 0 | n/a | n/a |
| 90d context | 2026-05-14 → 08-10 | 14 | 1,463 | 0.96% | — |

**Romania** (`/romania/ro/`):

| Window | Dates | Clicks | Impr | CTR | Avg pos (impr-weighted) |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-14 → 08-10 | 7 | 807 | 0.87% | 18.5 |
| Prior 28d | 2026-06-16 → 07-13 | 0 | 0 | n/a | n/a |
| 90d (last_3_months) | 2026-05-10 → 08-10 | 7 | 807 | 0.87% | 18.5 (byte-identical rows to the 28d pull) |

**Both prior-28d windows are a verified hard zero, not "near-zero" — ranking-delta
conclusions are unavailable for both markets**, exactly as instructed. Brazil's 90-day
total (14/1,463) is barely above its current-28d total (12/1,418): effectively all
trailing volume is inside the last 28 days. Romania's 90-day pull returned rows
identical to the 28-day pull on every one of 167 pages: **100% of Romania's primary-locale
visibility sits inside the last 28 days**, with a clean discontinuity at the first
non-zero day (2026-07-19) — the surface simply did not exist in Google's index before
that date. Both are new-discovery cohorts, not decaying ones.

Both figures differ from §2's stale scoreboard rows (Brazil 30 clicks/2,785 impr/pos
10.2; Romania 19 clicks/1,240 impr/pos 21.2) because §2 uses a **searcher-country cut
across the whole property** (any page ranking for BR/RO searchers, including non-market
pages and non-primary locales), not a page-path cut on the market's own primary-locale
surface. Both cuts are legitimate; they are not directly comparable, consistent with
Wave 2's own correction of the same scope mismatch.

### 20.3 Query-mix breakdown

**Brazil** — no concentrated commercial cluster in the current mix: ~85%+ of impressions
are the sitewide free-tool/calculator pattern (SEO-GROWTH-012, zero clicks across all of
them), ~10% is brand/brand-collision navigation to `/contact`, and the remaining ~5% is
scattered 1–2-impression commercial fragments spread across many different service pages
with no single query exceeding 3 impressions. Zero doctor-branded-name demand in 90 days.

**Romania** — 78% of impressions (629 of 807) are the same tools/calculators pattern
(real, diverse Romanian queries — `calculator calorii`, `tabel cu valori tensiune
arteriala` — not bot traffic), ~9% is commercial (`/doctors` 48 impr/3 clicks,
`medic-online-romania` 3/1), ~6% is brand/homepage, and the rest is informational/legal
noise. Zero legacy-URL rows and zero doctor-branded-name demand in either market's pull.

### 20.4 Complete Brazil primary-locale inventory

Sitemap: 42 `/brazil/pt/*` URLs. DB (read-only pull, country `br`): **1 doctor**
(Dr. Renato Sarmento, GP, `active=true`, readyToIndex backfilled 2026-08-08, 8 active
availability rows, real slots to Nov 2026), assigned to **all 18 active services** (all
GENERAL kind, 199–299 BRL). **18 inactive services** — 16 SPECIALIST (dermatology,
cardiology, psychiatry, oncology, endocrinology, gastroenterology, genetics, geriatrics,
neurology, pediatric-specialist, pneumology, psychology, rheumatology, urology,
venereology/STI, allergy/immunology), all correctly `isActive=false` with 0 assigned
doctors, plus 2 inactive corporate services. One anomaly: `corporate-pre-assessment` is
`isActive=true` with **0 assigned doctors** — a zero-price, non-sitemapped B2B page, not
a consumer SEO surface. 18 active DB services = 18 sitemapped service URLs exactly, no
mismatch. Full GP/general-consultation coverage exists (certificates, prescription
renewal, lab-test requests, general dermatology, general mental health, men's/women's/
elderly health, travel medicine, weight/smoking/musculoskeletal/chronic-disease) — no
specialist hub exists or should exist given zero specialist clinician supply.

### 20.5 Complete Romania primary-locale inventory

256 total `/romania/*` URLs (all locales) in the sitemap. DB pull: **3 doctors**
(Dr. Alexandra Palaga — pediatrics; Dr. Andreea-Lorena Bica — neurology; Dr. Robert
Gabriel Brînduș — GP/family, carrying 18 of 35 service rows), all `active=true`,
CMR-registered, real bookable availability. **35 total services**: 15 active +
RO-translated + bookable (GP/general cluster of 13 + 2 staffed specialist:
`consultatie-pediatrie`/Palaga, `consultatie-neurologie`/Bica), **1 active + indexed with
zero assigned doctors** (`evaluare-durere` — a genuine product gap, §20.9), 17 inactive
with no RO translation and 0 doctors (the specialist roster Romania doesn't staff —
cardiology, oncology, urology, gastroenterology, endocrinology, geriatrics, genetics,
pneumology, psychiatry, psychology, rheumatology, venerology, allergy/immunology, plus a
duplicate SPECIALIST dermatology row), and 4 inactive with a doctor assigned but the
service itself off (`sick-note-romania`, 3 corporate services). RO-locale service body
copy runs ~700–900 characters versus the same service's EN-locale body at ~7,600–13,800
characters. **Correction (RO-SEO-001, §21): Romanian is Romania's primary locale, not a
secondary one — the "sitewide thin-secondary-locale pattern" label above was wrong
framing.** The accurate statement is: RO primary-locale content is materially shorter
than the equivalent EN locale on some pages; SEO significance not yet established at
the time this section was written — since resolved per-cluster in §21 (2 of the 4 named
clusters turned out fully RO-equivalent, not thin at all). No lab-test detail pages
exist under Romania's `/lab-tests` hub (unlike Ireland's 16-page cluster).

### 20.6 Brazil doctor ecosystem

| Doctor | Status | Google cached coverage | Live production | 90d branded demand | Classification |
| --- | --- | --- | --- | --- | --- |
| Dr. Renato Sarmento (GP, sole BR doctor) | Active, 18/18 services, bookable to Nov 2026 | Excluded by `noindex` tag, last crawl **2026-08-04** (4 days before the 2026-08-08 backfill) | Verified live `index, follow`, self-canonical, 200 | 0 impressions/clicks, any locale, any window | **WAIT FOR GOOGLE** — identical mechanism to Portugal's Telmo/Vitor/Pedro trio (SEO-DOC-001). Not an on-page defect. |

Only one doctor exists for the market — no cross-doctor comparison possible. Brazil
carries a structural single-doctor supply constraint that caps demand regardless of the
SERP-wall finding in §20.8.

### 20.7 Romania doctor ecosystem

| Doctor | `DoctorMarketTranslation` bio (RO) | Live production | Google cached coverage | Last crawl | 90d branded demand | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| Dr. Alexandra Palaga (pediatrics) | 4,539 chars, real | `index, follow`, self-canonical | Excluded by `noindex` / BLOCKED_BY_META_TAG | 2026-08-03 | 0 | **WAIT FOR GOOGLE** |
| Dr. Andreea-Lorena Bica (neurology) | 3,621 chars, real | `index, follow`, self-canonical | Excluded by `noindex` / BLOCKED_BY_META_TAG | 2026-07-20 | 0 | **WAIT FOR GOOGLE** |
| Dr. Robert Gabriel Brînduș (GP) | 3,331 chars, real | `index, follow`, self-canonical | Excluded by `noindex` / BLOCKED_BY_META_TAG | 2026-08-01 | 0 | **WAIT FOR GOOGLE** |

All three carry the same 2026-08-08 `readyToIndex` backfill; Google's cached crawl for
all three predates or barely brackets the fix. Content is real and substantial (3,300–
4,500 chars), unlike Czechia's genuinely-empty-bio cases — this is pure recrawl-lag ramp,
not a content gate failure. No new blocker found. Zero name-branded demand yet is
expected given the market itself is 25 days old in Google's index (first non-zero
impression day 2026-07-19).

### 20.8 Commercial-service demand — live SERP findings

**Brazil** — live SERPs pulled (pt-BR) for the 3 strongest candidate query families:
"atestado medico online", "consulta medica online", "medico online brasil". **MGH absent
from the top 20 on all three.** Brazil's domestic telehealth SERP is saturated with the
medical regulator's own certificate platform (CFM's `atestacfm.org.br`), major hospital-
chain telehealth arms (dr.consulta, Hospital Israelita Albert Einstein, Beneficência
Portuguesa), state/federal government telehealth, a booking marketplace (Doctoralia), a
major insurer (Bradesco Seguros), and dozens of dedicated Brazilian-only startups.
**Classification: SERP-BUSINESS WALL, confirmed** — denser and harder than any wall found
in Waves 1–2 (no other market's SERP showed a regulator's own competing platform).

**Romania** — live SERPs pulled (ro-RO) for "medic online" (390/mo volume, KD 31) and "a
doua opinie medicala" (90/mo, KD 0). **MGH absent from the top 20 on both.** Page one for
"medic online" is 100% dedicated Romanian telehealth platforms (Medic Chat, Medicul
Online, DeaMedicine, Medicentrum, MedLife's MedLive, Regina Maria's Clinica Virtuală,
Dr-Online, Docbook, Doctorchat, Clickmed, Ringdoc — 612 doctors/45 specialties, Telios
Care, Groupama chat, eTeledoc) plus an AI Overview. "A doua opinie medicala" is dominated
by Romania's two largest private hospital networks (Sanador, MedLife), Anadolu Medical
Center, a major health publisher (doc.ro), and a dedicated second-opinion platform
(opiniemedicala.ro). **Classification: SERP-BUSINESS WALL, confirmed** — Romania already
has a decade-plus mature dedicated telehealth sector plus its two largest private
hospital networks occupying the same SERPs.

### 20.9 Brazil opportunity table

| Cluster | Demand | Performance | Correct page? | Maturity | Product fit | SERP feasibility | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GP/consulta médica online | Real but tiny, fragmented, no query >3 impr | No concentration | Yes | New | Yes (Sarmento bookable) | Confirmed wall (§20.8) | SERP-BUSINESS WALL | NO WORK RECOMMENDED |
| Atestado médico online | Weak, fragmented | Poor | Ambiguous (PT service page vs EN blog both weak) | New | Yes | Confirmed wall, incl. CFM's own platform | SERP-BUSINESS WALL | NO WORK RECOMMENDED |
| Dermatologia/pele online (general) | Minimal (4 impr, pos 20.5) | Poor | Yes | New | Yes (general only) | Not tested — volume too low | NO MATERIAL DEMAND | MONITOR |
| Saúde de viagem | Minimal (9 impr) | Modest position, negligible volume | Yes | New | Yes | Not tested | NO MATERIAL DEMAND | MONITOR |
| 16 unstaffed SPECIALIST services | Not measurable, correctly unindexed | n/a | n/a | n/a | No — zero clinicians | Not tested | PRODUCT-OPERATIONS DEPENDENCY | No SEO work possible until staffed |
| `corporate-pre-assessment` (active, 0 doctors) | Non-consumer B2B, not sitemapped | n/a | n/a | n/a | Gap exists, out of SEO scope | n/a | PRODUCT-OPERATIONS DEPENDENCY | Not an SEO candidate |
| CRM/doctor-registry lookups | Real but purely informational, not booking intent | Pos 8–44 on `/doctors` | Wrong intent, harmless | n/a | No | Not tested | INFORMATIONAL, NOT COMMERCIAL | No action |
| Dr. Renato Sarmento (branded) | None yet | Stale Google index | Yes | Backfilled 08-08, not yet recrawled | Yes | n/a | Google recrawl lag | WAIT FOR GOOGLE |
| Tools/calculators (7 pages) | Large raw volume (1,074+ impr), zero clicks | Positions weak throughout | Yes (by design) | Established | n/a — non-medical-service | n/a | None — sitewide SEO-GROWTH-012 pattern | DEFERRED, not a candidate |

### 20.10 Romania opportunity table

| Cluster | Demand | Performance | Correct page? | Maturity | Product fit | SERP feasibility | Bottleneck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| "medic online" generic GP (390/mo, KD 31) | Real, largest head term found | Not ranking (0 impr for the bare term) | Yes | New | Yes (Brînduș bookable) | Confirmed hard wall (§20.8) | SERP-BUSINESS WALL | NO WORK RECOMMENDED |
| "a doua opinie medicala" (90/mo, KD 0) | Real, modest | RO body only 858 chars vs EN 8,590 | Yes | New | Yes | Confirmed wall, arguably harder | SERP-BUSINESS WALL | NO WORK RECOMMENDED |
| `consultatie-neurologie` | Weak (17 impr, pos 10.5, 0 clicks) | Reasonable position, negligible volume | Yes | New | Yes (Bica) | Not tested — no measurable RO volume for "neurolog online" | Volume too low | MONITOR |
| `consultatie-pediatrie` | Very weak (2 impr, pos 22.5) | Poor | Yes | New | Yes (Palaga) | Not tested — no measurable volume | Insufficient data | MONITOR |
| `evaluare-durere` (pain evaluation) | Untested, real RO body (749 chars) | Indexed, 0 impressions | Yes | Established crawl | **No — 0 assigned doctors** | Not tested — gate fails first | Zero bookable doctors | PRODUCT-OPERATIONS DEPENDENCY |
| `sick-note-romania` | Zero — 16-month property-wide pull, "concediu medical"/"certificat medical": 0 rows | n/a — inactive, no RO translation | n/a | Not indexed | Doctor assigned, service off | Not tested — demand gate fails first | No RO content + no demand | NO MATERIAL DEMAND |
| 17 inactive specialist services | Not testable — no RO translation, 0 doctors | n/a | n/a (correctly unindexed) | n/a | No — zero clinicians for any of 17 specialties | Not run | Clinician supply, structural | PRODUCT-OPERATIONS CONSTRAINT |
| `/lab-tests` hub | Negligible (1 impr, pos 76) | Poor, no detail pages | n/a | Immature | Unclear — no catalogue built | Untested | NO MATERIAL DEMAND | MONITOR |
| Tools/calculators cluster | Largest raw volume (78% of RO impressions), real diverse queries | Positions 7–75 | Yes (by design) | Established | n/a — non-commercial | n/a | None — expected | HEALTHY, NO ACTION |

### 20.11 Query ownership, homepage role, blog, internal links (both markets)

**Query ownership** — no TRUE CANNIBALIZATION in either market. Brazil's weak commercial
fragments split thinly across homepage/legacy-redirect-alias/GP-hub at 1–2 impressions
each: LOW-DATA NOISE. Romania's GP-hub-vs-service-detail pair is CORRECT OWNERSHIP (detail
page wins its one exact-match query); a `pediatru online` cross-locale/cross-page split
(RO/CS/ES variants, 1–6 impr each) is LOW-DATA NOISE, not cannibalization.

**Homepage role** — both `/brazil/pt` and `/romania/ro` are healthy: primarily brand/nav,
absorbing a handful of near-zero-volume generic fragments as fallback because no better
page has out-ranked them for those specific low-volume queries yet — not wrongly
outranking a more appropriate page in either case.

**Blog** — Brazil's 3 PT posts and the flagged `/brazil/en/blog/online-medical-certificate-
brazil` are all negligible; the EN blog post's apparent 146-impression signal is LOW-DATA
NOISE (dozens of one-off fragment queries like "crm", "atestado?", "alphaville" at a
favorable but meaningless position) — confirmed **not** wrong-locale ownership of real PT
demand, since none of the real Portuguese head terms for the concept appear on it at all.
Romania's one live post (`diabetul-boala-tacuta`) is SUPPORTIVE/INFORMATIONAL; two more are
DRAFT, not live, not actioned.

**Internal links** — no defect found on any candidate in either market; homepage→services,
homepage→doctors, hub→detail, and doctor→services links all verified live and correct.
Confirmatory, not corrective, since neither market has a candidate with real demand to
link toward.

### 20.12 Product/operations dependencies found

Brazil: 16 unstaffed specialist services + 1 unstaffed active B2B page
(`corporate-pre-assessment`) — structural, one-doctor market. Romania: `evaluare-durere`
(active, indexed, internally linked, 0 assigned doctors — a genuine gap flagged for the
product/ops owner, not proposed as an SEO ticket) + 17 unstaffed specialist services — a
3-doctor market cannot cover 17 specialties. Neither is an SEO or content task.

### 20.13 Secondary locales

Brazil: no wrong-language ownership of real demand found (the one EN-locale anomaly,
`solicitacao-exames-online` at pos 1.5/58 impr/0 clicks, reads as generic global-intent
noise, not Brazil-market booking intent — noted, not actionable). Romania: several
service pages draw more volume on their EN-locale URL than RO (`gp-consultation-online`
hub, `medic-online-romania`, `a-doua-opinie-medicala`, `sanatate-mintala-online`), while
`/doctors` and the homepage favor RO — a mixed, non-displacing pattern. **Correction
(RO-SEO-001, §21): downgraded from "plausible driver" to hypothesis pending matched
query×page analysis at the time this was written — now resolved.** The content-depth
gap (§20.5) is real for 2 of the 4 named clusters but not causally linked to EN-outranks-
RO in the matched query data; see §21 for the per-cluster breakdown. Romania's hreflang
cluster spot-checked as still correct under SEO-FOUNDATION-004, not re-audited.

### 20.14 Cross-market ranking

Nothing in either market clears the bar for **ROOT CAUSE CONFIRMED — IMPLEMENTATION
READY**, and nothing rises even to **PROMISING — NARROW INVESTIGATION REQUIRED** (every
top item is either a pure wait, a confirmed wall, or a non-SEO staffing gap — there is no
open root-cause question left to investigate further). Ranked by remaining signal
strength, all zero-remaining-code-work items:

1. **Romania's 3-doctor recrawl trio** (Palaga, Bica, Brînduș) — cleanest signal in
   either market: real 3,300–4,500-char bios in the rendering field, correct internal
   linking, live production already `index,follow` and sitemapped; sole blocker is
   Google's own crawl cadence. Zero further implementation.
2. **Brazil's Dr. Renato Sarmento** — same mechanism, slightly less mature (single doctor
   vs three, 4-day-stale crawl vs 5–24 days). Zero further implementation.
3. **Romania `evaluare-durere` / Brazil `corporate-pre-assessment`** — real, narrow
   product gaps, but non-SEO (clinician-assignment/business decisions).
4. **Romania "medic online" / "a doua opinie medicala" and Brazil "atestado médico" /
   "consulta médica"** — the largest theoretical commercial value in both markets, but
   all four independently confirmed as SERP/business walls this pass, denser than any
   wall found in Waves 1–2 (Brazil includes the medical regulator's own competing
   platform; Romania includes a decade-plus dedicated telehealth sector plus its two
   largest private hospital networks). Ranked above the fully-closed items per this
   ticket's own instruction that a high-volume wall outranks a dependency with none —
   but **no content batch recommended** for either.
5. **16–17 unstaffed specialist services per market, tools/calculator clusters, weak
   specialist pages (`consultatie-neurologie`, `consultatie-pediatrie`, Brazil
   dermatologia/travel), `/lab-tests` (Romania), `sick-note-romania`** — resolved
   exactly, not left open: structural clinician-supply constraints, zero-demand
   (`sick-note-romania`: 0 rows in a 16-month property-wide pull), or correctly-informational
   traffic. None is an SEO candidate.

Both markets independently carry a **structural clinician-supply constraint** that would
cap any SEO-driven demand increase even absent the SERP walls (Brazil: 1 doctor for an
entire country market; Romania: 3 doctors covering 15 of 35 possible services) — worth
carrying into future roadmap prioritization as the reason Brazil and Romania are smaller,
harder markets than Waves 1–2's four, not as a new SEO ticket.

### 20.15 Selected candidate

**COUNTRY WAVE 3 — OPEN FOR ONE NARROW ROMANIA LOCALE-OWNERSHIP VERIFICATION** at the
time this section was written (superseded — see §21, RO-SEO-001, which closed this
verification 2026-08-13 with no implementation).

No BR-SEO-001 or RO-SEO-001 is proposed. Every candidate surfaced this pass in both
markets is either (a) a confirmed SERP/business wall with no code-side lever, (b) already
correct and pending Google recrawl/ramp, or (c) blocked on clinician-supply/product
completeness with no SEO case behind it. This mirrors how Country Wave 1 (§18) and
Country Wave 2 (§19.15) both closed — no manufactured ticket where the evidence says
"wait" or "no."

### 20.16 Measurement plan (watchlist additions, apply on next ledger housekeeping pass)

| Item | Target | Success condition | Failure condition | Recheck window |
| --- | --- | --- | --- | --- |
| Romania doctor trio (Palaga, Bica, Brînduș) | Current-shape URL `coverageState` via `inspect_urls` | Coverage flips to "Submitted and indexed" / PASS, branded-query impressions begin appearing | Coverage still stale past 2026-09-06 with no recrawl progress | ~2026-09-06 (25 days from first crawl + a normal cycle) |
| Brazil Dr. Renato Sarmento | Current-shape URL `coverageState` via `inspect_urls` | Coverage flips to PASS, branded-query impressions begin appearing | Coverage still stale past 2026-09-04 with no recrawl progress | ~2026-09-04 |
| Romania `evaluare-durere` | Doctor assignment (non-SEO) | A clinician is assigned and the service becomes genuinely bookable | Remains unstaffed | Not scheduled — product/ops owner decision, not a recheck |
| Brazil "atestado/consulta médica" wall, Romania "medic online/a doua opinie" wall | Property-wide GSC + SERP composition | MGH enters top 20 for any head query, or CFM/dominant-hospital-brand SERP composition changes structurally | No movement — treat as confirming the wall | ~2026-11-13 (90 days — walls this dense are not expected to move on a normal cadence) |
| Brazil single-doctor / Romania 3-doctor supply constraint | Clinician roster size per market | New doctor(s) onboarded to either market | No change | Not scheduled — business/hiring decision, not an SEO check |

**NO COUNTRY-WAVE-003 IMPLEMENTATION / NO DEPLOY / WAVE-3 UPDATE UNCOMMITTED.**

---

## 21. RO-SEO-001 — Romanian primary-locale vs English search-ownership verification (2026-08-13)

**Mode: read-only investigation.** No content changes, no metadata/canonical/hreflang
changes, no redirects, no publication changes, no deploy. Closes the one open item left
by §20.13/§20.15: whether §20's EN-outranks-RO pattern on 4 named Romania clusters is a
genuine Romanian-locale content/intent defect, or expected/noise/ramp. Method: matched
query×page GSC analysis per cluster (not the property-wide/generic pulls §20 used),
plus live content-equivalence reads and DB provenance checks. Data window: 90d,
`dataState=final`, 2026-05-13 → 2026-08-10 (same settle point as §20). No new paid
SERP/keyword credits spent — reused §20.8's already-confirmed wall findings where the
matched-query step found no new meaningful Romanian volume outside them.

### 21.1 Terminology correction (applies to §20.5 and §20.13 above)

Romanian is Romania's primary locale, not a secondary one. §20's "sitewide
thin-secondary-locale pattern" label for `/romania/ro/` was wrong framing, corrected
in place above. §20.13's "plausible driver" language is downgraded to what it actually
was — an untested hypothesis — and resolved below.

### 21.2 Four cluster URL pairs, technical status, GSC baseline

| Cluster | RO URL | EN URL | HTTP/robots/canonical/hreflang | RO 90d (clicks/impr/pos) | EN 90d (clicks/impr/pos) | Maturity |
| --- | --- | --- | --- | --- | --- | --- |
| GP consultation hub | `/romania/ro/gp-consultation-online` | `/romania/en/gp-consultation-online` | Both indexed, self-canonical, `index,follow`, hreflang correct | 0 / 13 / 23.7 | 2 / 13 / 8.2 | RAMPING (first impr. 2026-07-20/21) |
| `medic-online-romania` | `/romania/ro/services/medic-online-romania` | `/romania/en/services/medic-online-romania` | Both indexed, self-canonical, `index,follow`, hreflang correct | 1 / 3 / 7.0 | 0 / 33 / 5.0 | RAMPING |
| `a-doua-opinie-medicala` | `/romania/ro/services/a-doua-opinie-medicala` | `/romania/en/services/a-doua-opinie-medicala` | Both indexed, self-canonical, `index,follow`, hreflang correct | 0 / 1 / 7.0 | 0 / 31 / 21.5 | RAMPING — widest visibility gap of the four |
| `sanatate-mintala-online` | `/romania/ro/services/sanatate-mintala-online` | `/romania/en/services/sanatate-mintala-online` | Both indexed, self-canonical, `index,follow`, hreflang correct | 0 / 1 / — | 0 / 30 / 5.9 | RAMPING (first impr. 2026-07-19/20) |

All 8 URLs are ~3 weeks old in Google's index at extraction time — the same
2026-07-19/21 discontinuity §20.2 found for Romania's primary-locale surface overall.

### 21.3 Matched query×page findings

- **GP consultation hub** — RO itself already captures the visible Romanian queries
  ("consultatie medic online", "consultatie online", "consultatii online" — 1–4 impr
  each, weak position). EN's only visible query is English ("gp online"). No Romanian
  query found on the EN page. **No wrong-language ownership.**
- **`medic-online-romania`** — RO's 3 impressions are fully anonymized by GSC's
  per-query privacy threshold; EN's 33 impressions are 32/33 anonymized, with the one
  visible row ("evet") not a real Romanian or English commercial term. **INSUFFICIENT
  DATA at the query level** — the visibility gap cannot be attributed to language
  ownership from this data.
- **`a-doua-opinie-medicala`** — the only cluster with visible Romanian-language
  commercial queries landing on the EN page instead of RO: "obtine a doua opinie
  medicala" (1 impr — a near-paraphrase of the already wall-tested head term) and
  "unde pot obtine o a doua opinie internationala pentru un caz de neurochirurgie"
  (1 impr, long-tail). Both are single-impression, zero-click — at the noise floor, but
  the only real positive signal found across all 4 clusters.
- **`sanatate-mintala-online`** — RO's 1 visible query is English ("romania emergency
  mental health crisis 112 official") and correctly lands on RO. EN's 30 impressions
  are fully anonymized. **No Romanian-language query evidence either way.**

### 21.4 Content equivalence and provenance (live pages + DB read)

- **GP consultation hub** — **FULL INTENT EQUIVALENT.** Different content model than the
  3 service pages (`PageContent`/`PageContentTranslation`, key `GENERAL_CONSULTATION`).
  RO row is `PUBLISHED`, full hero/intro/who-for/why-choose/6-Q&A-FAQ/SEO fields,
  structurally identical to EN and the other 4 locales. Never actually thin.
- **`medic-online-romania`** — **FULL INTENT EQUIVALENT.** RO body 7,006 chars vs EN
  7,804 — near-parity, not the ~700–900-char figure §20.5's blanket statement implied.
  Full Romanian-system positioning section, categorized what-we-treat list, 6-item
  inclusions, 6-item why-us, 9-Q&A FAQ. Genuinely, fully authored RO.
- **`a-doua-opinie-medicala`** — **MATERIALLY INCOMPLETE.** RO has intro + 3-paragraph
  about + doctor listing + disclaimer only. EN additionally has a 7-reason "when a
  second opinion makes sense" section, a 7-item "who this is for" list, a 5-item
  "what's included" list, a Romania-market-context section, an explicit scope/
  limitations section, a 9-Q&A FAQ (incl. neurology/surgical/mental-health questions),
  and cross-links to related second-opinion services. RO is fluent, legally accurate,
  genuinely-authored Romanian — just structurally thinner. This is exactly the missing
  FAQ/cross-link content that plausibly would have caught the neurosurgery long-tail
  query in §21.3.
- **`sanatate-mintala-online`** — **MATERIALLY INCOMPLETE**, same pattern: RO 731 chars
  (intro + 2-paragraph about + doctor + one related link + disclaimer) vs EN 9,549
  chars. Genuinely authored, not mistranslated — RO's own text correctly refers complex
  psychiatric/psychology cases out, consistent with §20.5's staffing (no psychiatrist/
  psychologist in Romania).

**Provenance verdict for all 4**: genuinely authored Romanian content in every case —
none is a translation fallback or incomplete-migration artifact. Where RO is shorter, it
is a content-depth gap, not a data-quality defect.

### 21.5 Product/bookability fit

All 4 clusters correctly route to Dr. Robert Gabriel Brînduș (GP), Romania's only
GP-level doctor, consistent with §20.7. No product/staffing blocker on any of the 4 —
distinct from `evaluare-durere`'s 0-doctor gap (§20.10, unchanged, still a product
dependency, not in scope for this ticket).

### 21.6 SERP feasibility

Reused §20.8 for the head terms these 4 clusters map to — "medic online" (390/mo, KD 31)
and "a doua opinie medicala" (90/mo, KD 0) — both already confirmed dense SERP-business
walls (Romania's mature dedicated telehealth sector plus its two largest private
hospital networks). The matched query×page step (§21.3) found no cluster-specific
Romanian query volume outside those already-tested head terms large enough to justify a
fresh paid pull, so none was run. GP consultation hub and `sanatate-mintala-online` have
no confirmed real Romanian demand signal to test in the first place.

### 21.7 Internal links

No causally-linked asymmetry found on any cluster. `a-doua-opinie-medicala` has a mild
imbalance (RO gets a contextual link from the RO GP hub; the one related-service inbound
link sampled for EN was from `sanatate-mintala-online`'s EN sibling, not an equivalent
hub link) — noted, not treated as a driver given the underlying data is already
sub-noise-floor.

### 21.8 Per-cluster root-cause classification

| Cluster | Classification | Basis |
| --- | --- | --- |
| GP consultation hub | **A — NO REAL ASYMMETRY** | Matched query evidence already demonstrates expected language ownership: content fully equivalent, RO already owns its own Romanian queries, EN's only visible query is English. Pages are also young/ramping, but A is the primary classification — the evidence itself resolves the question, not just age. |
| `medic-online-romania` | **B — RANKING RAMP / INSUFFICIENT MATURITY** | 32/33 EN impressions and all RO query rows are hidden by GSC anonymization — insufficient matched-query evidence to affirm A or diagnose C/D. Content is near-parity (not thin), but that alone can't stand in for the missing query evidence. |
| `a-doua-opinie-medicala` | **E — SERP/BUSINESS-MODEL WALL** | The one Romanian-language query observed on EN is N=1, zero-click — insufficient for C (wrong-language ownership). RO is materially less complete than EN, but the exact commercial SERP is already dominated by major Romanian hospital/second-opinion providers (§20.8), so content depth is not demonstrated as the limiting factor. |
| `sanatate-mintala-online` | **B — RANKING RAMP / INSUFFICIENT MATURITY** | RO is materially less complete than EN, but no Romanian commercial query evidence demonstrates wrong-language ownership or a content-driven ranking deficit — insufficient maturity/data, not a diagnosed content gap. |

### 21.9 Overall Wave 3 decision

**CLOSE WAVE 3 — NO SEO IMPLEMENTATION.** All 4 clusters resolve to A/B/E. No cluster
reaches C (wrong-language ownership of real demand) or D (Romanian content gap with real
demand + viable SERP/product fit) — the two real content gaps found
(`a-doua-opinie-medicala`, `sanatate-mintala-online`) either sit behind a confirmed SERP
wall or have no measurable Romanian demand to justify content investment yet. No
RO-SEO-002 is proposed.

This **sharpens, not reverses**, §20.15's original call, via the requested matched-query
method rather than the property-wide pulls §20 used. It also corrects §20.5's blanket
"RO thin across all 4 clusters" framing: 2 of the 4 (GP hub, `medic-online-romania`) are
fully RO-equivalent and were never actually thin; the content-depth gap is real only for
`a-doua-opinie-medicala` and `sanatate-mintala-online`.

### 21.10 Final six-market program status

**COUNTRY WAVES 1–3 — ALL SIX PRIORITY MARKETS COMPLETE / MONITOR EXCEPTIONS.**
**NO SEO IMPLEMENTATION CURRENTLY JUSTIFIED.** There is no Wave 4 in the current
six-market strategy. The next phase is scheduled measurement and evidence refresh —
the full calendar, superseding §20.16's version with the RO-SEO-001 addition folded
into the existing Romania recheck rather than a standalone item:

- **~2026-09-01**: Czech travel-medicine redirect lag + Portugal doctor recrawl watchlist
- **~2026-09-04**: Brazil Sarmento recrawl
- **~2026-09-06**: Romania doctor recrawl + watch the second-opinion
  (`a-doua-opinie-medicala`) Romanian-query ownership signal — reopen only if
  Romanian-language commercial query volume on that cluster rises above
  single-impression noise
- **~2026-09-08**: Ireland lab cluster, Czech GP ranking ramp, Spain dermatología
- **~2026-09-30**: country FAQ measurement (§5 `SEO-GLOBAL-LANG-003`) **+ legacy
  consolidation share (§22.3) in the same trip** — both are GSC pulls on the same
  property, and §22.3 carries a stated threshold so the number cannot be reread as
  "still consolidating" indefinitely
- **event-driven only**: Czech doctor onboarding/business state, Hlavatý disposition,
  Spain gated-service content completion
- **~2026-11-13**: Brazil/Romania generic commercial SERP-wall recheck

Do not reopen any item early absent a genuine production/search regression.

**SIX-MARKET SEO PROGRAM COMPLETE / MONITOR EXCEPTIONS — NO IMPLEMENTATION / NO DEPLOY.**

---

## 22. LEGACY-CONSOLIDATION-001 — migration click evidence, legacy duplicate audit, blended-metric retirement (2026-08-15)

**Why this ran.** A "performance dropped" report. It had not. The pass is recorded
because what it produced is durable: the first click-level evidence the migration is
working, a closed finding on legacy duplicates, and a measure that needs a date and a
threshold rather than a rerun.

### 22.1 Headline — clicks 420 → 738, the first real evidence the migration is working

28-day windows, `get_search_console_performance`, `dataState=all`. Totals summed from
the `date` dimension and cross-checked against the `device` dimension (identical on both
windows); position is impression-weighted from the device rows.

| Window | Dates | Clicks | Impressions | CTR | Blended position |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-16 → 2026-08-12 | **738** | 36,028 | 2.05% | 18.4 |
| Prior 28d | 2026-06-18 → 2026-07-15 | 420 | 10,928 | 3.84% | 13.1 |

**Clicks +76%.** This is the finding. It extends §1's 414 → 719 (windows one day
earlier) with a second, independently-summed window, and it is the first measurement in
this document that shows the migration paying in clicks rather than in indexed URLs.

**The CTR and position lines below it are arithmetic, not findings.** Impressions grew
230% against 76% click growth, so both ratios had to fall; 26,000 new impressions
entering at positions 20–46 drag any sitewide mean. Mechanism already diagnosed and
closed in `SEO-GROWTH-012` — 568 previously-zero-impression pages, 75% of the volume the
`/tools/*` cluster. Nothing in the click series suggests a ranking loss, and the
query-level diff below confirms it.

**Query-level diff, same windows.** No page or query family collapsed. The largest
losers are 1–4 click doctor-name queries whose *rank held* while impressions fell
(`dr grainne ahern galway` 5 → 1 clicks at position 2.3 → 2.1). The gainers are larger
and commercial: `global health` 14 → 25, `global health ireland` 3 → 13, `global health
online` 2 → 8, `globalhealth` 3 → 7. At page level `/` went 108 → 144 clicks, and doctor
traffic visibly moved onto the current URL shape (`/ireland/en/doctors/dr-fahad-farooq`
1 → 14).

### 22.2 Blended position is retired from this ledger — report segments

**Do not record a sitewide average position while indexation is still expanding.** It is
currently measuring how much got indexed, not how well anything ranks, and it will keep
falling as more URLs enter. The blended figures above are kept only because they are what
a reader arrives holding; they are not a metric this document tracks going forward.

Segments measured this pass (same 28 days), which do carry meaning:

| Segment | Clicks | Impressions | CTR | Position |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 509 | 15,945 | 3.19% | 11.9 |
| Desktop | 224 | 19,826 | 1.13% | 23.7 |
| Tablet | 5 | 257 | 1.95% | 20.1 |

The commercial-vs-tools/informational split stays as `SEO-GROWTH-012` defined it; no
fresh per-segment numbers were pulled this pass, and none are invented here.

### 22.3 Legacy URLs — ZERO duplicates. Finding closed as "nothing to do"

**Every legacy URL earning search impressions is already consolidated.** This closes an
item open since the audit's first pass, and it closes it with no work.

Method: every non-current-shape URL appearing in the two page-dimension GSC pulls for the
current window (282 distinct paths), probed against production without following
redirects.

| Result | Count | What it is |
| --- | ---: | --- |
| 308 | 278 | Already consolidated. GSC attributes to the redirect *source* for weeks after the redirect lands |
| 410 | 1 | `/ireland-doctors/dr-grainne-ahern` — deliberate, see §22.4 |
| 200 | 2 | `/` and `/privacy` — live canonical pages, corpus artefact, see §22.5 |

**Real duplicate count: zero.** Redirected URLs cannot compete with their targets, so
framing the 308s as competing pages would have put work against a reporting artefact.

`/online-prescriptions/*` was probed as its own family first, because that shape was
absent from the earlier legacy probe set (`/service-page/*`, `/post/*`, `/product-page/*`
and `/{country}-doctors/*` were covered; this was not). All 10 shapes 308, including the
`/cs/` and `/es/` prefixed ones. Covered deliberately by `next.config.ts` — the
`online-prescriptions` feature flag is off in every market for Ads compliance, so the
aliases point at the GP page rather than forming a 308 → 404 chain. The
556-impressions/0-clicks reading on `/online-prescriptions/bacterial-vaginosis-prescription`
is a redirect source accumulating impressions, not a live page.

**Consolidation progress — the metric this leaves behind, with a date and a threshold.**
Of the 768 clicks attributed at page-dimension level, **369 (48%) still enter through a
legacy URL that 308s**, five weeks after the redirects landed. (Page-dimension totals
run slightly above the 738 date-dimension total; the share is computed within one
dimension.)

- **Re-measure 2026-09-30**, in the same trip as the country-FAQ measurement (§21.10
  calendar, §5 `SEO-GLOBAL-LANG-003`). Not before — this needs crawl time, not attention.
- **Threshold, stated in advance so it cannot be reread as "still consolidating":**
  the legacy click share should be **materially below 48% — call it under 30%**. If it
  is not, five weeks has become ten with no movement, and that is a **crawl-rate
  finding** to be worked alongside the 117 un-recrawled doctor URLs in §6, not a wait.
- Same underlying story as those 117 URLs: production is right, Google's stored state
  is behind.

### 22.4 Pre-registered — the Grainne Ahern numbers will vanish next window. That is the 410 working

`/ireland/en/doctors/dr-grainne-ahern` shows **8 clicks / 142 impressions** in the
current window, and `/ireland-doctors/dr-grainne-ahern` a further 2 / 51. The 410 landed
**2026-08-08, mid-window**, so both figures are pre-410 days inside the range.

**Recorded now so that whoever pulls October's numbers does not read a fresh
regression:** these go to zero by design. The cost was booked at the decision —
74 clicks / 600 impressions / 90 days / average position 3.8, owner-confirmed departure,
`GONE_DOCTORS` in `frontend/lib/seo/gone-content.ts`. Both the legacy and current-shape
URLs answer 410 by design (the two-part mechanism: middleware 410 plus gone-slug
exclusion from the broad redirects), which is also why the `grainne ahern` query lost all
19 of its impressions in the diff. The recovery path is unchanged and still lives in §5's
successor page — it is not a redirect problem and must not be "fixed" with one.

### 22.5 The two 200s are the seventh instance of the corpus-assembly failure

The legacy corpus was built by URL-shape pattern-matching, which swept in `/` and
`/privacy` — legitimate canonical pages that happen to be redirect *targets*, one of them
the site's own homepage. The probe ran correctly; the corpus was assembled by a rule
rather than observed.

Same family as the honorific-drift synthesis, the truncated GSC pull, the diacritic-free
Czech keyword research and this document's redirect-arrow attribution bug (§5, "Four
instances now" — that tally was written 2026-08-14 and has not been updated since;
counted as the **seventh** by Hassaan in session, 2026-08-15).

**The tell was the same shape as the `grep -c` sitemap case: a "legacy" bucket containing
the homepage is implausible on its face.** Implausibility of the *output* remains the
cheapest available detector for this class — cheaper than validating the corpus, and it
is what caught this one.

### 22.6 The two high-impression zero-click blog pages are NOT title problems

Pulled query-level before writing them up, exactly because an average position can hide a
bimodal spread with a different fix. Both turned out to be the latter.

| Page | Page-level | Query-level reality |
| --- | --- | --- |
| `/ireland/en/blog/illness-benefit-ireland-how-to-claim` | 524 impr / 1 click / pos 9.9 | 46 queries, all zero-click. The best positions are on **navigational state-benefit queries** — `ib1 form online` pos 1, `ib1 form` pos 2.3, `ib1 form online login` pos 9.6 — where the searcher wants welfare.ie, not a clinic blog. Head query `illness benefit ireland` sits at 15.5, not 9.9 |
| `/ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment` | 882 impr / 0 clicks / pos 28.6 | 145 queries, **almost every one a single impression at position 74–100**, with a handful at 15–28. The 28.6 mean describes no actual query |

**Neither is a snippet or title defect.** The first is wrong-intent ranking on a
government-form family; the second is page-8-to-10 visibility on a generic informational
family owned by public-health institutions. A title rewrite would move nothing. No work
item is proposed for either.

**Data limitation, stated:** GSC's query dimension returns far fewer impressions than the
page dimension for both pages (118 of 524; ~150 of 882) because rare queries are withheld.
The distribution shape is reliable; the totals are not.

### 22.7 Control-state carry-forwards

- **No code changed. Nothing deployed.** This pass is measurement and one closed finding.
- §1's baseline stands; §22.1 is a second window, not a correction to it.
- §6's watchlist is unchanged — the consolidation share in §22.3 is a *progress* measure
  over the whole legacy family, not a per-URL watchlist item, and it is dated in the
  §21.10 calendar rather than added as an eleventh row.
- `SEO-GROWTH-012` remains the diagnosis of the impression surge. §22 adds click
  evidence to it and does not reopen it.

---

## 23. RANKING-INCIDENT-001 — early audit after owner-reported ranking drop (2026-08-16)

**Trigger.** Owner reported rankings dropping and explicitly asked for the audit before
the §21.10 measurement calendar. That is a genuine regression report under §0, so the
early evidence refresh ran. It does not move the dated pass/fail gates for crawl-lag
items that still need time.

### 23.1 Verdict — no sitewide ranking or technical incident

Latest complete GSC day: **2026-08-13**. Matched date-dimension totals:

| Window | Current | Comparison | Clicks | Impressions | CTR | Blended position |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 7 days | 2026-08-07 → 08-13 | 2026-07-31 → 08-06 | **204 vs 172 (+19%)** | **16,769 vs 7,399 (+127%)** | 1.22% vs 2.32% | 19.1 vs 17.8 |
| 14 days | 2026-07-31 → 08-13 | 2026-07-17 → 07-30 | **376 vs 374 (flat)** | **24,168 vs 14,001 (+73%)** | 1.56% vs 2.67% | 18.7 vs 17.8 |
| 28 days | 2026-07-17 → 08-13 | 2026-06-19 → 07-16 | **750 vs 437 (+72%)** | **38,169 vs 10,871 (+251%)** | 1.96% vs 4.02% | 18.4 vs 13.3 |

The reported drop is the blended position/CTR line, not a click loss. The mechanism is
still `SEO-GROWTH-012`: page-dimension visibility expanded from 756 pages in the prior
week to 1,143 in the current week. New tool, blog and lab URLs enter at lower positions
and mechanically deepen the mean. Mobile position was stable (12.4 → 12.6) while
desktop impressions nearly doubled (4,200 → 8,351) and desktop position moved 21.9 →
25.7. Five priority markets gained clicks; Spain was effectively flat (25 → 24).

**Reporting rule reaffirmed:** do not use sitewide average position as a ranking KPI
while discovery is expanding. Report fixed commercial cohorts separately from tools,
informational blogs and legacy redirect sources.

### 23.2 Live technical verification

- Full production gate: `SEO_CHECK_BASE=https://www.myglobalhealth.online pnpm
  --filter frontend exec vitest run tests/unit/seo-live-urls.test.ts` — **8/8 passed**.
- Host, protocol and trailing-slash canonicalization remain correct. `robots.txt`,
  sampled canonicals, `robots` directives, `hrefLang` clusters, schema and deliberate
  308/410 behavior all matched the architecture.
- Live sitemap: **1,932 URLs** (+26 since 2026-08-12). Eight sampled URLs were 200,
  indexable and self-canonical. 314 rows omit `lastmod`, up nine from the §5b sweep;
  many are deliberately undated static pages. No synthetic date is proposed.
- Repository history since the baseline contains no SEO-affecting deploy regression.
  The country FAQ route/redirect batch is live and behaves as ledgered.
- `scripts/seo-ledger-sweep.py` reported three apparent disagreements. All are dated
  historical observations already labelled superseded: the two pre-retirement FAQ
  404s and the legacy Alfredo del Valle 200. This is sweep context loss, not production
  drift.

### 23.3 Isolated losses

| URL / query | 7-day change | Verification | Decision |
| --- | --- | --- | --- |
| `/ireland/en/services/neurology-specialist-consultation` | 26 → 3 impressions, 2 → 0 clicks, position 15.5 → 30.3 | Live 200, `index, follow`, self-canonical. URL Inspection PASS and indexed, but last crawl 2026-07-18 and stored `user_canonical` absent. | **One manual action:** inspect in GSC and request indexing, then recheck after seven complete days. The stale crawl is not established as the cause; this removes one low-risk uncertainty. No code change. |
| `/` | 35 → 17 clicks; impressions 429 → 427; position **improved** 24.6 → 18.2 | URL Inspection PASS, indexed, canonical match, crawled 2026-08-15. | CTR/query-mix watch, not a ranking fix. Do not rewrite title on one week. |
| `/spain/es/doctors/dr-alfredo-del-valle` | 25 → 0 impressions, 4 → 0 clicks | Live 200/indexable/canonical; URL Inspection PASS, indexed, canonical match. Prior named-query sample was only 10 impressions. | Demand/sample volatility until repeated for 14 days. No code change. |
| `praktický lékař online` → Czech GP page | position 15.0 → 22.8 on 16 → 12 impressions | URL Inspection PASS, indexed, canonical, crawled 2026-08-13. | Below the pre-registered maturity gate; keep the 2026-09-08 check unless a 14-day ≥20% loss develops. |

### 23.4 Action and carry-forwards

1. **Today:** manually request re-indexing for the Ireland neurology page through GSC
   URL Inspection. This is the safest next check, not a proven root-cause fix. It is a
   single-URL recrawl request, not Indexing API submission.
2. **Reporting fix implemented:** the admin GSC endpoint now pulls authoritative totals,
   daily rows and page rows separately; returns impression-weighted `revenue`, `tools`,
   `informational`, `legacy` and `other` summaries; and defaults to 28 likely-complete
   days ending three days before the request date. Focused backend tests: **8/8
   passed**; backend type-check passed.
3. **No public SEO template or routing change and no deploy.** Production already serves
   the correct search signals; the code change prevents reporting mix from being read as
   a sitewide ranking incident. Speculative metadata or template edits would target the
   wrong mechanism.
4. §21.10's measurement calendar remains in force for every other item. This early
   audit closes the reported broad incident; it does not pre-judge the September
   crawl-lag thresholds.
5. Shareable report: `docs/audits/seo/seo-audit-2026-08-16.html`.

---

## 24. LEGACY-URL-CLEANUP-002 — owner-directed dead-link disposition (2026-08-17)

**Trigger.** The owner supplied the current GSC "Crawled – currently not indexed"
export and directed that non-live Wix aliases be removed rather than kept as redirects
to dead or unrelated pages. Focused production probes confirmed the defect: several
doctor aliases ended at 404, while broad product and category rules sent identifiable
content to `/` or to a generic hub despite an exact current page existing.

**Decision and implementation.** Exact surviving lab-product aliases now redirect to
their matching `/ireland/{lang}/lab-tests/{slug}` page; `home-delivery` routes to the
localized lab hub; the observed `all-products` and `health-education` categories route
to the localized lab and blog hubs. Homepage fallbacks for `product-page/*`,
`gift-card`, and broad category aliases were removed. Observed dead doctor aliases,
unmistakable CMS placeholders, retired beauty/telemedicine products, and gift-card
aliases are path-level 410s in `frontend/lib/seo/gone-content.ts`.

Path-level doctor removals are deliberately distinct from `GONE_DOCTORS`: Mirza Aun
Muhammad and Irene Galve Moros still appear in migration data even though the probed
production profile URLs returned 404. The Wix-era language variants of those aliases
are retired without claiming the clinician entity is departed; current canonical
doctor-route shapes remain governed by the live content inventory.

**Verification.** Focused redirect/gone-path suites: 135 passed, 5 network-gated tests
skipped; frontend TypeScript passed; Next production build passed (885 static pages,
degraded fallback enabled because the configured backend returned missing-country
content during prerendering). A built-app HTTP pass verified 7 representative direct
308s and 7 direct 410s; every 410 had no
`Location` header, including the encoded Unicode and parenthesized URL cases. No
production deploy was performed in this pass.

---

## 25. EXT-AUDIT-001 — third-party audit triage and content-visibility fix (2026-08-19)

**Trigger.** The owner supplied three external reports — a diib scorecard, a
generic "Issues to fix"/"Recommendations" audit of `/portugal/en`, and a Website
Carbon rating — plus a reviewer summary. Every claim was checked against live
production and the repository before any work started.

**False positives, verified and not to be reopened without new evidence.**

| External claim | What production actually serves (2026-08-19) |
| --- | --- |
| "Add Alt Attributes to all images" | 49 `<img>` elements on `/portugal/en`, none missing `alt` |
| "Implement an Analytics Tracking Tool" / "Install a Facebook Pixel" | GTM, Clarity and the Meta Pixel are all present but consent-gated; the scanner declined cookies and therefore saw none of them |
| "Add an SPF Mail Record" | `v=spf1 include:spf.migadu.com -all` is published |
| "Increase length of Title Tag" / "Make greater use of Header Tags" | Title is 53 characters; the page carries one `<h1>` and ten `<h2>` |
| "Serve resources from a CDN" | Railway's edge already serves the site; `/_next/static/*` is `public, max-age=31536000, immutable` |
| "Add Business Address and Phone Number" / "Add Local Business Schema" | `MedicalOrganization` with `PostalAddress`, `ContactPoint`, Wikidata and fifteen regulator `sameAs` entries is emitted. `LocalBusiness` is the wrong type — there is no walk-in premises |
| "Eliminate render-blocking resources" (HIGH) | Two stylesheets totalling 39 KB brotli. Mobile speed 1.1 s against a 2.7 s industry average, Core Web Vitals 96/100, Performance grade A+. No architectural change is justified |
| "Create and link your Facebook Page / X Profile" | `sameAs` already lists five Instagram accounts, LinkedIn, YouTube, TikTok and Wikidata. Off-site business decisions with negligible SEO value |

**Real findings.** Three, none of them the ones the reports ranked highest.

1. *Email authentication* — DMARC is `p=none`, and raising it would break
   transactional mail: SPF authorises only Migadu with a hard fail, DKIM
   publishes only Migadu selectors, and `backend/src/lib/email/send-email.ts`
   sends through the Gmail API or SendGrid. Both paths currently fail SPF and
   DKIM alignment. Owner has assigned this elsewhere; recorded here so the
   dependency is visible.
2. *Off-site authority* — 57 referring domains, backlink rank 43, with `wix.to`
   still the largest single referrer. This is the ranking ceiling and no code
   change addresses it. Tracked in the growth roadmap, not the ledger.
3. *Content credibility* — the reviewer's "few cited sources, minimal patient
   proof" reading was partly a rendering artefact: the entire patient-reviews
   section was absent from the served HTML (SEO-009 above). Clinical-reviewer
   bylines were sampled across ten English service pages and eight carried a
   named, credentialed reviewer, so the E-E-A-T scaffolding is present and
   mostly populated; `ClinicalReviewer` deliberately renders nothing when no
   real reviewer is assigned, so the two gaps are unset data, not a defect.

**Implemented in this pass:** SEO-009 and SEO-010. Frontend `tsc --noEmit`
clean; `components/sections` suite 5/5 including a new SSR regression test.
No deploy performed.

**Not implemented, and why.** Adding home-page links into `/health/*` was
considered for "limited editorial depth" and rejected: those pages are
deliberately excluded from navigation and service listings under the
internal-linking spec's Rule 6. Editorial volume and source citation remain
owner/clinician work, not code.

---

## 26. EXT-AUDIT-002 — deploy check, reviewer-byline root cause, authority and editorial groundwork (2026-08-19)

Follow-up batch to §25. Full working document, including the target lists and
article proposals that are too long for this file:
`docs/plans/seo-followup-batch-2026-08-19.md`. **No code was changed and nothing
was deployed, sent or submitted in this pass.**

**`553bc088` has not shipped.** Googlebot-UA fetch of `/portugal/en` on
2026-08-19, `<script>` stripped: `Rated by real patients` appears 0 times,
`doctify` 0 times, and none of the fourteen served `h2` elements is the reviews
heading. The commit is on `origin/Dev-hassaan` only. SEO-009/010/011 therefore
remain unverified in production; re-run both checks after deploying.

> **Superseded later the same day — `553bc088` has since shipped and SEO-009/010
> are verified in production.** Googlebot-UA fetch of `/portugal/en`, `<script>`
> stripped: `Rated by real patients`, `Patient reviews` and the lede each appear
> once in the served DOM (SEO-009). Certification-logo variants now request
> `w=640/828` for `livro-de-reclamacoes-red.png` and `w=64/128` for
> `ordem-dos-medicos.png`, down from `1200/2560` and `160/384` (SEO-010). SEO-011
> ships in the same commit and the same build; its user-visible effect (English
> widget labels instead of blanks on `pt`/`es`/`cs`/`ro`) still needs one manual
> pass with third-party consent accepted, since the widget script is injected
> client-side after consent and is not observable in the HTML response.

> **SEO-012 closed by the owner, same day.** Both Clinical Director settings were
> created as recommended — Spain: Dra. María Fernanda Ocampo Mora; Brazil:
> Dr. Renato Sarmento. A full re-sweep of all 116 English service URLs from the
> live sitemap now returns a named clinical-reviewer byline on every one:
> Ireland 23/23, Portugal 23/23, Czechia 15/15, Romania 17/17, Spain 20/20,
> Brazil 18/18. Zero missing, down from 38. No code change was made, which was
> the correct call — the rendered byline reads the country's featured doctor, not
> `Service.reviewerDoctorId`.

**SEO-012 — clinical-reviewer byline, correcting §25's third finding.** §25
recorded the two missing bylines as unset `Service.reviewerDoctorId` values,
inferred from a ten-page sample. A full sweep of all 116 English service URLs
from the live sitemap shows the gap is **38 pages**, and it is not that field.

Missing bylines by country: Ireland 0/23, Portugal 0/23, Czechia 0/15,
Romania 0/17, **Spain 20/20, Brazil 18/18**. A clean per-country split, because
`services/[serviceSlug]/page.tsx:339` feeds the visible byline from
`allDoctors.find((d) => d.isFeatured)` — the country's Clinical Director, stored
in `Setting["featured_doctor:<code>"]` and resolved at
`doctors.service.ts:541`. `Service.reviewerDoctorId` resolves separately into
`contentReviewer` and reaches only the JSON-LD `reviewedBy` (line 384), never
the rendered byline. Spain and Brazil simply have no `featured_doctor` row;
their `/doctors` pages render no Clinical Director spotlight either, while the
other four markets do. Setting `reviewerDoctorId` would have changed the
structured data and left all 38 pages visually unchanged.

Blog posts are unaffected — they use a genuinely per-post
`BlogPost.reviewerDoctorId`, which is why `/spain/en/blog/sick-leave-anxiety-spain`
shows a named Spanish reviewer while every Spanish service page shows none.

Also note: `parar-de-fumar-online` is a Brazil slug. Portugal's stop-smoking
page is `deixar-de-fumar` and already carries a byline.

**Fix is owner-side, two admin actions**, at `/admin/doctors/<id>` → "Set
Director (ES)" / "Set Director (BR)". Recommended: Brazil — Dr. Renato Sarmento
(CRM 170837/SP, Family and Community Medicine; the only doctor on the roster).
Spain — Dra. María Fernanda Ocampo Mora (CGCOM 291409735); of the six Spanish
profiles carrying a CGCOM verification link she is the one whose practice is
actually general and family medicine. Do **not** add a code fallback from
`reviewerDoctorId` — it would change what 78 already-correct pages display.

**Backlink profile rebaselined:** rank 43, 520 backlinks, **59** referring
domains (§25's 57 is superseded), spam score 7. Two findings that change the
off-site plan:

- All 195 `wix.to` backlinks — 37.5% of the profile, from the only rank-70
  domain in it — point at legacy `/booking-calendar/<slug>` URLs that now
  resolve to six generic country `/book` pages. None of the equity reaches any
  of the 116 service pages. `baja-medica`, a Spanish service, landed on
  `/ireland/en/book`. **Fixed in this pass — see SEO-013 below.**
- Roughly 240 backlinks arrived 2026-05-21 → 2026-08-01 from eleven
  article-directory and link-farm domains, taking referring domains 42 → 53 in
  May 2026 alone. Ask the owner whether links were bought. **Do not disavow**
  absent a manual action in Search Console.

**Doctify language limitation independently re-verified and widened** from
eleven codes to fifteen. Only `en` (25,538 bytes) and `de` (25,559) return
populated chrome; `pt`, `pt-PT`, `pt-BR`, `es`, `es-ES`, `cs`, `cs-CZ`, `ro`,
`ro-RO`, `fr`, `it`, `nl`, `pl` each return a **byte-identical** 25,447-byte
payload with the label spans empty. Identical length across four language
families indicates a single "unknown language → empty string" branch, not
thirteen incomplete translation files. A support message is drafted in the
working document and has **not** been sent.

**Editorial groundwork.** 43 article topics proposed across IE (10), PT (9),
CZ (8), RO (8), ES (8), each tied to a real GSC query or Google Ads volume
figure, an existing service page, and named primary sources. Brazil is
deliberately deferred: no Clinical Director, one doctor on the roster, and its
GSC impressions are dominated by brand collision with unrelated Brazilian
entities (`clinic global health` 428, `clinic.globalhealth` 167,
`help global brazil`). Nothing is drafted or published. Every proposal carries
the same gate: `BlogPost` needs a named, consenting `authorDoctorId` and
`reviewerDoctorId` and a real `lastReviewedAt` before it can publish — no
invented byline, review date, statistic, or patient review.

DMARC remains assigned elsewhere; no DNS was touched. No script was run against
`backend/.env`, which points at production — every database question was
answered from live public pages, public JSON-LD, and repository code.

---

**SEO-013 — legacy `/booking-calendar/*` link equity redirected to service
pages.** The one item in this batch that was fixable in code.
`frontend/next.config.ts`, guarded by
`frontend/tests/unit/booking-calendar-legacy-redirects.test.ts`.

All 195 `wix.to` targets were pulled, de-duplicated (195 distinct bare
`/booking-calendar/<slug>` paths, no locale prefix) and matched by hand against
the live sitemap. **94 now redirect to their service page**; the remaining 101
have no live equivalent and keep a `/book` fallback — a redirect into a 404 is
worse than one to a booking page. Excluded on purpose: the 18 `-prescription`
slugs (those flows are flag-hidden, so linking to them would surface pages meant
to stay unlisted), specialties with no live page (urology, venereology,
geriatrics, endocrinology, gastroenterology, immunoallergology, pneumology,
rheumatology, genetics), and six slugs spelled identically in Portuguese and
Spanish (`consulta-de-genética`, `consulta-ortopédica`, `consulta-pediátrica`
and their `-1` duplicates) where there is no market marker to read.

Secondary win: Wix left most non-Irish slugs unprefixed, so they all defaulted
to Ireland's English booking page. Two wildcard rules for `konsultace-*` /
`konzultace-*` plus 23 spelled-out ES/PT slugs cut `/ireland/en/book` from 75
legacy slugs to 39, with `/czechia/cs/book` going 0 → 14 and `/spain/es/book`
2 → 10.

**Trap worth remembering: Next matches redirect `source` values against the
ENCODED pathname.** A literal `ã`/`ț`/`é` in a `source` never matches a real
request — the rule compiles, type-checks, ships, and silently does nothing while
the slug falls through to the catch-all. Found by driving the rules through a
local dev server instead of reading them: of 30 probe slugs, all 14 ASCII ones
matched and all 16 accented ones missed. Fixed with `encodeURIComponent` at
construction time so the source table stays readable. Roughly half the mapped
slugs are accented, so a review-only pass would have shipped a table that did
nothing for them. The unit test asserts this specifically and goes red when the
encoding is removed.

Verification: frontend `tsc --noEmit` clean; all 195 legacy slugs driven through
a local dev server percent-encoded as a browser sends them — 195/195 redirect,
0 wrong destinations, 0 non-redirects; all 67 distinct destinations fetched from
production return 200; the new test 6/6, and 2/6 red when `encodeURIComponent`
is removed. `vitest run tests/unit`: 277 passed, 5 skipped, 1 failure —
`portal-breadcrumb-routes.test.ts`, **pre-existing and unrelated** (it reads only
the `app/` tree and never imports `next.config`; two portal breadcrumb trails
point at parent pages that do not exist). Not committed, not deployed.

---

**SEO-014 — every URL an external site actually links to, swept for dead ends.**
Same pass as SEO-013, widened from the `wix.to` slugs to the whole backlink
profile. The 520 backlinks reduce to **36 distinct target paths**; each was
fetched from production. **Seven returned a hard 404.**

| Path | Was | Now |
| --- | --- | --- |
| `/services-1-4` | 404 | `/ireland/en` |
| `/pricing-plans/checkout-1` | 404 | `/ireland/en/pricing` (via a new `/pricing-plans/:slug`) |
| `/product-page/haemochromatosis-test` | 404 | `…/lab-tests/genetic-haemochromatosis-test` |
| `/product-page/vitamin-d-blood-test` | 404 | `…/lab-tests/vitamin-d-test` |
| `/product-page/vitamin-b12-blood-test` | 404 | `…/lab-tests/vitamin-b12-test` |
| `/product-page/thyroid-home-blood-test` | 301 **into a 404** | `/ireland/en/lab-tests` |
| `/pt/portugal/traveler/'s-consultation` | 404 | `…/services/consulta-do-viajante` |

`/services-1-4` is the only broken link the site has from a genuine referring
site — Coombe Community Pharmacy's homepage.

**Two root causes, not seven one-offs.**

1. *No `/product-page/:slug` catch-all ever existed*, though `/home-health-tests`
   has had one all along. Three slugs were listed in the `/home-health-tests`
   alias table but never in the `/product-page` one, and with nothing to break
   their fall they 404'd instead of reaching the lab hub. Catch-all added.
2. *A redirect can be present, correct-looking and still dead at the far end.*
   `/product-page/thyroid-home-blood-test` pointed at
   `/ireland/en/lab-tests/thyroid-function-test`, which has never been
   published. `legacy-url-cleanup.test.ts` asserted that exact destination, so
   the test was pinning the bug in place. Both corrected; no thyroid test is
   live, so it now falls to the hub. **All 136 literal redirect destinations in
   `next.config.ts` were then fetched from production — this was the only dead
   one.**

**Regression caught while fixing it, worth remembering.** The first version of
the `/product-page/:slug` catch-all swallowed `/es/product-page/beauty-focus-multibeauty`,
which is registered in `lib/seo/gone-content.ts` and must answer **410 Gone**.
A catch-all redirect silently converts a 410 into a 301 and keeps a retired URL
alive in the index. Both new catch-alls now use `slugMatcherExcludingGone("product-page")`,
the helper the doctor-alias rules already use. Verified live: `/es/product-page/beauty-focus-multibeauty`
still answers 410. **Any future catch-all over a legacy Wix prefix needs the
same treatment.**

Also retargeted, where a precise page existed and the link was landing on a hub:
`/{locale}/portugal/traveler's-consultation` (**eight referring domains — the
largest non-homepage cluster in the profile**) went to
`/portugal/pt/see-a-specialist` because only the bare, non-locale-prefixed
apostrophe form had a rule; it now reaches
`/portugal/pt/services/consulta-do-viajante`. And
`/post/hand-foot-and-mouth-disease-signs-and-treatment` was falling to the blog
index although the article is published under exactly that slug.

Net across all 36 linked paths: **0 broken (was 7), 22 landing on a precise
page (was 20).** The 13 that still land on a hub are correct — seven retired
blog posts with no current equivalent, a thyroid test that does not exist, the
pricing page, the homepage, and two specialist hubs at the right level.

Verification: frontend `tsc --noEmit` clean; 24 redirect assertions against a
local dev server including 10 regression cases, 0 failures; all 36 linked paths
re-swept, 0 non-redirects; `vitest run tests/unit` 282 passed, 5 skipped, 1
failure (`portal-breadcrumb-routes.test.ts`, pre-existing and unrelated, being
fixed separately). New guard: `frontend/tests/unit/legacy-wix-backlink-targets.test.ts`,
which asserts no lab-test redirect points at an unpublished slug.

---

## 28. IE-WEBDOCTOR-RESEARCH-001 — Ireland market research package (2026-08-25)

**Scope.** A new derived research package lives at `seo/ireland/README.md`.
It contains the requested Ireland baseline, all 282 public WebDoctor sitemap URLs
with a 20-page bounded deep template sample, 152 retained and scored keywords,
a 27-URL live target inventory/map, content gaps, clinical gates, briefs, backlink prospects,
measurement plan and roadmap. It is not a second ledger; this file remains the
operational source of truth.

**Fresh first-party baseline.** GSC final data filtered to Ireland
(`country=irl`) returned 119 clicks and 7,283 impressions across 1,851
query-page rows for 2026-05-25 → 2026-08-22, versus 72 clicks and 1,176
impressions across 338 rows for the preceding equal period. The rapid impression
increase is consistent with index expansion and is not treated as a conversion
trend. OpenSEO's GA4 organic view returned only 24 sessions and zero key events
for the current period, with no previous comparison; analytics coverage and
generic key-event configuration therefore require reconciliation before organic
conversion rate is used for page decisions.

**OpenSEO market evidence.** Ireland domain estimates were 217 organic visits /
112 keywords for Global Health and 80,967 / 3,036 for WebDoctor. Filtered
domain-scope backlink summaries were 36 versus 117 referring domains. Five
sampled live SERPs placed WebDoctor #1 for `online doctor ireland`,
`home blood test ireland` and `online mental health consultation`, #2 for
`online weight management ireland`, and outside the sampled top ten for
`sick cert online`. The focused batch used 480 credits (16,807 → 16,327);
no tracker, recurring check, saved keyword, project-memory write or external
mutation was created.

**Implementation decision.** No public code, CMS data, routes, metadata or
clinical flow changed. The latest OpenSEO audit completed its 100-page budget
with zero critical issues, one thin-root warning and informational title/
description length flags. Those heuristics do not override the previously
verified architecture. The Ireland lab cluster remains frozen until the
approximately 2026-09-08 gate. Next eligible work is the dated remeasurement,
sick-certificate recrawl check, page-level query-intent review and GA4/GSC
reconciliation described in the package.

---

## 29. IE-SERVICE-HUB-001 — GP roster and specialist schema alignment (2026-08-25)

**Status: DEPLOYED ON MAIN.** `origin/main` points at implementation commit
`60449ffd`, and the owner confirmed the deployment is live. A focused review of
the existing Ireland GP and specialist hubs confirmed that the earlier CMS
content batch was already live; no production patch script was rerun and no
title, meta, H1, price, duration, credential, clinical claim or booking behavior
changed in this code batch.

Two code defects were corrected. The GP hub previously rendered the first six
country doctors without proving a reciprocal assignment to an active GENERAL
service, allowing specialist-only clinicians to appear beneath GP-oriented
headings. It now uses the same assignment contract as the specialist hub,
deduplicates multi-assigned doctors, preserves featured/catalogue order and
retains the six-card cap. The specialist hub previously emitted fallback FAQ
and service JSON-LD even when visitors saw authored CMS content; schema and UI
now share the visible authored/fallback FAQ and hero description, including a
non-empty fallback when an enabled authored FAQ contains no completed rows.

**Verification.** RED tests first failed on the missing helpers. The completed
batch passes 23 focused tests, frontend locale/typecheck, touched-file ESLint
and independent review. The full frontend suite is 1,015 passed / five skipped /
one unrelated pre-existing sick-certificate redirect expectation failed. The
production build compiled and typechecked, then failed during prerender because
the backend was unavailable; this is the existing build-environment dependency.
OpenSEO URL Inspection on 2026-08-25 reports both canonical hubs submitted and
indexed with matching Google-selected canonicals. Google last crawled the GP hub
on 2026-08-25 and the specialist hub on 2026-08-24. A post-deploy rendered
roster/schema comparison remains a separate data-quality check.

---

## 30. IE-CONSULTATION-COPY-001 — complete GP and specialist hub copy (2026-08-25)

**Status: LIVE IN PRODUCTION — ALL SIX LOCALES VERIFIED.** Complete content now
covers the existing CMS-authored surface of both canonical Ireland hubs in English,
Czech, German, Spanish, Portuguese and Romanian: metadata, H1/hero copy, overview,
suitability, trust reasons, FAQs, CTA labels and medical limitations. Prices,
durations, doctor availability and appointment times deliberately remain
catalogue-driven rather than being copied into static claims.

**Fresh OpenSEO evidence.** URL Inspection reports both canonical URLs submitted
and indexed. The 2026-05-22 to 2026-08-22 final Search Console window returned 57
queries for the GP hub, with its useful non-brand terms mostly around positions
22–30, and five low-volume specialist-hub queries. Focused Ireland metrics returned
880 monthly searches / KD 27 for `online gp ireland` and 140 / KD 22 for
`gp online appointment`. Four live SERPs confirmed a crowded GP result set and no
dedicated specialist hub among the sampled leaders. That supports one GP intent
owner and one distinct specialist intent owner, not another competing URL.

**Implementation controls.** The new patcher is dry-run by default, requires the
exact content-version confirmation to write, preserves publication state and
section toggles, and uses `updatedAt` optimistic concurrency checks in one
transaction. Fourteen focused content tests pass, including order-insensitive JSON
read-back comparison; backend type-check and targeted lint pass.

**Production apply and locale verification (2026-08-25).** The reviewed English
fields and five localized variants were saved through the authenticated
`www.myglobalhealth.online/admin/page-content` editors for both Ireland records.
Both records remained `PUBLISHED` and active; CTA targets, images, themes, section
visibility and catalogue-driven data were unchanged. An independent claims pass
preserved IMC registration, changing price/availability language, referral and
certificate uncertainty, clinical discretion and the 112 emergency exclusion. A
draft that reintroduced a fixed specialist roster and blanket no-referral promise
was rejected before save.

The committed manifest and guarded replay script cover the English (`EN`) source
only. Czech, German, Spanish, Portuguese and Romanian were reviewed and saved
manually in the production CMS; they are production state recorded by this ledger,
not replayable payloads in this repository batch. Re-read the CMS translations
before any future localization sweep rather than treating the English patcher as
their source of truth.

Post-save admin reloads read back the localized titles, H1s and final FAQ fields for
all five translated locales. Cache-busted public HTML checks returned HTTP 200 and
the new localized SEO title and H1 on all 12 Ireland combinations (two hubs × six
locales); the new final FAQ also appeared on all ten non-English hub URLs. The
separate `https://api.myglobalhealth.online` page-content route still
returned `record: null` during the investigation even though the rendered site is
now serving the CMS copy; treat that custom-domain/backend-origin discrepancy as a
configuration watch item, not as evidence that the rendered release is absent.

---

## 31. IE-GENERAL-SERVICE-KEYWORDS-001 — 16-service keyword map and full six-locale update (2026-08-25)

**Status: LIVE IN PRODUCTION — 96 UPDATED VARIANTS VERIFIED.** All 16 active Ireland
`GENERAL` services now have one documented commercial-intent owner in
`seo/ireland/12-gp-service-keyword-map-2026-08-25.csv`. Fresh final GSC query/page
rows, bounded WebDoctor landing-page/domain rankings and focused OpenSEO expansion
supported English SEO title, description and hero-title updates on all 16 service
pages. Localized PT/ES/CS/RO/DE title, description and hero-title updates now cover
the same 16 services through the owner-approved completion follow-up.

The English updates were saved through the authenticated production service editors for
all 16 Ireland GENERAL pages. The same 16 services were then saved in Portuguese,
Spanish, Czech, Romanian and German. Public cache-busted checks matched the intended
title, meta description and H1 on 96 updated combinations (16 services × six locales).
Prices, duration, doctor assignments, body copy, FAQs, CTA/booking behavior, slugs,
visibility and publication state were not changed.

OpenSEO URL Inspection on 2026-08-25 confirmed all 16 English Ireland GENERAL
service URLs are submitted and indexed, with Google-selected canonicals matching
their declared service URLs. No indexing exception requires an immediate content or
technical change.

The repository manifest at
`backend/src/content/ireland-general-service-keywords.ts` plus
`backend/src/content/ireland-general-service-keywords-localized-completion.ts`
records all 16 intent owners, the 16 English payloads and 80 localized payloads. The
guarded replay script is dry-run by default, requires the exact version confirmation,
validates active/public/GENERAL state, preserves operational fields and uses optimistic
`updatedAt` guards inside a Serializable transaction. The direct database dry run was
not used for production because the local production credential was stale; the
authenticated admin saves are the authoritative applied path. Ten focused tests and
targeted lint pass; the current backend-wide type-check is failing in unrelated invoice
files outside this SEO batch.

OpenSEO exposes English only for Ireland location 2372. Native-market checks for
Portugal, Spain, Czechia, Romania and Germany were therefore used only as phrasing
proxies; their volumes are not Irish demand and must not be reported as such. Google
ignores the meta-keywords field, and the admin editor does not expose it, so the live
claim is limited to the verified title, description and H1 fields.

**Measurement gate:** compare page/query GSC windows after 28 complete days plus the
normal final-data lag, on or after 2026-09-28. Track impressions, clicks, CTR and query ownership per changed URL;
do not rewrite the ten unchanged pages or add medication/guarantee terms without new
page-level evidence and clinical review.

---

## 32. IE-PROFILE-SPECIALIST-KEYWORDS-001 — doctor profiles and seven specialist services (2026-08-26)

**Status: LIVE IN PRODUCTION — 168 LOCALIZED SEO RECORDS APPLIED.** The Ireland
follow-up phase now covers 21 publishable clinician profiles and seven specialist
consultation services in English, Portuguese, Spanish, Czech, Romanian and German.
The production patch updated SEO title, meta description and keywords on 126
doctor-market translation rows (21 profiles × six locales), plus SEO title, meta
description and H1 on 42 service translation rows (seven services × six locales).
Service prices, durations, assignments, booking behavior, publication state, body
copy, FAQs and clinician biographies or credentials were not changed.

The seven specialist intent owners are cardiology, neurology, nutrition,
paediatrics, physiotherapy, psychiatry and psychology. Fresh Ireland evidence kept
psychiatry and psychology distinct from the GP mental-health page and avoided
promises about diagnosis, treatment, referral, appointment speed or outcomes.
Clinician titles use the production roster's verified role; no stronger specialist,
consultant, registration or credential claim was inferred from keyword demand.

`dr-arooj-iqbal-lodhi` is deliberately excluded. The production Ireland record has
no substantive biography, so it remains a thin/noindex exception until reviewed
source material exists. No copy was invented to make that profile indexable.

**Production verification.** A post-apply dry run reported no changes for all 21
profiles and all seven services. After the public 60-second data-cache refresh, all
21 English clinician URLs rendered the intended name-first title, self-canonical and
`index, follow`; all seven English specialist URLs rendered the intended title,
description and H1 with the same indexability controls. One clinician and one
specialist URL were also checked in each of the six locale routes to confirm the
localized delivery path. Google Search Console URL Inspection reports all seven
English specialist URLs and three priority clinician URLs submitted and indexed,
with successful fetches and Google-selected canonicals matching the declared URLs.

The guarded replay script is dry-run by default, requires the exact content-version
confirmation to write, validates the active Ireland market and active/public
SPECIALIST service invariants, and uses optimistic `updatedAt` checks. Production
writes run in bounded per-record Serializable transactions so a hosted command
timeout cannot silently roll back the complete batch. Eighteen backend content and
patch tests, the focused frontend SEO-template tests and the frontend package
type-check pass; independent code and security reviews reported no actionable
findings. The backend-wide type-check remains blocked by the unrelated pre-existing
invoice/Prisma client errors already recorded in §31, outside this SEO batch.

**Measurement gate:** compare complete GSC page/query windows after 28 days plus the
normal final-data lag, on or after 2026-09-28. Indexing requests accelerate
discovery only; they do not guarantee recrawl timing, position or ranking gains.

---

## 33. IE-PROFILE-SPECIALIST-FAQ-001 — intent-led profile and specialist FAQs (2026-08-26)

**Status: LIVE IN PRODUCTION — 72 FAQ RECORDS CREATED.** This follow-up fills the
only verified, publishable Ireland profile that had no FAQ content and adds one
transactional-intent FAQ to each of the seven specialist consultation services.
Roney Carli now has five authored questions in each supported locale (30
`DoctorFaq` rows). Cardiology, neurology, nutrition, paediatrics, physiotherapy,
psychiatry and psychology each gained one base English `ServiceFaq` plus five
localized translations (42 service FAQ records). Existing profile and service
FAQs were preserved.

The service questions use the page's established consultation phrase once, in a
natural booking or preparation question. Answers explain what to prepare and when
remote care is not appropriate. They do not add fixed prices, availability
promises, blanket referral claims, guaranteed outcomes or stronger professional
credentials. Roney Carli's questions are based on his existing biography,
qualifications and language fields. Because `DoctorFaq` is global to a clinician
rather than market-scoped, that copy is deliberately country-neutral.

**Search evidence.** Final Search Console query/page data for the preceding three
months showed early specialist-page impressions for `heart specialist`,
`cardiology consultation`, `book a neurologist appointment` and `consultant
psychiatrist ireland`. Focused Ireland keyword metrics retained the existing page
owners: `nutritionist ireland` 260 monthly searches / KD 14, `neurologist ireland`
110 / KD 0 and `cardiologist ireland` 30 / KD 16. WebDoctor's live nutrition page
also confirms that direct questions about online access, preparation, scope and
cost are a standard competitor content pattern. The batch does not copy competitor
claims or wording.

**Controls and verification.** The dedicated patcher defaults to dry-run, requires
the exact reviewed confirmation token, checks the audited pre-write FAQ counts,
detects duplicate questions across English and all translated FAQ rows, and
revalidates active Ireland doctor/service state. The 72 creates run in one bounded
Serializable transaction, so a failed batch rolls back in full. Eleven focused
content and patch tests pass, touched-file ESLint passes, and independent voice and
security reviews were applied before the production write. The backend-wide
type-check remains blocked only by the unrelated pre-existing invoice/Prisma client
errors recorded in §§31–32.

A post-apply production read matched all 30 doctor FAQ rows and all seven service
FAQ records, including every localized question and answer, to the reviewed
manifests. Cache-busted public HTML returned HTTP 200 and the new visible question
on Roney Carli's English profile plus specialist examples across Portuguese,
Spanish, Czech, Romanian, German and English routes. Existing frontend rendering
continues to emit the same visible FAQ rows in `FAQPage` JSON-LD.

FAQ content can strengthen topical relevance and match long-tail questions, but it
does not guarantee a ranking increase or a Google FAQ rich result. Measure query,
page, impressions, clicks and CTR after a complete 28-day window plus final-data
lag, on or after 2026-09-28, before expanding or rewriting this cluster again.

---

## 34. IE-ILLNESS-BENEFIT-ACCURACY-001 — ranking-drop diagnosis and claim-route correction (2026-08-30)

**Status: LIVE IN PRODUCTION — SIX LOCALES CORRECTED AND DATABASE-VERIFIED.** The
28-day finalized GSC comparison does not show a sitewide collapse: clicks increased
from 592 to 772 and impressions from 18,879 to 51,927, while average position moved
from 16.93 to 18.34 as the site appeared for a much broader query set. The sharper
incident is page-level. The five-page recovery cohort moved from position 17.53 to
29.68 week over week, led by the Ireland Illness Benefit article. Its Ireland desktop
visibility fell from 117 impressions at position 18.67 to 57 at 30.26; mobile position
was approximately stable (8.59 to 8.89). URL Inspection reports the page submitted,
indexed and self-canonical, and exact query/page checks found no competing Global
Health owner for its primary terms.

The live article contained a material YMYL accuracy defect: it stated that the doctor
always sends the Certificate of Incapacity for Work and that the claimant never posts
it. Current MyWelfare guidance says the doctor can complete it electronically, but if
that does not happen the claimant must post the paper certificate to Social Welfare
Services, PO Box 1650, D01 WY03. The inaccurate statement appeared in the intro,
certificate section, claim steps and FAQ across EN/PT/ES/CS/RO/DE.

The production correction was deliberately surgical because the published article
and translations had later admin edits. The guarded updater changed only the exact
incorrect sentences, preserved all other body content, publication status and review
dates, used a transaction fingerprint to reject concurrent changes, and verified all
six saved hashes after write. The repository source now matches the official process;
the reusable updater is pinned to the inspected production record and combines a
Serializable transaction with `updatedAt` conditional writes. Nine focused tests,
including exact-output and idempotence behavior, pass and the backend package
type-check is clean. After the
documented blog cache window, a cache-busted public request returned HTTP 200,
contained `D01 WY03` and no longer contained the incorrect “not something you post
yourself” statement. A follow-up reviewer-found sentence-boundary defect in the
production-only surgical replacement was also corrected across all six locales;
the final cache-busted public check returned HTTP 200 with correct punctuation,
the official postcode present and the malformed comma form absent.

**Interpretation and next gate.** Keyword insertion was not the limiting factor. The
live SERP is dominated by MyWelfare, Citizens Information, gov.ie and NSSO, with newer
commercial medical pages also competing. Accuracy and authority are therefore the
current constraints. Do not add more variants or rewrite the title/H1 during the
measurement window. Track the fixed cohort weekly through the existing
`monitor-seo-recovery-cohort` heartbeat and evaluate complete finalized 28-day windows
on or after 2026-09-28. The correction removes a verified trust defect; it does not
guarantee an immediate ranking increase.

---

## 35. PT-MARKET-RESEARCH-001 — Portugal corpus, recrawl refresh and localization fix (2026-08-31)

**Status: RESEARCH PACKAGE COMPLETE — SHARED UI FIX VERIFIED; PRODUCTION CONTENT
REMEDIATION NOT APPLIED.** The Portugal workstream is preserved under
`seo/portugal/`. OpenSEO/DataForSEO used location 2620 and language `pt`;
8,106 raw keyword rows were retained, normalized to 5,483 unique terms and
service/relevance-gated to 1,647 master rows. The final gate removed 143
non-medical, unsupported or non-Portugal administrative terms that collided
with `receita`/`consulta` seeds. All approved clusters map to
existing URLs. No new page, location page, redirect, noindex, title rewrite or
recurring paid rank tracker was created.

Later operational state is recorded in §27.17. It supersedes this dated
predeployment status without rewriting the 2026-08-31 evidence.

Fresh URL Inspection resolves most of the §19 doctor watchlist. Telmo Coelho's
current canonical is submitted/indexed with a 2026-08-24 crawl; Vitor Pais is
submitted/indexed with a 2026-08-30 crawl. Pedro Santos still shows Google's
stored pre-fix `noindex` state from 2026-08-06 on both URL shapes. Live state is
newer, so Pedro remains **WAIT FOR GOOGLE**; do not add another code fix until a
fresh crawl reproduces the problem.

The driving-certificate service is submitted/indexed with a 2026-08-29 crawl,
but current query evidence remains weak (for example, 30 impressions at average
position 40.0 for the principal GSC query). The §19 atestado/authority-wall
decision therefore stands: retain the current page and metadata, pursue
legitimate authority/entity evidence, and do not reopen title/H1 edits without a
new testable hypothesis.

The live Portugal homepage exposed a separate high-confidence localization
defect: shared DoctorCard overlay text and the credentials heading were hardcoded
in English. `DoctorCardI18n` now carries the existing localized
`viewProfileAria` value plus a six-locale `credentialsLabel`; a focused
static-render regression test failed before and passes after the change. The
page still receives an English hero CTA, some clinician roles, image metadata
and registration-division values from production content. Those are reviewed
CMS/data corrections, not another component fallback. No production database
write was made because `backend/.env` points to production.

Measurement baseline: the final 2026-05-31→08-28 device-complete GSC window
contains 350 clicks and 8,862 impressions; the prior 90 days contain 281 clicks
and 2,848 impressions. Query-visible rows are privacy-thresholded. GA4 connection
health passed but the inspected reporting window returned no usable rows, so
organic conversion conclusions remain blocked pending privacy-safe event
validation. Re-evaluate deployed changes only after a complete 28-day window
plus normal GSC final-data lag.

Follow-up evidence on 2026-08-31 kept the operational holds intact. A
route-contained crawl fetched all 75 canonical `/portugal/pt` sitemap URLs with
HTTP 200 responses and no missing title, canonical, hreflang or single-H1
checks. The driving-certificate URL was recrawled by Google on 2026-08-31 and
remains indexed; Pedro's current and legacy profile URLs still show the stored
2026-08-06 `noindex` state. No redirect, canonical, robots, sitemap, title or
H1 change is authorized from this evidence.

Repository-only follow-up: the guarded Portugal HOME updater now covers the
exact English CTA `Book a consultation` -> `Marcar consulta`. It defaults to a
dry-run, binds confirmation to the database host, validates the published PT
record, uses an optimistic Serializable update and verifies the saved value. The production
write was not run. Reconciled package counts are 14 P0, 60 P1, 853 P2, 720 P3,
1,598 pt-PT and 49 en-PT rows. The market hub retains brand/Portugal ownership;
generic online-consultation intent remains assigned to `/services/consulta-medica`.

Page-by-page editorial review is complete for the approved Portugal ownership set:
24 mapped public pages plus four canonical doctor profiles. The requested 16-column
completion matrix is `seo/portugal/content-completion-matrix.csv`. Every URL has one
unique primary keyword; the 24 page briefs and matrix are synchronized, with the
driving-certificate retain-current sentinel as the documented exception. Relevant
low-volume variants remain secondary/supporting terms rather than new pages.

The Portugal content owner approved repository implementation for all 28 eligible
pages on 2026-09-01; the reviewer name was not supplied. This is editorial approval,
not clinical, credential or official-source approval. The existing briefs and matrix
remain the implementation payload. No duplicate manifest or publisher was added.

All 28 rows remain blocked and record factual verification `no`. No SEO recommendation
is present in runtime page copy: the pt-PT blood-pressure title was restored to its
pre-optimization value, and service descriptions, H1s, bodies, FAQs, internal links,
doctor biographies, credentials and profile metadata remain unchanged in operational
sources. Historical bulk service and doctor importers were not used because they
rewrite wider clinical/profile surfaces and are unsafe for narrow metadata publication.
The guarded homepage CTA updater was not run. Live checks for the same 28 URLs passed
HTTP status, canonical, `pt-PT` hreflang, indexability, structured data and booking-CTA
checks. No CMS write, production write, push or deployment was made.

---
