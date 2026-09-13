# Internal linking — implementation handover

Prepared 13 September 2026 for the next AI agent working in Global Health.

## Task and authorization

Implement the scoped internal-link improvements below using the existing content
and rendering architecture. Fix the verified navigation faults first. Preserve
already-correct links, medical meaning and market/language boundaries. Do not build
new pages or an automatic linking system.

This document was requested as a handover, not as an instruction to publish during
its preparation. The receiving agent should follow the owner's accompanying
implementation instruction and any authorization already supplied in its session.
Do not repeatedly request authorization already given. Local preparation, evidence
checks and reversible development can proceed before any unresolved publication
decision. Production database writes require the repository's dry-run and confirmation
process; this document does not supply clinical approval or override existing holds.

## Read first

1. Root `AGENTS.md` and `CLAUDE.md`.
2. `seo/README.md` and `docs/plans/seo-handover-codex.md`.
3. `docs/plans/seo-control-state.md`: §0, §58, and the latest applicable country
   entries. This remains the only operational ledger. Read later entries if present.
4. This folder's [analysis](README.md), [exact CSV](proposed-links.csv) and
   [JSON manifest](proposed-links.json). Row IDs below are the one-based manifest order.
5. Relevant country README and approval/implementation records before touching
   clinical content or using a production mutation runner.

The manifest describes editorial intent, not executable database row IDs or an
approved SQL payload. Resolve actual storage ownership before preparing writes.
Give the receiving agent access to this repository and this entire evidence folder.

## Baseline and evidence

- OpenSEO project: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
- GSC property: `sc-domain:myglobalhealth.online`. Saved final window:
  14 August–10 September 2026, 1,516 page rows, pagination complete.
- GA4 property: `547083375`, Europe/Dublin. Organic 10–12 September:
  128 landing-page sessions; 12 `begin_booking` and one `booking_confirmed` event;
  zero recorded purchase transactions. Collection was restored September 9, so this
  is not a reliable conversion ranking or historical growth baseline.
- Public checks: 60 requests / 59 distinct URLs. The audit inspected main-content
  anchors, not a complete sitewide incoming-link graph or appointment availability.
- Evidence files: `evidence.json`, `query-check.json`, `live-pages.json`,
  `live-targets.json`, `live-followup.json`, `live-legacy.json`,
  `live-repair-targets.json`. These are dated observations, not current guarantees.

Refresh the smallest relevant OpenSEO/GSC/GA4 slice before starting a batch. Recheck
live source and target pages immediately before edits. If the intended link is now
correct, record `already correct` and skip it. Do not overwrite the dated evidence;
save new observations under a new dated implementation-evidence directory.

## Exact worklist

All paths below use `https://www.myglobalhealth.online`. Keep the specified locale.
Full URLs, suggested anchors and placement are also in the sibling manifest.

| ID | Source path | Destination path | Exact action / suggested anchor |
| --- | --- | --- | --- |
| 1 | `/czechia/cs/blog/diabetes-ticha-nemoc` | `/czechia/cs/services/chronicka-onemocneni` | Replace the broken diabetes-consultation body CTA; anchor `Konzultace chronického onemocnění`. General chronic-care review, not a diabetologist appointment. |
| 2 | `/brazil/pt/blog/diabetes-doenca-silenciosa` | `/brazil/pt/services/doencas-cronicas-online` | Replace broken `/br/clinica-geral` body CTA; anchor `Acompanhamento de doenças crônicas`. Keep the correct bottom CTA. |
| 3 | `/portugal/pt/health/hipertensao` | `/portugal/pt/services/consulta-cardiologia` | Change the existing cardiology alias to the canonical destination; keep `Consulta de Cardiologia`. Separately remove the dead hypertension-service offer unless an equivalent staffed service is established. |
| 4 | `/portugal/pt/health/hipertensao` | `/portugal/pt/services/medicina-geral-e-familiar` | Replace the family-medicine alias with its canonical destination; anchor `Consulta de Medicina Geral e Familiar`. |
| 5 | `/spain/es/blog/baja-laboral-por-ansiedad-como-funciona` | `/spain/es/services/salud-mental-online` | Retarget only the `Consulta de salud mental` link, currently pointing to `justificante-medico-online`. Preserve accurately labelled document links. |
| 6 | `/romania/ro` | `/romania/ro/tools/calorie-calculator` | Add `Calculator de calorii` near weight-management information. Keep the service CTA. |
| 7 | `/spain/es/tools/blood-pressure-chart` | `/spain/es/blog/tension-arterial-normal-tabla-edad-sexo` | Add `Qué significan los valores de tensión arterial` beneath the results explanation. |
| 8 | `/spain/es/blog/como-bajar-la-tension-que-funciona-segun-la-evidencia` | `/spain/es/tools/blood-pressure-chart` | Add `Consultar la tabla de tensión arterial` in the measurement/interpretation section. |
| 9 | `/portugal/pt/health/hipertensao` | `/portugal/pt/tools/blood-pressure-chart` | Add `Tabela de tensão arterial` beside the discussion of readings. |
| 10 | `/portugal/pt/tools/blood-pressure-chart` | `/portugal/pt/health/hipertensao` | Add `Acompanhamento da hipertensão` as a reading resource, after fixing the guide's dead service offer. |
| 11 | `/brazil/pt` | `/brazil/pt/tools/calorie-calculator` | Add `Calculadora de calorias` near weight-management information. |
| 12 | `/czechia/cs` | `/czechia/cs/tools/blood-pressure-chart` | Add `Tabulka krevního tlaku` near chronic-care information. |
| 13 | `/ireland/en/blog/illness-benefit-ireland-how-to-claim` | `/ireland/en/blog/illness-benefit-payment-ireland-rate-tax-timing` | The link already exists in related articles. Add/place one contextual `Illness Benefit payment rates and timing` link where payments are discussed. No global related-articles change. |

