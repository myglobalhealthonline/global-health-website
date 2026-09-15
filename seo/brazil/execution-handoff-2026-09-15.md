# Brazil SEO — execution handoff (15 September 2026)

Scope: **Brazil only** (`/brazil/*`). Do not change other markets. Where a shared
file is touched, gate the change on the Brazil country code (`code === "br"`) or a
`br:*` override key.

Canonical status: `docs/plans/seo-control-state.md` §57, §57.6, §59, §59.1. Update
the ledger after every deployed batch (CLAUDE.md rule).

## 0. Where things stand

| Area | Status |
|---|---|
| Phase 3 — 18 service summaries | LIVE 14 Sep |
| Phase 4 — 57 page drafts / 19 groups (service + doctor titles, descriptions, H1, hero, 21 FAQ edits) | LIVE 15 Sep, publicly verified |
| Phase 5 — `solicitacao-exames-online` summary (no "valid at labs throughout Brazil") | LIVE 15 Sep |
| Homepage SEO title/description pt/en/es, availability panel pt-BR, CRM stats caption | LIVE (code) |
| Booking page PT title + link, calorie and due-date calculator PT metadata | LIVE (code) |
| Sitemap (145 URLs), canonical, hreflang, robots, JSON-LD parse | OK — no action |
| Everything below | OPEN |

Audit matrix (153 URLs): 57 change = done · 48 retain = no action · 12 verify
further = partly done (§3 below) · 36 hold = blocked (§4 below).

## 1. How to run a batch (proven this session)

Agents in this repo are blocked by the permission classifier from production DB
reads/writes, writing the clinical approval register, and running rollouts. The
owner runs the marked commands; an agent does the rest.

### 1a. Code batch (frontend copy)

1. Edit files (agent). Brazil-gated only.
2. Checks (agent):
   ```bash
   cd frontend && node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit
   ```
   ```bash
   cd frontend && node scripts/check-locale-keys.mjs
   ```
   ```bash
   cd frontend && npx vitest run lib/content lib/tools tests/unit/internal-link-resources.test.tsx
   ```
3. Local render: Browser pane `preview_start` name `frontend-prod-api` (port 3100,
   production API). Confirm Brazil pages changed and one Portugal page unchanged.
4. Commit only the batch files (never the uncommitted Ireland files
   `frontend/lib/content/country-home-copy.ts` hunk `BUNDLE_NORMALIZED` and
   `country-home-copy.test.ts` unless that task is finished), then
   `git push origin Dev-hassaan Dev-hassaan:main`. Railway deploys Frontend.
5. Wait for deploy SUCCESS:
   ```bash
   railway deployment list --service Frontend --json
   ```
6. Verify live with `curl` on each changed URL (title, description, canonical, the
   changed strings) and one non-Brazil control URL. Record in the ledger.

### 1b. Clinical database batch (service / doctor copy) — phase N

Tooling: `backend/scripts/prepare-spain-seo.mjs --brazil --phase=N`,
`backend/scripts/apply-spain-seo.mjs`, `seo/spain/verify-public.mjs`,
`seo/spain/run-rollout.ps1`.

1. Snapshot (OWNER):
   ```bash
   node --env-file=backend/.env backend/scripts/brazil-seo-storage.mjs seo/brazil/raw/storage-phaseN-YYYY-MM-DD.json
   ```
2. Plan (agent): `seo/brazil/content-briefs/phaseN-plan.json` with `snapshot` and
   either `patches` (summary/name, ≤160 chars, every locale) or `replacements`
   (exact text, must match once). See `phase3-plan.json` / Spain `phase4-plan.json`.
3. Build manifest (agent):
   ```bash
   node backend/scripts/prepare-spain-seo.mjs --brazil --phase=N
   ```
   Must print `"blockers":[]`.
4. Clinical approval: exact text shown to the owner; owner confirms Dr. Renato
   Sarmento's approval. Agent writes an approval script modelled on
   `approve-phase5` (writes `seo/brazil/clinical-approval-phaseN.json` and appends
   states to `APPROVED_BRAZIL_STATES` in
   `backend/src/content/romania-clinical-review.ts`). OWNER runs it once.
5. Checks (agent): backend `tsc --noEmit` (`--max-old-space-size=8192`) and
   ```bash
   node --test backend/scripts/brazil-seo.test.mjs backend/scripts/spain-seo.test.mjs backend/scripts/romania-clinical-review.test.mjs backend/scripts/prepare-romania-seo.test.mjs
   ```
6. Commit + push to `main` (agent). Wait for Backend deploy SUCCESS; check
   `https://api.myglobalhealth.online/ready`; write
   `seo/brazil/enforcement-deployment-phaseN.json` with the deployment id.
7. Rollout (OWNER):
   ```bash
   powershell -NoProfile -ExecutionPolicy Bypass -File .\seo\spain\run-rollout.ps1 -Phase N -Brazil
   ```
   Last line must be `All X phase N groups applied and publicly verified`.
