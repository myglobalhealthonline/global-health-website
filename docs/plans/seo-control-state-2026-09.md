# SEO control state — operational ledger from 2026-09-15

Supersedes `docs/plans/seo-control-state.md` (frozen 2026-09-15, historical evidence only; its section numbers stay valid as references). This file is the single operational ledger from the 2026-09-15 master audit forward. Numbering restarts at §0; every later batch appends one dated section.

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

- **Size rule (added 2026-09-15).** This ledger links to evidence files; it never embeds them. One concise dated section per batch. If the file passes 1,500 lines, split evidence out into `docs/audits/seo/` or `seo/<country>/` before adding more.
- **Workbook rule (added 2026-09-15).** `seo/tracking/Global_Health_SEO_Tracker.xlsx` is an analytical view and proposed-action queue. It never competes with this ledger for status; a workbook row becomes status only when a dated section here records it.
- **Data-grain rule (added 2026-09-15).** GSC page-daily uses page×date grain (country/device grain is sparse-filtered by Google to ~35% of impressions and lives in a side CSV). GSC query rows carry only ~20% of clicks after Google's anonymization; never derive totals from query rows. GA4 valid windows are 2026-07-25..08-01 and 2026-09-09 onward; the outage 2026-08-02..09-08 is unmeasured, never zero.

---

## 1. Carried-forward open items (extracted from the frozen ledger, 2026-09-15)

Extracted mechanically from the old §5, §6, §7 (NOW / NEXT / MONITOR / MANUAL / DEFERRED), §27, §41–43, §46, §50, §55–59 by `seo/tracking/raw/2026-09-15/A-ledger/carried_forward.csv` (84 rows). Closed items were not carried. The old §7 **CLOSED** list (`docs/plans/seo-control-state.md` ~line 3734) and `docs/plans/seo-indexation-plan-2026-07-28.md` §5 "explicitly not doing" **stay binding**; reopen only with new evidence recorded here. Two ambiguities are noted in `carried_forward_notes.md` (the €89 lab-hub price is treated as closed per old §7 NOW; SEO-DOC-004 carries a disposition check).

| Item | Source | Status as recorded | Due | What remains open |
| --- | --- | --- | --- | --- |