Counts: seven additions, four repair rows, one retarget and one placement improvement
across 11 distinct source pages. Row 3 includes removal of a separate unsupported
offer, so 13 rows do not mean exactly 13 HTML/database operations.

## Order and dependencies

**Batch A — navigation repairs:** rows 1–4; row 5 when its service/review checks
pass. Group Portugal rows 3, 4 and 9 into one coherent page edit to avoid repeated
writes. Inspect the extra Czech root booking CTA mentioned in the report: change
it only if traced to the same intended care route; otherwise record it separately.

**Batch B — three priority clusters:** Romanian calories (6), Spanish pressure
(7–8), Portuguese hypertension (9–10). Do not promote the hypertension guide from
the tool until its dead service link is repaired. Row 9 may already be completed
with Batch A. Do not apply it twice.

**Batch C — lower-priority completion:** Brazil homepage (11), Czech homepage (12),
Irish contextual placement (13). These are part of the handover scope; complete
them unless a real dependency or the owner's execution scope says otherwise.

**Ireland lab hub — separate diagnostic, not a manifest replacement:**
`/ireland/en/blog/blood-tests-dublin-what-to-know` links to `/ireland/en/lab-tests`,
which returned 404/noindex twice. Trace current routing, feature flags, catalogue
availability and deployment history. Do not infer the business has stopped lab
testing or redirect a shopping journey to general care. If a current equivalent
catalogue exists, prove equivalence and prepare the exact link repair. If the
catalogue is intentionally unavailable, prepare removal of the obsolete offer. If
temporary, fix the responsible defect within authorized scope. An unresolved
business decision must name the missing fact and remain separate from link work;
continue unaffected rows.

## Find the responsible content owner

Verified source entry points below are navigation aids, not a mandate to edit each
file. Trace route → renderer → content loader → exact persisted field/configuration,
including translation fallbacks and cache invalidation. Do not patch rendered HTML
or add a frontend replacement dictionary over incorrect stored content.

| Page family | Starting points |
| --- | --- |
| Blog | `frontend/app/[country]/[lang]/blog/[slug]/page.tsx` delegates to `frontend/lib/content/blog-post-page.tsx`; trace its content loader, sanitization and CTA rendering. |
| Health guide | `frontend/app/[country]/[lang]/health/[slug]/page.tsx` uses `getCountryLandingPage` from `frontend/lib/content/get-country-collections`; inspect both stored body and structured links. |
| Homepage | `frontend/app/[country]/[lang]/page.tsx`, `frontend/lib/content/country-home-copy.ts`, and `getPageContent`; reuse existing market copy/section ownership. |
| Tool | `frontend/app/[country]/[lang]/tools/[slug]/page.tsx`, `frontend/lib/content/tool-page.tsx`, `frontend/lib/tools/registry.ts`, `market-copy.ts`, `service-suggestions.ts`; use existing resource/copy facilities where suitable. |
| Lab route | Inspect `frontend/next.config.ts`, `frontend/proxy.ts`, current test/catalogue routes, and actual feature/content state before picking a fix. |

The blog renderer filename and every imported loader must be verified in the current
checkout. These pointers are not a completed database ownership investigation.

For each row, record source record/locale/field or source-code location, current
anchor/href/context, exact proposed value, and the other pages affected by that
owner. Inspect all callers before changing a shared helper. A PT base field or
fallback can affect other locales: do not silently turn a one-locale task into a
six-locale rollout. Use an existing locale override or record the real scope and
resolve its approval requirements before writing.

Reuse the existing CMS/admin update and content transaction mechanisms where they
support the actual record type. Existing service/profile/FAQ batch machinery may
not cover blog/home/tool records; do not bypass guards or pretend it does. Do not
create a new framework, schema migration or dependency solely for these links.

## Invariants and publication constraints

- Keep pricing, clinician assignments, credentials, publication state, author and
  reviewer attribution, clinical statements and emergency advice unchanged except
  for the minimal approved contextual link wording.