8. Ledger entry + cohort dates (+30/60/90 days) (agent).

Rollback: reverse groups in reverse order from `raw/rollout/phaseN/*-before.json`;
verify current rows equal the approved state first.

## 2. OPEN-READY — no new owner fact needed

Run in this order. Each is Brazil-gated.

### R1. Doctors directory same-day promise (highest priority)

Live on `/brazil/{pt,en,es}/doctors`: "Agende no mesmo dia." / "Book same-day." /
"Agende el mismo día."; body "Disponibilidade no mesmo dia", "Escolha um clínico.
Marque no mesmo dia."; description also names "Cuidados Paliativos".

- Source: stored DOCTORS_INDEX PageContent wins for Brazil
  (`frontend/app/[country]/[lang]/doctors/page.tsx` ~76-95); strings from
  `backend/scripts/applied/patch-brazil-doctors-content.ts:133`; locale keys
  `doctors.trustCard3Title`, `doctors.bottomCtaTitle` in `common.json`.
- Change: add Brazil SEO title/description to the `SEO` map in
  `frontend/lib/content/country-doctors-copy.ts`; in `doctors/page.tsx` prefer code
  SEO for `code === "br"` (same pattern as homepage `preferSeoExtras` in
  `app/[country]/[lang]/page.tsx`); add `br:pt/en/es` overrides for
  `trustCard3Title` and `bottomCtaTitle` without same-day wording.
- Batch type: 1a.

### R2. Homepage "verified professionals" block ignores Brazil copy

`app/[country]/[lang]/page.tsx` (~792) renders `<VerifiedProfessionals>` without
`country`, so `BR_PT_COPY` never shows on the homepage. Pass `country` **only for
Brazil** (passing it for all markets switches Portugal to `PT_PT_COPY`). Batch 1a.

### R3. Brazil pt-BR locale layer (Portugal-Portuguese strings)

Hits per page (shared header/footer ≈6 each): home 41, book 15, service pages ~20,
doctors 16, doctor profile 19, faq 16, pricing 24, gp-consultation-online hub 43,
blog index 15. Examples: "registados", "equipa", "marcação/Marcar", "doente",
"ecrã", "telemóvel", "Contacto", "Cancele a subscrição".

- Pattern exists: `frontend/lib/i18n/load-locale.ts` (~159) layers
  `romania-editorial-copy.json` and `spain-editorial-copy.json` per country. Add
  `brazil-editorial-copy.json` (pt overrides only) covering `home`, `common`
  (bookPage/bookingSteps, serviceDetailPage, doctors, doctor profile, gp hub, blog
  index), `faq`, and nav/footer/trust-bar strings.
- Also Brazil branches in `frontend/components/.../CountryTrustBar.tsx` (~59) and
  `PublicBookingLoading.tsx` (~9).
- Exclude `subscription.json` pricing strings until §4 pricing facts are answered.
- Write pt-BR, keep meaning identical; no new claims. Batch 1a. Check with a
  word-count grep on the pages above before/after.

### R4. English "Brazil" on Portuguese pages

"Médicos registados · Brazil", "Voltar à equipa de Brazil": templates use
`config.name` in `app/[country]/[lang]/services/[serviceSlug]/page.tsx`
(~194, 316, 665) and the doctor profile template. Use `common.countryNames[code]`
for `code === "br"` only (same as `book/page.tsx` ~563). Batch 1a.

### R5. `/brazil/en` homepage step text

`en/home.json` `howItWorks.step1Body` promises "specialist referrals" and
"home-test services" (home tests are off in Brazil; 16 specialist services
inactive). Add `br:en` (and `br:pt`, `br:es` if the same) override in
`country-home-copy.ts`. Batch 1a.

### R6. Diabetes articles: 4 broken links

All three diabetes articles link to `/br/medicos/dr-renato-sarmento`,
`/br/medicos/dr-tiago-miguel-figueira`, `/br/blog`; EN/ES also `/br/clinica-geral`
(all 404). Fix hrefs only (targets: `/brazil/{lang}/doctors/dr-renato-sarmento`,
`/brazil/{lang}/blog`, `/brazil/{lang}/gp-consultation-online`; remove the Tiago
link or point to `/brazil/{lang}/doctors`). Use the
`backend/scripts/patch-internal-links.mjs` manifest pattern (dry-run → owner runs
apply → rollback available). Blog writes are not clinically gated; do not use the
admin form (it resets `lastReviewedAt`). Needs owner go-ahead for a DB write.

### R7. Ledger / registers

- Add phase-5 cohort dates: 2026-10-15, 2026-11-14, 2026-12-14.
- `seo/brazil/clinical-review-register.csv`: fill `reviewed_at` for phase 4/5 rows.

### R8. Verify GA4 Brazil booking funnel (measurement plan 10)