| `SEO-EDITORIAL-001` | [§5](../../docs/plans/seo-control-state.md#L903) | ALL SIX PARENTS PUBLIC — REVIEW FLAGS STILL OPEN | — | 6 Week2 blog parents PUBLISHED but clinicalReview/nativeEditorReview still required on non-Czech checklists; reconcile genuine human review before restoring reviewer attribution (see §27.24 L41). |
| `SEO-SEMRUSH-003` | [§5 / §27.24](../../docs/plans/seo-control-state.md#L956) | LOCAL FIX UPDATED — DEPLOY PENDING | — | 5 non-English Ireland home titles/descriptions are source-complete but still need frontend deployment before live; re-run SEMrush after deploy+recrawl (§27.24 L52). |
| `old-§27.23-czechia-13-guarded-candidates` | [§27.23](../../docs/plans/seo-control-state.md#L70) | 13 guarded candidates pending; 3 holds | — | 13 Czech dermatology-adjacent hashes conditionally eligible pending specialist/native-English/governance review; 3 holds and clinical register 19/37 pending. |
| `old-§27.22-portugal-register-blocked` | [§27.22](../../docs/plans/seo-control-state.md#L146) | blocked_pending_review (28/28) | — | All 28 Portugal clinical-register rows blocked_pending_review; 16 doctor profiles pending official fact verification; no metadata/bio/FAQ published. |
| `old-§27.22-portugal-pricing-recrawl` | [§27.22 / §44](../../docs/plans/seo-control-state.md#L168) | recrawl pending (pricing route) | — | Portugal pricing route correction awaiting Google recrawl (07-19 stored crawl predates fix); the companion FAQ recrawl closed 2026-09-08 (§44 L8306), pricing not confirmed recrawled. |
| `old-§27.22-portugal-dr-tiago-identity` | [§27.22](../../docs/plans/seo-control-state.md#L154) | blocked — reviewer specialty/identity mismatch | — | Dr Tiago's Portugal doctor row has no active specialty relation, and official OM registration 77986 lists surname FALEIRO, missing from the production identity; clinical register stays closed. |
| `old-§27.21-czechia-drafts-pending` | [§27.21](../../docs/plans/seo-control-state.md#L188) | 14 drafts pending, 3 holds | — | 14 source-pinned Czech clinical drafts remain pending specialist/native-English/governance review; 3 measurement holds still binding. |
| `CZ-CLINICAL-REGISTER-STATE` | [§27.20 / §41.3](../../docs/plans/seo-control-state.md#L222) | 37 rows: 31 approved / 3 pending / 3 live_unreviewed_debt | — | Czech register: 2 eNeschopenka/sick-pay articles plus the sitewide forms/analytics privacy scope have no payload at all (§41.3 L7981); only neschopenka/treatment-renewal FAQs have exact replacements. |
| `old-§27.19-czechia-14-eligible-blocked` | [§27.19](../../docs/plans/seo-control-state.md#L265) | blocked by pending review | — | 14 eligible Czech recommendations stay source-pinned and blocked by pending specialist/native-English/governance review; 3 GP/24-7/travel holds and 2 reviewed-no-change articles remain binding. |
| `old-§27.18-eneschopenka-doctor-mismatch` | [§27.18](../../docs/plans/seo-control-state.md#L303) | needs source verification | — | Published eNeschopenka article's public API record shows a doctor-relation mismatch against the visible author/reviewer attribution; needs source verification before any CMS correction. |
| `CZ-SEO-001-GATE-REREAD` | [§27.16 / §52.2](../../docs/plans/seo-control-state.md#L351) | confounded; re-read after post-09-02 crawl confirmed | — | GP-consultation gate confounded by the 09-02 republish; §52.2 (2026-09-10) found Google had not crawled the republished page (last crawl 08-24) — re-read after a post-09-02 crawl. |
| `old-§27.16-blog-doctor-link-deploy-verify` | [§27.16](../../docs/plans/seo-control-state.md#L346) | deployment verification pending | — | Locale-aware doctor-profile link fix for non-English blog articles (blog-post-page.tsx) implemented locally; deployment verification remains pending. |
| `old-§27.15-booking-availability-prod-migration` | [§27.15](../../docs/plans/seo-control-state.md#L390) | local implementation only | — | Booking-availability visibility work is a local implementation record only; production migration, live checks, critical e2e proof and two-week GSC observation remain open. |
| `SEO-EDITORIAL-001-CALENDAR-0930` | [§27.2](../../docs/plans/seo-control-state.md#L455) | calendar gate | 2026-09-30 | Measure country FAQs and legacy consolidation; run the first meaningful 30-day editorial review; scale only pages with clear query ownership. |
| `SEO-EDITORIAL-001-CALENDAR-1113` | [§27.2](../../docs/plans/seo-control-state.md#L456) | calendar gate | 2026-11-13 | Recheck Brazil/Romania generic commercial SERP walls and the first editorial cohort's 60-90 day evidence. |
| `WATCH-/ireland/sick-leave` | [§6](../../docs/plans/seo-control-state.md#L1893) | WAIT FOR GOOGLE — unmoved | — | 308 target correct in production; Google's stored crawl (2026-07-05) still predates the 2026-07-30 fix. |
| `WATCH-/ireland/es/health/sick-cert-online` | [§6](../../docs/plans/seo-control-state.md#L1894) | WAIT FOR GOOGLE — unmoved | — | 308 target correct in production; Google's stored crawl (2026-07-25) still predates the 2026-08-09 fix. |
| `WATCH-/portugal/pt/health/atestado-medico-online` | [§6](../../docs/plans/seo-control-state.md#L1895) | WAIT FOR GOOGLE — unmoved | — | 308 target correct in production; Google's stored crawl (2026-07-25) still predates the 2026-08-10 fix. |
| `WATCH-/portugal/es/health/atestado-medico-online` | [§6](../../docs/plans/seo-control-state.md#L1896) | WAIT FOR GOOGLE — crawl advanced, still pre-fix | — | 308 target correct; crawl date advanced from 2026-06-04 to 2026-07-25 but still predates the 2026-08-10 fix. |
| `WATCH-/faq` | [§6](../../docs/plans/seo-control-state.md#L1897) | WAIT FOR GOOGLE | — | Retired hub URL still 'Submitted and indexed' with self-canonical /faq, crawl 2026-07-18 predates the 2026-08-15 retirement/redirect. |
| `WATCH-/czechia-doctors/mudr-libor-hlavaty` | [§6](../../docs/plans/seo-control-state.md#L1899) | WAIT FOR GOOGLE — stale, not wrong | — | Both URL shapes now 308 to /czechia/cs/doctors; Google's stored state (noindex, googleCanonical to the old per-doctor URL) last crawled 2026-07-30, before the 2026-08-14 fix. |
| `SEO-DOC-006` | [§6](../../docs/plans/seo-control-state.md#L1913) | PARTIAL PASS, zero FAIL — reviewBy extended | 2026-09-24 | 117 doctor-locale URLs backfilled to readyToIndex; 7 of 9 sampled cohort URLs still pre-fix crawl dates. Extension 1 of 3 permitted; a 3rd becomes a crawl-budget finding, not doctor-indexability. |
| `NEXT-1` | [§7 NEXT](../../docs/plans/seo-control-state.md#L3505) | evidence-backed candidate, size unproven | — | referral-and-investigations ranks pos 1-14 on informational private-referral queries but is a transactional page; per-query impressions 1-4, so cluster size is unproven — check first. |
| `NEXT-2` | [§7 NEXT](../../docs/plans/seo-control-state.md#L3517) | feasibility check before any work | — | Portugal driving-licence/atestado cluster: head queries sit at position 42-56 in a regulated in-person IMT process; check for a BUSINESS/SERP WALL before assuming a content fix exists. |
| `NEXT-3` | [§7 NEXT](../../docs/plans/seo-control-state.md#L3525) | revisit if impressions grow | — | Czechia coverage: best CTR of any market (4.76% at time of writing) on smallest base; no single cluster yet big enough for a batch. |
| `NEXT-4` | [§7 NEXT / §52.1](../../docs/plans/seo-control-state.md#L3529) | unblocked, not authorized | — | Product/Offer schema for the 17-page Ireland lab-test cluster; embargo lifted by §52.1 (ramp over, L8581) but the batch itself still needs an explicit decision. |
| `COUNTRY-WAVE-001-REORDER` | [§7 AFTER GLOBAL FOUNDATION / §52.3](../../docs/plans/seo-control-state.md#L3568) | wave pairing rationale invalidated | — | Ireland+Czechia wave order was set on Czechia's CTR advantage; §52.3 shows Czechia now mid-pack (1.55% CTR), below Portugal and Ireland — wave order needs re-deriving before the wave starts. |
| `SEO-GROWTH-016` | [§7 MONITOR / §52.1](../../docs/plans/seo-control-state.md#L3613) | ramp expired, reclassify | — | Ireland lab cluster indexing-ramp explanation expired (§52.1): impressions peaked then fell 37% and flattened; hub-detail hand-off reversed. -F and schema items unblocked, still need a decision. |
| `MONITOR-desktop-mobile-divergence` | [§7 MONITOR](../../docs/plans/seo-control-state.md#L3610) | new observation, watch | — | Desktop draws more impressions than mobile at 1.68% CTR / position 20.7; watch whether it persists once the tool long tail stabilises. |
| `MONITOR-randox-competitor` | [§7 MONITOR](../../docs/plans/seo-control-state.md#L3620) | watch only | — | ~57 Ireland impressions/window are Randox supplier-brand searches MGH ranks pos 6-13 with zero clicks; watch only for whether Randox's own IE presence displaces MGH on non-brand terms too. |
| `MONITOR-spain-wrong-locale-consulta-medica` | [§7 MONITOR](../../docs/plans/seo-control-state.md#L3625) | growing, not yet the bottleneck | — | consulta-medica-online (wrong-locale page) grew from 194/0 to 518 impressions/7 clicks at pos 23.2; not yet the bottleneck but becomes a real WRONG LOCALE item if it keeps growing. |
| `MANUAL-oauth-consent` | [§7 MANUAL](../../docs/plans/seo-control-state.md#L3634) | needs owner action | — | Google OAuth consent screen still in Testing (7-day refresh-token cap); stated expiry ~2026-08-10 passed, so local claude-seo scripts may be dead. Publish it to stop weekly re-auth. |
| `SEO-DOC-002` | [§5 / §7 MANUAL](../../docs/plans/seo-control-state.md#L3635) | MANUAL ACTION REQUIRED | — | Write real bios for 5 doctors behind 26 noindex URLs; correctly gated clinical/editorial content pending business decision. |
| `MANUAL-wix-outreach` | [§7 MANUAL](../../docs/plans/seo-control-state.md#L3636) | needs owner/marketing action | — | wix.to alone holds 195 backlinks to old URLs; ask high-value external referrers to point at current URLs. Do not buy or build links for a medical site. |
| `MANUAL-homepage-destination` | [§7 MANUAL](../../docs/plans/seo-control-state.md#L3637) | product decision pending | — | Whether a country-selection interstitial is the right landing experience for brand search on /, a pure product call; the SEO half is already closed on evidence. |
| `MANUAL-lab-pricing-randox` | [§7 MANUAL](../../docs/plans/seo-control-state.md#L3638) | commercial decision pending | — | MGH sells the same Randox kits more expensively than Randox direct on gut-microbiome/haemochromatosis; whether to reprice, bundle clinician interpretation, or accept position is a commercial call. |
| `MANUAL-doctify-badge-scope` | [§7 MANUAL](../../docs/plans/seo-control-state.md#L3640) | product decision pending | — | Whether CountryTrustBar's Ireland-only Doctify badge should show on every market; the one remaining pre-existing ===ie gate after SEO-GROWTH-015 made the widget global elsewhere. |
| `SEO-METADATA-005` | [§5 / §7 DEFERRED](../../docs/plans/seo-control-state.md#L3672) | DEFERRED | — | CMS-specific title inconsistency; not reproducible in a 4-page spot check, no measurable ranking cost. Re-check only if a title defect surfaces in GSC or a crawl. |
| `OPEN-WORK-REGISTER-001-D4` | [§41.1 / §43.3-43.4 / §55.2](../../docs/plans/seo-control-state.md#L7908) | Open, widened in scope | — | Spain/Romania/Brazil have no clinical-approval gate; gap is the mutation boundary (admin routes bypass PT/CZ script-time gates); Romania now has a scoped gate but §43.4 is not closed globally. |
| `PT-SNIPPET-TRIM-DOCTOR-META` | [§41.2](../../docs/plans/seo-control-state.md#L7943) | blocked on clinical approval | — | 11 Portugal doctor meta-description trims drafted 2026-09-03, hashes computed; blocked on clinical approval of the new hashes; live pages still carry the untrimmed 191-220 char versions. |
| `PT-SNIPPET-TRIM-TOOL-FIELDS` | [§41.2](../../docs/plans/seo-control-state.md#L7946) | blocked twice: no approval + no publication route | — | 11 Portugal tool-page title/description fields drafted; the writer rejects targetKind==tool, so unblocking needs code, not just a reviewer, in addition to approval. |
| `PT-BEATRIZ-CARVALHO-IDENTITY` | [§41.2 / §41.4](../../docs/plans/seo-control-state.md#L7950) | identity conflict blocks two rows | — | Beatriz Carvalho's register row is Portugal's sole blocked_pending_review of 45; her fact-register row the sole pending_official_verification of 16 — OPP returns Beatriz Sousa for OPP 31618, not her. |
| `IE-CONTENT-BRIEFS-12` | [§41.3 / §52.1](../../docs/plans/seo-control-state.md#L7984) | no finished text exists | — | 12 Ireland content briefs (online-gp-ireland, referral-and-investigations, home-blood-tests-ireland + 9 more) are specs, not copy; lab-hub freeze lifted per §52.1 but no text written yet. |
| `SEO-MEASURE-001` | [§42.1 / §47 / §49](../../docs/plans/seo-control-state.md#L8023) | PARTIAL — begin_checkout confirmed missing | — | GA4 collection restored 2026-09-09 (correct tag, Realtime verified) but §49 confirms begin_checkout is NOT a registered key event and GSC shows no linked properties; fix before any 90-day read. |
| `ES-DERMATOLOGIA-GATE` | [§42.3 / §56.9](../../docs/plans/seo-control-state.md#L8112) | RE-ARMED, still unarmed | — | dermatologia-especialista-online SERP-wall re-measure re-armed to 28 days after crawl advances past 2026-08-12; §56.9 (2026-09-14) still shows last crawl 2026-07-19 — gate has not started. |
| `PT-META-TRIM-GATE` | [§42.4](../../docs/plans/seo-control-state.md#L8121) | 30-day read due | 2026-10-08 | Portugal 11 doctor meta-description trims (191-220 to 124-146 chars), deployed 2026-09-03; 30-day CTR-at-held-position read due 2026-10-08. |
| `PT-TOOL-REWRITE-GATE` | [§42.4](../../docs/plans/seo-control-state.md#L8122) | 30-day read due | 2026-10-09 | Portugal 6 tool-page title/description rewrites, deployed 2026-09-04; 30-day CTR read on the tool cluster due 2026-10-09. |
| `GLOBAL-LEGAL-BOOK-GATE` | [§42.4](../../docs/plans/seo-control-state.md#L8123) | 30-day read due | 2026-10-09 | Localised country names on /legal and /book across non-EN locales, deployed 2026-09-04; low-volume light CTR gate due 2026-10-09. |
| `SEO-META-002` | [§42.5](../../docs/plans/seo-control-state.md#L8127) | P1, blocked by missing gate | — | Meta descriptions over ~160 chars on ES/RO/BR commercial pages (Spain 37/37, Romania 20/20, Brazil 19/19) vs mature markets' single digits; blocked by missing gate. Spain partly trimmed by Phase 7. |
| `SEO-SPAIN-002` | [§42.5 / §53](../../docs/plans/seo-control-state.md#L8757) | recovery observed, unproven | 2026-09-18 | Spain sick-leave-anxiety blog impressions resumed (123 impr/0 clicks, Aug29-Sep8) after a 4-day zero run; recovery/value unproven; next daily read due 2026-09-18; keep the commercial-fit hold. |
| `SEO-BRAZIL-002` | [§42.5](../../docs/plans/seo-control-state.md#L8129) | P2, consolidation decision pending | — | solicitação de exames cluster (pos 4-8, 4 URLs) needs a consolidation decision plus links; /brazil/pt title reads pt-PT 'Registados', should be 'Registrados' (§59.5 may have fixed this). |
| `ES-CLINICAL-GATE-BATCH-ORDER` | [§43](../../docs/plans/seo-control-state.md#L8183) | investigation only, defect 4 open | — | ES-CLINICAL-GATE-000 investigation confirmed enforcement must sit at the mutation boundary (admin routes bypass PT/CZ gates too); no gate was built. See OPEN-WORK-REGISTER-001-D4 for current state. |
| `OWNER-PRIORITY-SPAIN-ROMANIA-BRAZIL` | [§50](../../docs/plans/seo-control-state.md#L8424) | directive, partially executed | — | Owner directed Spain/Romania/Brazil as the next country SEO programs (2026-09-09); substantial work has since landed for all three (§§54-59) but none is declared research/measurement-complete. |
| `PERF-REMEDIATION-PRODUCTION-PROMOTION` | [§46](../../docs/plans/seo-control-state.md#L8339) | open acceptance gates | — | Performance remediation deployed/verified on Development only; production promotion, real cold-cache/percentile measurements, DB connection ceiling and field CWV remain open. |
| `ROMANIA-BRINDUS-CREDENTIAL-CONFLICT` | [§55 / §55.5 / §55.7](../../docs/plans/seo-control-state.md#L8830) | authoritative evidence needed | — | Dr Robert Gabriel Brindus's specialty disagreement and unsupported biography claims need authoritative evidence; held separately from the now-staffed pain service and published editorial copy. |
| `ROMANIA-BRANCH-MERGE-PENDING` | [§55.3 / §55.5](../../docs/plans/seo-control-state.md#L9021) | main merge not performed | — | Romania's tested backend enforcement and content shipped via an isolated Railway upload from commit 39656572, not a main merge; integrate before the next main deploy or it could be overwritten. |
| `ROMANIA-MEASUREMENT-GATES` | [§55.3 / §55.5](../../docs/plans/seo-control-state.md#L9012) | 30/60/90-day gates due | 2026-10-12 | Romania rollout (114 URLs, 2026-09-12) and editorial batch (2026-09-13): 30/60/90-day measurement gates due 2026-10-12, 2026-11-11 and 2026-12-11. |
| `ES-SERVICE-KIND-FLEBOLOGIA-VASCULAR` | [§56.12](../../docs/plans/seo-control-state.md#L9351) | open owner admin action | — | Set Service.kind from SPECIALIST to general for consulta-flebologia-y-linfologia and consulta-diagnotico-vascular — specialist claim removed from copy but stored kind still drives the eyebrow label. |
| `ES-LUZ-ZULUAGA-CGCOM-RECHECK` | [§56.12](../../docs/plans/seo-control-state.md#L9403) | owner keeps live; CGCOM mismatch stands | 2026-09-18 | Owner instructed keeping Luz Marina Zuluaga Ríos live as practising; CGCOM still listed her as ALTA sin ejercicio at the 14 September recheck. Recheck again 2026-09-18. |
| `ES-EDITORIAL-73-DERMATOLOGY-ONLINE-VS-INPERSON` | [§56.13](../../docs/plans/seo-control-state.md#L9863) | needs fresh GSC + clinical approval | — | Dermatology and online-vs-in-person copy updates (editorial plan §7.3) still open, needing fresh GSC/OpenSEO data and clinical approval before any write. |
| `ES-PREP-LIMITATIONS-CONTENT` | [§56.13](../../docs/plans/seo-control-state.md#L9863) | day 60/90 content, not yet written | — | Preparation/limitations content for the day-60/90 measurement gates still open, needing fresh GSC/OpenSEO data and clinical approval before any write. |
| `ES-SPAIN-MEASUREMENT-GATES` | [§56.11-56.15](../../docs/plans/seo-control-state.md#L9784) | 30/60/90-day gates due | 2026-10-14 | Spain phases 1-7 (sick-leave wording, vascular/dermatology copy, description trims) share cohort dates 2026-10-14 / 2026-11-13 / 2026-12-13. |
| `ES-DERMATOLOGY-REQUEST-INDEXING` | [§56.9](../../docs/plans/seo-control-state.md#L9725) | owner UI action pending | — | Owner action (Search Console UI only, not Indexing API): request indexing for /spain/es/services/dermatologia-especialista-online and /spain/es/services/consulta-piel-online; not confirmed done. |
| `BR-ARTICLE-ATTRIBUTION-BLOCKED` | [§59.16](../../docs/plans/seo-control-state.md#L10467) | classifier-blocked | — | Brazil article attribution (showing Dr. Renato Sarmento, not Dr. Tiago) is blocked by the automated permission classifier; left open by owner decision. |
| `BR-DR-RENATO-INDEXING-DECISION` | [§59.13 / §59.16](../../docs/plans/seo-control-state.md#L10394) | answer given, meaning unconfirmed | — | Owner answered no to whether /brazil/*/dr-renato should be indexed (B6, §59.13 L10394), but the meaning of that answer still needs confirming; left open in the final §59.16 status. |
| `BR-GA4-FUNNEL-CHECK` | [§59.9 / §59.16](../../docs/plans/seo-control-state.md#L10318) | code verified; live GA4 read NOT done | — | begin_booking/booking_confirmed tracking is verified for Brazil (allowlist includes br/brazil) but no one with GA4 access confirmed market=brazil events in property 547083375 before the 90-day reads. |
| `BR-ARTICLE-FACT-CHECKS` | [§59.16](../../docs/plans/seo-control-state.md#L10467) | open, left by owner decision | — | Brazil article fact-checks remain open; left by owner decision alongside the other blocked-list items. |
| `BR-MEDICAL-REVIEW-POLICY-PAGE` | [§59.16](../../docs/plans/seo-control-state.md#L10467) | open, left by owner decision | — | Brazil medical-review policy page remains open; left by owner decision. |
| `BR-SIGNING-PROVIDER-ATESTA` | [§57.3 / §59.13 / §59.16](../../docs/plans/seo-control-state.md#L10467) | open, provider not answered | — | ICP-Brasil/Atesta signing workflow confirmation and signing-provider choice remain open; owner has not answered the signing-provider question (§59.13 L10394). |
| `BR-DR-TIAGO-IDENTITY` | [§57.4 / §59.13](../../docs/plans/seo-control-state.md#L8926) | name-only, not matched to a stored doctor id | — | Dr Tiago is retained by supplied name only in Brazil's clinical-approval record, no identity match invented; Brazil articles now show Renato instead, sidestepping the identity gap. |
| `BR-MEASUREMENT-GATES` | [§57.6 / §59 (multiple)](../../docs/plans/seo-control-state.md#L9982) | 30/60/90-day gates due | 2026-10-15 | Brazil phase-4 through phase-7 content batches share 30/60/90-day cohort dates 2026-10-15 / 2026-11-14 / 2026-12-14. |
| `BR-RETAINED-HELD-VERIFICATION-PAGES` | [§57.6](../../docs/plans/seo-control-state.md#L9992) | 48 retained, 36 held, 12 verification pages | — | 48 retained page candidates, 36 held legal/article pages and 12 pages requiring further verification remain outside the applied Brazil phase-4 batch; browser check of the remaining pages not yet done. |
| `INTERNAL-LINKING-MEASUREMENT-GATES` | [§58.1](../../docs/plans/seo-control-state.md#L10088) | 28/56-day gates due | 2026-10-11 | Internal-linking batch (2026-09-13 proposal, implemented 2026-09-13/14): rows 1-5,8,9,13 measure 2026-10-11 and 2026-11-08; rows 6,7,10,11,12 measure 2026-10-12 and 2026-11-09. |
| `IE-LAB-HUB-AVAILABILITY-DECISION` | [§58.1](../../docs/plans/seo-control-state.md#L10073) | missing fact, decision pending | — | /ireland/en/lab-tests 404s because the country health-tests feature toggle is off, not a routing defect; missing fact is whether ops intends Irish lab ordering to be available. |
| `SEO-011` | [§5](../../docs/plans/seo-control-state.md#L915) | DEPLOYED — MANUAL CONSENTED-WIDGET CHECK PENDING | — | Doctify widget locale-mapping fix is shipped; the consent-gated third-party UI was never truthfully verified by the raw-HTML check. Load a pt/es/cs/ro page, grant consent, confirm labels populate. |
| `SEO-014` | [§5](../../docs/plans/seo-control-state.md#L918) | DEPLOYED — FOLLOW-UP SCAN PENDING | — | Screen-reader text for whole-card overlays/icon links is shipped, but the raw-HTML scan can't distinguish true failures; re-run a rendered-DOM textless-link scan and close only if it returns zero. |
| `SEO-SEMRUSH-001` | [§5](../../docs/plans/seo-control-state.md#L932) | DEPLOYED — SEMRUSH RECRAWL PENDING | — | 133-item invalid-structured-data fix is live in production; the authenticated SEMrush project has not yet reprocessed the affected URLs. Rerun SEMrush validation after its next crawl. |
| `SEO-SICKCERT-001` | [§5](../../docs/plans/seo-control-state.md#L955) | CODE VERIFIED — RECRAWL REQUEST NEEDS A HUMAN | — | Sick-cert page 308 canonicalisation is verified in production; the only remaining step is requesting indexing for the URL in the GSC console (last crawled 2026-07-17), which is not automatable. |
| `SEO-LINKS-001` | [§5](../../docs/plans/seo-control-state.md#L967) | MANUAL ACTION REQUIRED | — | Outreach to medical directories and national clinician registries across the six markets to improve the 62-referring-domain, low-quality-tail backlink profile; not a code change (Hassaan/marketing). |
| `SEO-CTR-001` | [§5](../../docs/plans/seo-control-state.md#L949) | PARTIALLY IMPLEMENTED | — | Two of 27 striking-distance pages (Czech/Spanish blood-pressure-chart tools) were retitled for a genuine query/title mismatch; re-pull page-level CTR after deploy+recrawl; do not touch calorie titles. |
| `SEO-DOC-004-DISPOSITION` | [§5](../../docs/plans/seo-control-state.md#L1016) | CLOSED, but next-action column says work owed | — | Marked CLOSED (Czech legacy doctor URLs routed to roster) yet its own Next-action says a production re-probe and the §14.8 disposition check are still owed — internally inconsistent status. |
| `SEO-GLOBAL-LANG-003` | [§5](../../docs/plans/seo-control-state.md#L1000) | DEPLOYED — AWAITING MEASUREMENT | — | Country-scoped FAQ copy (11 of 33 indexable) deployed; outcome measurement against the awaiting-measurement gate not yet recorded in this ledger. |
| `SEO-FOUNDATION-001-A` | [§5 / §52.1](../../docs/plans/seo-control-state.md#L1024) | unblocked, not authorized | — | Ireland lab-test locale gate (latent risk) was frozen behind the 09-08 re-measure; §52.1 found the ramp ended, so the freeze's premise is gone — unblocked but still needs a decision. |
| `SEO-FOUNDATION-001-F` | [§5 / §52.1](../../docs/plans/seo-control-state.md#L1027) | unblocked, not authorized | — | Ireland lab detail pages carry zero sibling/service internal links; blocked only to avoid acting mid-ramp. §52.1 (L8581) found the ramp over; unblocked but not authorized, needs an explicit decision. |


## 2. Master audit — 2026-09-15 (audit recorded, no implementation)

**Scope:** full repository, website and international SEO audit at commit `f055a9b78a567502051c7c81b9f9313da32cdc4d`; deployed revision `451b23e72f7076f53a06364e06f86da74113d568` (build marker = commit `451b23e7`, the docs-only successor, so production code equals the audited code). Raw probe snapshots `A2-probe/html-flagged/` (199 MB) and `A2-probe/_cache/` (25 MB) stay local and git-ignored; everything else is committed. Nothing published, deployed, changed in Google, submitted for indexing or written to the database.

**Outputs (links, never embedded):**
- Executive report: [`docs/audits/seo/seo-master-audit-2026-09-15.md`](../audits/seo/seo-master-audit-2026-09-15.md) — coverage statement in its §12, decision queue in §13.
- Workbook: `seo/tracking/Global_Health_SEO_Tracker.xlsx` (31 sheets: 30 table sheets + dashboard, 64,645 data rows; starter `seo/Global_Health_SEO_Tracker_Starter.xlsx` untouched). Build log `seo/tracking/raw/2026-09-15/A10-workbook/build-log.md`; QA `seo/tracking/raw/2026-09-15/A11-qa/`.
- Normalized data and manifests: `seo/tracking/data/` (inventory 3,752 rows; crawl history 4,672; hreflang edges 24,315; GSC property daily 2,928; GSC page daily 19,488 page×date; GSC query daily sample 5,817; query×page W1/W0; GA4 landing daily 204; migration 1,142; keywords 820; competitors 299; backlinks 410 + 258 prospects; country coupling 70; modules 42; scripts 152; URL inspection 628).
- Raw pulls per agent: `seo/tracking/raw/2026-09-15/<agent>/` (A0 access, A1 inventory, A2 probe + OpenSEO audit, A3 GSC, A4 GA4, A5 locale QA, A6 content, A7 market, A8 migration, A9 programmatic, A12 coupling, A-ledger carry-forward).
- Refresh scripts and session prompts: `seo/tracking/scripts/` (`README.md`, `gsc_normalize.py`, `ga4_normalize.py`, `workbook_upsert.py`, `recalc_excel.ps1`, `check_formula_errors.py`, `prompts/{daily-refresh,weekly-review,monthly-close}.md`). No job, workflow or notification was activated.

**Headline results (verified, dated 2026-09-15):**
- P0 `TECH-001`/`CPL-012`: Ireland lab-tests cluster (hub + 84 sitemapped detail URLs + 40 legacy redirects) returns 404 because the admin `health-tests` flag is off for Ireland while the sitemap ignores the flag; noted open in the frozen ledger §58 on 2026-09-13 — owner decision required (re-enable vs retire).
- Organic: latest complete 28 days (2026-08-15..09-11) 1,008 clicks / 69,925 impressions vs 761 / 39,935 in the previous 28 (07-18..08-14). Growth is tools + blog long tail and homes; services flat; doctors 5.3k impressions.
- Measurement: GA4 collects again from 2026-09-09 (260 organic sessions / 27 key events to 09-14); `begin_checkout` unregistered; `purchase` never fired; dev hosts, Stripe and Tag Assistant referrals and developer traffic pollute the property; GSC↔GA4 link unknown via API.
- International: 33/33 combinations pass data isolation and hreflang; tools family carries a deliberate 33-way cross-market cluster (confirm); 4 same-language cross-market blog copies folded by Google.
- Coupling: 70 one-country coupling points, 12 template fixes, target model = CMS for content / code for behaviour fields, 21-27 developer-days; next market 2-3 days after.
- Migration: 1,142 legacy URLs tested — 691 pass, 219 wrong target, 91 missing, 89 dead-end, 43 retired OK, 9 chains.
- Indexation: 628 inspected — 490 indexed, 91 discovered-not-indexed, 14 SEO-DOC-006 doctors still noindex on pre-fix crawls.
- Credits: 751 OpenSEO credits spent (balance 9,945); URL Inspection ≈630 of 2,000.

**Corrections to prior records made by this audit:** the SEO start in git is 2026-07-26/28 (not "early August"); the cutover is evidenced 2026-07-17..21; `next.config.ts` resolves to 571 redirect rules (276 was the literal-block count); `backend/scripts/applied/` holds 9 scripts (not 18); the A5 QA agent's two "FAIL" rows (`/prescriptions`, cross-market doctor slugs) were redirect-following artefacts and are PASS.

**QA (A11, Opus):** 38 findings — 0 blocking, 26 fix (14 applied to the workbook by `seo/tracking/scripts/qa_fixes.py`, 12 open: issue statuses off-enum/blank incl. two P0 rows, `clinical_review_status` blank on the 12 clinical-gated content rows, a third P0 `CPL-006` to confirm), 12 notes; 0 formula errors after Excel recalculation; 30 random live spot-checks, 0 mismatches. Report: `seo/tracking/raw/2026-09-15/A11-qa/qa-report.md`.

## 3. Roadmap — 30 / 60 / 90 days (proposed 2026-09-15, reconciled with the frozen ledger's market priorities: Spain, Romania, Brazil next; Ireland lab cluster embargo; no blanket rewrites)

Every row: evidence in the workbook issue id → smallest safe change → approval → acceptance test → rollback → measurement window. Nothing here is started until the owner records a decision in a dated section of this file.

### 30 days (to 2026-10-15)

**Measurement repairs**
- `MEAS-001` register `begin_checkout` as a GA4 key event (owner, GA4 Admin; no code). Accept: event listed in measurement_health with a create date. Rollback: delete the key event. Measure: first clean 28-day window from registration.
- `MEAS-002` exclude dev/staging hosts (`localhost`, `myglobalhealth.up.railway.app`) and define an internal-traffic filter for developer traffic (Pakistan sessions/users ratio 33/3) — GA4 Admin data filters, owner approval; Accept: hosts absent from `page_performance` for 7 days. Rollback: set filter to testing.
- `MEAS-003` referral exclusions for `checkout.stripe.com` and `tagassistant.google.com` (GA4 Admin, unwanted referrals). Accept: source/medium no longer shows them.
- `DATA-002` confirm or create the GSC↔GA4 product link (owner; cannot be checked from this runtime).
- `MEAS-004` schedule `frontend/tests/unit/seo-live-urls.test.ts` against production daily (developer; proposal only — no workflow activated by this audit). Accept: a failing run within 24 h of a flag flip.

**Critical technical / data**
- `TECH-001` / `CPL-012` (P0) Ireland lab-tests: owner decides re-enable vs retire; developer applies the page's `health-tests` gate to `frontend/app/sitemap.ts:194-197` (same predicate for both consumers). Accept: sitemap and page agree for every market; `seo-live-urls` passes. Rollback: revert the one-line gate.
- `CPL-004` / `CPL-010` (TF-04, TF-10) before the next market: replace the ro/es/br literal overlay branch in `frontend/lib/i18n/load-locale.ts` with a keyed lookup over all countries, and derive the six-locale list once from `countries.ts`. Accept: `country-locale-matrix.test.ts` extended with a synthetic seventh market passes; production HTML byte-identical for the six markets (probe diff). Rollback: revert.
- `CPL-001` / `CPL-002` (TF-01, TF-02) fix the Ireland home bundle key casing and the Brazil-only localized country name (Czech doctor titles). Accept: `Named doctors.` renders on `/ireland/en`; `/czechia/cs/doctors/*` title reads "Česko". Clinical gate: no.
- `MIG-001..003` redirect rules for `/team*` (28 URLs, 296 clicks), `/services-1/2` families, bare `/product-page/beauty-focus-multibeauty` → 410; locale-preserving rules for the 191 Wix `/{cs|es|pt|ro}/…` URLs whose localized target is sitemapped. Accept: `migration.csv` re-probe shows pass; no new chains. Rollback: remove rules.
- `IDX-001` SEO-DOC-006: 14 doctor URLs still noindex on pre-fix crawls — third extension exhausted. Action: internal-link the 14 from their market `/doctors` index and one relevant service page (already linked? verify with `internal_links.csv`), then inspect on 2026-09-24 (existing global pass). Do NOT use the Indexing API.

**Content**
- `COPY-001` Ireland languages copy (tile label / FAQ) — proposal in workbook sheet 28; no clinical gate; owner approves wording.
- Priority copy proposals from 16/28 (two per market): each carries its clinical-gate flag; the 2026-09-03 single-clinician approval standard applies; native review where flagged.
- `CONT-001` same-language cross-market blog copies (4 folded): decide canonical owner per topic; do not add cross-market hreflang.

**Authority**
- `AUTH-001` reclaim: ask the 14-link source of the dead `/product-page/*` links and the seven `/post/*` referrers to update targets (after the lab-tests decision); retarget wix.to booking links only where a service-specific page exists. No paid links, no automation.

**Programmatic** — none in the first 30 days; see 60 days.

### 60 days (to 2026-11-15)
- `INTL-002` wrong-locale cannibalisation: per cluster in `cannibalisation.csv`, strengthen the correct market/locale page (internal links, title intent) rather than noindexing the ranking one; measure query ownership shift at 30/60 days. Romania and Brazil first (owner priority §50 of the frozen ledger).
- `CPL-003/005/009` (TF-03, TF-05, TF-09) move static-page SEO, tool copy and one-market copy onto the shared loader / CMS rows per the target model; migrate Ireland/Czechia/Portugal content first, then fill the other markets from the packages (clinical gate applies to FAQs).
- `META-002` duplicate titles/descriptions within a language (412/769): template-level locale-aware titles for doctors, legal and tools.
- `A11Y-001` alt text: template default from entity name + reviewed alt for hero/cover media.
- pSEO pilot (if `17_pSEO_Plan` recommends one): ≤12 URLs, gates and rollback as recorded there; measure 30/60/90.
- Spain / Romania / Brazil market batches per the frozen ledger §§54-59 continue under this roadmap; Spain sick-leave daily series check due 2026-09-25 (carried).

### 90 days (to 2026-12-15)
- `CPL-006/007/008/011` payments, identity/tax literals, GA4 market map, and the scripts/modules cleanup queue (list only until then).
- First full editorial 90-day read (frozen §27.4 gates) with `begin_booking`/`booking_confirmed`/`purchase` on a clean window.
- Recheck Brazil/Romania commercial SERP walls (frozen §27.2, ~2026-11-13).
- Next-market readiness review against the new-country checklist.

## 4. Indexation and recrawl watchlist (2026-09-15)

Cadence unchanged: one `inspect_urls` pass every 2-3 weeks; next global pass **2026-09-24**. Escalate only when the crawl date has advanced past the fix date and the verdict is still wrong. Read `indexStatusResult.coverageState`; there is no top-level coverage verdict.

| Cohort | Google's stored state (2026-09-15) | Next check | Rule |
| --- | --- | --- | --- |
| 14 SEO-DOC-006 doctor URLs (CZ 3, PT 6, ES 1, RO 3, BR 1) | Excluded by noindex; last crawl 2026-07-16..08-06 (pre-fix) | 2026-09-24 | crawl-budget finding now (third extension used); internal-link then wait; no Indexing API |
| Ireland lab-tests hub + 84 detail URLs | Indexed (hub crawl 2026-09-07) but serving 404 since ≤2026-09-13 | after the owner decision | if re-enabled: inspect hub + 5 details 14 days later; if retired: expect drop-out, confirm 410 |
| 91 "Discovered – not indexed" (PT 26, ES 21, CZ 16, IE 15, RO 10, BR 3) | discovered, never crawled | 2026-10-13 | mostly non-default-locale service/blog pages; do not mass-submit |
| 4 same-language cross-market blog copies | Google chose the Ireland/PT-slug canonical | with CONT-001 decision | not a defect; decide owner page |
| 10 "Crawled – not indexed" (recent blog/tool/legal pages) | evaluated 2026-09-10..14 | 2026-10-13 | normal new-page lag; `/spain/es/legal/refund-policy` crawl 2026-07-20 — re-inspect |
| Remainder queue: 1,637 sitemap URLs never inspected this run | unknown | daily refresh prompt, 300/day | `seo/tracking/raw/2026-09-15/A3-gsc/inspect/remainder-queue.txt` |
| Carried §6 items (frozen ledger): `/ireland/sick-leave`, `/ireland/es/health/sick-cert-online`, `/portugal/{pt,es}/health/atestado-medico-online`, `/faq`, `/czechia-doctors/mudr-libor-hlavaty` | see §1 rows | 2026-09-24 | unchanged rule |

## 5. Document map

| Document | Role |
| --- | --- |
| `docs/plans/seo-control-state-2026-09.md` (this file) | operational ledger from 2026-09-15: rules, carried items, batches, roadmap, watchlist |
| `docs/plans/seo-control-state.md` | frozen 2026-09-15; historical evidence; section numbers valid as references (CLOSED list ~line 3734 binding) |
| `docs/plans/seo-indexation-plan-2026-07-28.md` | §2 design decisions and §5 "explicitly not doing" still binding |
| `docs/plans/seo-handover-codex.md` | process and tooling notes (tool paths pre-date the Windows reinstall) |
| `docs/plans/editorial-plan-2026-08-19.md` §7 | content-growth execution rules |
| `docs/audits/seo/seo-master-audit-2026-09-15.md` | executive report of this audit |
| `docs/audits/seo/six-market-seo-audit-2026-09-04.md` / `.html` | previous full audit (historical) |
| `seo/README.md` | workspace router; country package contract; recovery table |
| `seo/tracking/Global_Health_SEO_Tracker.xlsx` | analytical view and proposed-action queue (never status) |
| `seo/tracking/data/`, `seo/tracking/raw/<date>/`, `seo/tracking/scripts/` | normalized data + manifests, raw pulls, refresh tooling |
| `seo/<country>/` | dated market evidence packages |

## 6. Owner decision on Ireland lab tests and sitemap gate fix — 2026-09-15

**Owner (Hassaan, 2026-09-15):** Irish lab tests "will be live again in a week" — the `health-tests` feature is re-enabled by operations, not retired. No 410s, no redirect repointing, no removal of internal links.

**Implemented (code, not yet deployed by this session):** commit `d2618e73` — `frontend/app/sitemap.ts` lab-test detail loop now applies the same `isCountryFeatureEnabled(country, "health-tests")` gate as the hub loop and the page (`TECH-001` / `CPL-012`, TF-12). Unit test added (`frontend/tests/unit/seo/sitemap.test.ts`: catalogue rows present, flag off → no detail URLs). `vitest` 33/33, `tsc --noEmit` exit 0. Effect: while the flag is off the sitemap stops advertising the 84 dead URLs; once operations re-enables the flag they return automatically with their `lastmod`.

**Watchlist (updates §4):** after the flag is back on, inspect `/ireland/en/lab-tests` plus five detail URLs 14 days later; expect "Submitted and indexed" with a post-re-enable crawl date. The 40 legacy `/product-page/*` and `/home-health-tests*/*` redirects stay as they are (they resolve once the pages return). Re-run `SEO_CHECK_BASE=https://www.myglobalhealth.online` `seo-live-urls.test.ts` the day the flag is on: expect 9/9.

**Not done:** deploy (owner pipeline); the flag flip itself (operations); MIG-*, MEAS-*, INTL-002 and the coupling programme remain proposals in §3.

## 7. OpenSEO metadata batch (META-001 / META-002) — 2026-09-15

**Scope (owner-authorised 2026-09-15):** the 323 rows in `seo/tracking/raw/2026-09-15/A2-probe/openseo-audit/audit-issues-export-2026-09-15.json`. Template-level only: length fitting at natural boundaries, brand-suffix trimming, and market/language disambiguation where locale variants collided. No per-page rewrites, no clinical body copy, no noindex removed. This is the authorised exception to the frozen ledger's §27.5 "no blanket title/description rewrites" rule. It does not reopen that rule for other batches.

**Implemented (code, not yet deployed by this session):** commit `1325c673` on `Dev-hassaan`.

- `frontend/lib/seo/page-seo.ts`: `buildPublicMetadata` fits every public search `<title>` to 60 chars. It drops the trailing brand, then trailing ` | ` / ` · ` / ` — ` segments, then cuts at a leading question or a whole word. Every meta description is fitted to 160 chars at the last full sentence, then clause, then word. There is no literal "…", so the 2026-08-09 rule still holds. In-budget copy is untouched. Social (OG/Twitter) budgets are unchanged.
- `frontend/lib/tools/markets.ts` (`marketToolDescription`) plus the tool page: the description names the market from the locale's `countryNames` when the copy does not. This fixes the 20 same-language duplicates across markets.
- `frontend/lib/seo/doctor-market-title.ts` (`withLanguageTitle`, `doctorSiblingLocaleTitles`) plus the doctor profile page: when a title is identical in two locales of one market, it gets the native language name ("· Español", "· Português"). The market and language suffixes reserve room in the budget, so the fitter cannot drop them.

**Tests:** `tsc --noEmit` exit 0. The vitest files below pass, 9 files and 432 tests: `tests/unit/seo/sitemap.test.ts`, `lib/seo/page-seo.test.ts`, the new `lib/tools/tool-metadata-budget.test.ts` (every market × locale × tool, 266 cases: title ≤ 60, description 70–160, no duplicate title or description), `lib/seo/doctor-market-title.test.ts`, `lib/content/country-home-title-budget.test.ts`, `lib/tools/markets.test.ts`, `lib/tools/registry.test.ts`, `lib/seo/blog-pagination-robots.test.ts` and `lib/seo/doctor-hreflang.test.ts`.

**Pre-deploy served-HTML check (local `next dev` against the production API, lxml):**

| URL | title | description |
| --- | --- | --- |
| /ireland/es/doctors/dr-emmanuel-dabup | 60 "… Psiquiatra consultor \| Irlanda · Español" | 142 |
| /ireland/pt/doctors/dr-emmanuel-dabup | 52 "… Psiquiatra consultor · Português" | 145 |
| /ireland/pt/tools/bmi-calculator | 45 | 89, starts "Irlanda:" |
| /portugal/pt/tools/bmi-calculator | 49 | 90, starts "Portugal:" |
| /ireland/de/services/mental-health-consultation | 52 (was 76) | 143 |

A full local crawl was not feasible. The dev server took 5 minutes per doctor page against the shared 300/min API bucket.

**Counts by issue type (expected on deploy; confirm with the re-probe):**

| issueType | rows | fixed by template | no change by design |
| --- | --- | --- | --- |
| title-too-long | 117 | 117 | 0 |
| meta-description-too-long | 150 | 150 | 0 |
| duplicate-meta-description | 20 | 20 | 0 |
| duplicate-title | 8 | 8 | 0 |
| meta-description-too-short | 4 | 4 (follow-up, below) | 0 |
| noindex-page | 23 | 0 | 23 |
| thin-content | 1 | 1 (follow-up, below) | 0 |
| **total** | **323** | **300** | **23** |

**No change by design (recorded, not fixed):**

- `noindex-page` `/cart`, `/login`, `/register`, `/forgot-password`: transactional and auth pages pass `noindex: true` to `buildPublicMetadata` (`noindex, nofollow`). They must stay out of the index. OpenSEO lists every noindexed URL it crawls, so these 4 rows can never clear without a wrong change.
- `noindex-page` `/ireland/{es,pt,cs,ro,de}/faq`: fallback-locale FAQ content (`marketFaq.exact` false) is demoted with `noindexFollow`.
- `noindex-page` `/ireland/{es,pt,cs,ro,de}/legal/medical-disclaimer`: the locale is not in `exactLocalesForLegalType`, so the page serves fallback-language legal text and is demoted with `noindexFollow`.
- `noindex-page` doctor profiles `/ireland/{en,pt,es,cs,ro,de}/doctors/dr-arooj-iqbal-lodhi` and `/czechia/cs/doctors/{dr-gabriele-felici,dr-michael-nytra,mudr-nataliya-kharlamova}`: the production API returns `readyToIndex: true` and a registration number for all four, but an empty `bio`. `validatePublicDoctorRecord` requires a bio of at least 120 characters, so `isPublicDoctorRecordIndexable` is false and the page serves `noindex, follow`. The same predicate drives the sitemap. The fix is editorial, by adding the bios in admin, not a metadata change.

**Owner actions that would clear the remaining 19 noindex rows (no code change can do it correctly):**

- Ireland FAQ in es/pt/cs/ro/de (5 rows): AI-drafted translations of the 18-question Irish market FAQ are in `seo/ireland/faq-translation-drafts-2026-09-15/` (2026-09-15, owner request). Each has 6 groups and 18 items and passes `check_drafts.py` with 0 problems: es 2,220 words and 26 review notes, pt 2,229 and 20, cs 1,863 and 21, ro 2,237 and 20, de 2,083 and 21. **Approved and wired (2026-09-15):** the owner (Hassaan) confirmed all five drafts were approved by clinician admin Dr Tiago. They are now the `ie` key in `frontend/locales/{es,pt,cs,ro,de}/faq-markets.json`, so `/ireland/{es,pt,cs,ro,de}/faq` become exact-locale, `index, follow`, in hreflang and in the sitemap on deploy. A separate native-language editorial review was not recorded; the reviewer notes in each draft file remain open for that pass.
- Ireland medical disclaimer in es/pt/cs/ro/de (5 rows): add `CountryDisclaimerTranslation` rows in admin. The text lives in the production database, and `backend/scripts/seed-country-disclaimers.ts` notes legal and clinical sign-off is still required.
- Doctor profiles (9 rows): add a bio of at least 120 characters, plus specialties and a real title, for Dr Arooj Iqbal Lodhi, Dr Gabriele Felici, Dr Michael Nytra and MUDr Nataliya Kharlamova. The profiles turn indexable on their own once the bios exist.

**Follow-up in the same batch (the commit directly after `fde04226`):**

- `meta-description-too-short`: new 104–128 char descriptions for login, register and forgot-password in `locales/<lang>/auth.json`, and a new `flow.cartMetaDescription` key for `/cart`, in all six locales. The pages stay noindex.
- `thin-content` `/`: a visible "About Global Health" section under the country picker, in all six locales, reusing only claims already on the site (markets, registration bodies, site languages, GDPR/LGPD, emergency caveat). Local served page: 338 words, up from 92.
- Test: `frontend/lib/seo/short-page-meta-budget.test.ts` (descriptions 70–160 chars in every locale; about copy at least 120 words).

**Verification (owner-triggered, after deploy):** run `python seo/tracking/scripts/verify_metadata_fix.py`. It re-probes the 323 rows at ≤ 4 req/s and writes `seo/tracking/data/metadata_fix_verification.csv` (url, issueType, before_length, after_length, resolved). Rerun the OpenSEO site audit (project `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`) only when the owner asks, and estimate credits first.

**Verified on production (2026-09-15, after deploy of `cfbfa4db`):** `python seo/tracking/scripts/verify_metadata_fix.py` re-probed all 323 rows with lxml on the served HTML. Output: `seo/tracking/data/metadata_fix_verification.csv`.

| issueType | rows | resolved | not resolved | by design |
| --- | --- | --- | --- | --- |
| title-too-long | 117 | 117 | 0 | 0 |
| meta-description-too-long | 150 | 150 | 0 | 0 |
| duplicate-meta-description | 20 | 20 | 0 | 0 |
| duplicate-title | 8 | 6 | 2 | 0 |
| meta-description-too-short | 4 | 4 | 0 | 0 |
| thin-content | 1 | 1 | 0 | 0 |
| noindex-page | 23 | 5 | 0 | 18 |
| **total** | **323** | **303** | **2** | **18** |

- The 2 unresolved `duplicate-title` rows are `/ireland/{es,pt}/doctors/dr-raafat-ibrahim`. They now return 404 because the production API no longer has this doctor in the Ireland roster ("Doctor not found" in every locale), and the live sitemap dropped all 6 of his URLs. The duplicate is gone by removal, not by the title fix. If the removal was not intended, restore the doctor in admin.
- The 5 resolved `noindex-page` rows are `/ireland/{es,pt,cs,ro,de}/faq`. Each now serves `index, follow`, its own `html lang`, a 7-entry hreflang cluster, and appears in the live sitemap. Before the deploy, only `/ireland/en/faq` was in the sitemap.
- Whole-site replay of the pre-deploy crawl of all 2,265 sitemap URLs through the new budget: titles over 60 chars went from 277 to 0 and descriptions over 160 from 469 to 0, across all six markets. Two leftovers sit in admin copy, not templates: the hand-foot-and-mouth blog description has a literal "…" typed in (Ireland and Portugal), and `/brazil/en/pricing` has a 68-char description.
- Workbook `19_Issues`: META-001 is "Resolved - verified on production 2026-09-15"; META-002 is "Partially resolved", because the wider 412/769 same-language duplicate set stays open. Recalculated; `check_formula_errors.py` exit 0.
- Still open by design (18): 4 transactional pages that must stay noindex; 5 Irish medical disclaimer locales that need translations in admin (database); 9 URLs for 4 doctors without bios.

**Next measurement:** 2026-10-13 (28 days after the 2026-09-15 deploy).  deploy date + 28 days. Compare GSC CTR for the 267 length-flagged URLs against the 28 days before deploy.

**Workbook:** in `19_Issues`, META-001 is now "Implemented - awaiting deploy". META-002 is "Partially implemented - awaiting deploy", because only the 28 audit duplicate pairs are covered and the wider 412/769 same-language duplicate set stays open. The workbook was recalculated with `recalc_excel.ps1`, and `check_formula_errors.py` exit 0.

**Not done:** deploy and push (owner), the post-deploy re-probe, and the OpenSEO re-audit.

### 7.1 Market FAQ translations drafted for 5 more countries — 2026-09-15

**Owner request (2026-09-15):** extend the FAQ work beyond Ireland to Portugal, Spain, Czechia, Romania and Brazil, using OpenSEO keywords per country and locale. A live probe of all 33 `/{country}/{lang}/faq` pages showed 17 still `noindex, follow` because they serve fallback-language copy: Portugal, Spain, Czechia and Romania in the four non-native languages each, and Brazil in Spanish. Brazil's cs/ro/de URLs redirect (308) because the locale is unsupported.

**Keyword evidence:** `seo/tracking/raw/2026-09-15/faq-locale-keywords/` holds 22 `get_keyword_metrics` calls and cost 353 credits (9,914 down to 9,561). DataForSEO only serves a country's own language for that country, so each language was measured where it is spoken. Real demand exists only for German (health insurance, health system, hospital and prescription in every market, up to 480 a month for Spain) and Portuguese about Spain (50–170, from Brazil). Spanish demand is small, and Czech and Romanian show none. Editorial plan §7.2 still applies: keywords are term choices, not insertions.

**Drafts:** `seo/{portugal,spain,czechia,romania,brazil}/faq-translation-drafts-2026-09-15/<lang>.json`. There are 17 files, each translating the NATIVE market FAQ, because the English versions contain claims the native copy removed. Each has 6 groups and 18 items, 11–19 reviewer notes and a `_keywordsUsed` list. `python seo/tracking/scripts/check_faq_translation_drafts.py --all` reports 0 problems on all 17. The three Portuguese drafts use European Portuguese to match the site, although the measurable demand is Brazilian.

**Not wired, not live.** Dr Tiago's approval covered only the Irish drafts. These 17 need clinical approval before they are copied into `frontend/locales/<lang>/faq-markets.json`.

**Flagged in the LIVE native FAQs (for clinical and legal review, independent of the drafts):**

- Spain `es` 0.1: prescriptions and reports "con la misma validez legal que una consulta presencial". This is the kind of claim the Portugal safety test bans.
- Spain `es` 1.1, Czechia `cz` 1.1, Romania `ro` 0.0 and 1.1: hedged same-day appointment wording ("en muchos casos", "bývají k dispozici", "de obicei").
- Spain `es` 0.1: Colegio Oficial de Médicos membership described "by specialty and province". The councils are provincial.

The drafts reproduce each of these at the source's strength and flag it.