- Preserve the difference between private consultation/documentation and statutory
  sick leave. No promised certificate, specialist appointment or diagnosis.
- Recheck Spain mental-health availability/holds for row 5. Existing Spain
  cardiology availability concerns are not solved by successful HTTP responses.
- Prior clinical approval for an exact country packet does not automatically cover
  new article/home/tool copy. Identify the applicable rule and exact content if
  another review is actually required; do not invent approval or blanket blockers.
- Scope links to the listed country/language; no cross-locale propagation, new
  routes, canonical/robots changes, redirect shortcuts, keyword footer or UTM tags.
- Render real `<a href>` links on the server, with readable native-language text,
  keyboard focus and the site's current styles. Keep medical tool calculations,
  inputs and urgent-care messaging intact.
- `backend/.env` targets production. Do not run mutation scripts to discover how
  they work. Keep snapshots/rollback data private and exclude secrets from Git.
- The clone is shared. Check status before staging, stage explicit paths only,
  never reset another session's edits, never merge/push main unprompted.

## Prepare, apply and verify

1. Record current Git revision/status and fresh live observations. Preserve dated
   research; it must not be overwritten with post-change results.
2. Resolve storage ownership and prepare a reviewable before/after diff per source
   page. For stored content, save exact old values and expected-state hashes; use
   narrow field/locale updates with a transaction or the existing equivalent.
3. Run the existing dry-run/rehearsal process. Refuse source drift or unexpected
   affected-row counts. Make repeated execution a no-op when the exact target is
   already applied. Prepare rollback before any production mutation.
4. Run checks appropriate to the actual change. Source-only text changes need
   focused validation, not a new testing framework. Shared renderer/locale logic
   needs a regression check for target rendering and non-target isolation.
5. With required authorization/review in place, apply the exact batch. Invalidate
   only relevant caches through the existing mechanism; code deployments and CMS
   content writes are different operations and need separate evidence.
6. Fetch every changed source and target. Verify 200 status, canonical destination,
   indexability and actual served anchor/href. Verify removed dead links are absent,
   retained CTAs remain correct and no duplicate visible links were introduced.
7. Check desktop and mobile rendering for affected layouts: homepage resources,
   tool explanation links, guide/article CTA text. Check keyboard use. Sample a
   non-target market/locale for each shared renderer or fallback changed.
8. After each implemented/deployed batch, update ledger §58 (or a clearly linked
   continuation) with exact rows, timestamp, commit/deployment or CMS receipt,
   verification and next measurement. A local diff is not live publication proof.

Commands available in this checkout, run only as relevant:

```powershell
git status --short
git diff --check
pnpm --filter frontend typecheck
pnpm --filter backend typecheck
```

Run frontend checks only when frontend code changed; backend checks when backend
code changed. Use existing targeted tests for changed helpers. Never run backend
tests against production; follow the repository test guard and `.env.test` setup.
The existing read-only `check-live.mjs` can collect a custom URL list with a new
output filename, but merely collecting responses is not an assertion suite. The
implementer must explicitly verify intended changes and preserve pre-change evidence.

Rollback restores only the changed fields or owned code. Refuse to overwrite later
concurrent changes: compare current values with this batch's applied values first.
Revalidate affected public pages after rollback.

## Completion and measurement

Deliver a row-status receipt for IDs 1–13: `implemented and live`, `implemented
locally`, `already correct`, or `blocked`, with proof/reason for each. Track the
Ireland lab diagnostic and Portugal dead-offer removal explicitly; neither may
disappear behind the 13-row count. Do not call the whole batch live with local-only
changes or unresolved rows. If blocked, finish independent work and state the exact
remaining dependency without repeatedly asking for existing authorization.

Return the changed file/content list, before/after link evidence, checks, rollback
location, deployment/write receipts and ledger update. Do not commit sensitive
snapshots or invent reviewers, approval dates, database IDs or booking availability.

At actual publication, register the exact cohort and fresh baseline. Review matched
GSC query/page cohorts and GA4 organic sessions, `begin_booking` and
`booking_confirmed` separately at 28 and 56 days. Account for consent gaps,
seasonality and concurrent content releases. Do not promise a ranking increase or
call internal linking an increase in backlink-based Domain Rating.

## Suggested instruction to the receiving agent

> Implement the internal-linking handover in
> `docs/audits/seo/internal-linking-2026-09-13/IMPLEMENTATION-HANDOVER.md`.
> Read repository instructions and the current canonical SEO ledger first. Recheck
> the exact 13 rows, repair existing faults before additions, reuse current content
> owners and preserve medical/locale boundaries. Complete all independent work,
> including the separate Irish lab-hub diagnosis. Follow existing authorization and
> production dry-run requirements; prepare exact diffs and rollback before any
> unresolved publication approval. Return per-row status and live proof where
> applied. Do not run a full-site crawl, add new pages, or merge/push main unprompted.