Before the December 90-day reads: confirm `begin_booking` / `booking_confirmed`
fire on `/brazil/*` in GA4 property `547083375`.

## 3. OPEN — needs owner go-ahead for a database write (no new fact)

### D1. HOME PageContent (pt/en/es)

Body still promises specialists and uses PT-PT: EN intro "Book a consultation with
a general practitioner or specialist"; EN whoForItems[2] "Specialist review across
cardiology, dermatology…"; PT intro "…clínica geral ou especialista"; PT
whoForIntro "apoia doentes"; whyChooseItems, faq. Stored SEO fields contradict
live code SEO (PT/ES seoDescription "Mesmo dia"; EN seoTitle "Registered GPs &
Specialists"). Homepage FAQ shows 6 items, schema lists 5 (unexplained).

Action: draft exact replacements; clear stored HOME seoTitle/seoDescription for
Brazil so the admin is not misleading. Owner applies via admin, or an agent builds
a guarded PageContent runner (none exists). Clear DOCTORS_INDEX SEO fields after R1.

### D2. Doctor profile superlatives

Remove "um dos profissionais mais completos disponíveis para consulta online no
Brasil" and "É um dos poucos médicos de família com experiência simultânea…"
(and EN/ES equivalents). Doctor copy is clinically gated → run as a §1b phase
(`replacements` plan on `doctorMarketTranslations` / `doctors.bio`), Renato
approval via owner.

## 4. BLOCKED — owner / clinical / legal fact required

| # | Item | Pages | Missing fact |
|---|---|---|---|
| B1 | Articles (4 × pt/en/es) + medical-review-policy page | 15 | Signing workflow; Renato author consent + review date; follow-up booking route; `globalhealth@myglobalhealth.online` real?; legal citations; Tiago's status. Needs a guarded blog runner (body, seoDescription, author/reviewer ids, explicit `lastReviewedAt`, translations). Packet: `content-briefs/article-review-packet-2026-09-15.md` |
| B2 | Service bodies legal/speed claims | 3 services | Signing workflow + Brazilian legal review. atestado "disponível no mesmo dia na maioria dos casos"; renovação "receituário eletrônico no mesmo dia — válido em farmácias em todo o Brasil"; solicitação "válido em laboratórios e clínicas de imagem particulares em todo o Brasil" (×3), ICP-Brasil, CLT art. 473 / TRT-SP |
| B3 | Country FAQ signing answer | faq ×3 | Signing workflow (ICP-Brasil provider / Atesta status). PT-PT hero strings go in R3. |
| B4 | Pricing | pricing ×3 | Are R$150/250/300 memberships sold in Brazil; which benefits; specialist savings; remove "Only Ireland / Apenas Irlanda" |
| B5 | Doctor biography facts | Renato profile ×3 | Primary evidence + Renato confirmation: Salamanca master's, São Camilo, PUC-RS MBA, Santa Marcelina residency, DASA / AME Itaquera / Melhor em Casa roles, Pallium CNPJ line. Verified only: CRM PA11426/SP170837, RQE8822 (PA), 2013 graduation |
| B6 | `/brazil/*/dr-renato` landing | 3 | Should it ever be indexed? (now noindex, nofollow, not in sitemap; PT shows English "From"/"Duration") |
| B7 | Legal pages | 21 | Brazilian legal approval (SEO on legal pages is on indexation plan §5 "not doing") |
| B8 | Backlinks (Doctoralia, LinkedIn) | — | Clinician consent |
| B9 | New articles | — | Capacity + consent (held) |

## 5. Dated checks

| Date | Check |
|---|---|
| 2026-09-24 | Global doctor recrawl (includes Renato; SEO-DOC-006) |
| 2026-09-30 | Country FAQ measurement (includes /brazil/pt/faq, /brazil/en/faq) |
| 2026-10-12 / 11-09 | Internal-link row 11 (br:pt homepage calorie link) |
| 2026-10-13 / 11-10 / 12-08 | §59 homepage, booking, tools |
| 2026-10-14 / 11-13 / 12-13 | Phase 3 summaries |
| 2026-10-15 / 11-14 / 12-14 | Phase 4 pages; phase 5 summary |
| ~2026-11-13 | Brazil SERP recheck + November commercial review |

GSC/CrUX: `py` is not on PATH in agent shells and the local GSC script lacks
`google-api-python-client`; refresh data from an interactive session before each
batch (CLAUDE.md rule) or record that it was not refreshed.

## 6. Owner answers that unblock the most

1. Signing workflow (ICP-Brasil provider, Atesta status) → B1, B2, B3.
2. Renato: author consent, review date, biography evidence → B1, B5.
3. Memberships in Brazil and benefits → B4.
4. Go-ahead for database writes R6, D1, D2.
5. `/brazil/*/dr-renato`: stay noindex permanently? → B6.
