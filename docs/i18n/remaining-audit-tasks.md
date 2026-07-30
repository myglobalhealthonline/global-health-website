Continue a doctor-service/FAQ localization audit for this repo (global-health-website). Prior work already shipped and verified in the live DB — do not redo it. Read this whole file before doing anything.

## Context

Supported locales: EN, PT, ES, CS, RO, DE (LocaleCode enum, backend/prisma/schema.prisma). Countries: ie (default EN), pt (default PT), cz (default CS), ro (default RO), es (default ES, 0 PUBLIC services), br (default PT, 0 PUBLIC services).

Translation tables already exist: `ServiceTranslation` (per-locale service copy), `ServiceFaqTranslation` (per-locale FAQ overrides, added 2026-07-06), `DoctorTranslation`, `SpecialtyTranslation`, `HealthTestTranslation`. Base row = default-locale content; override rows = other locales.

Helper scripts already built in `backend/scripts/` (reuse them, don't rewrite):
- `audit-locale-coverage.ts` — read-only DB coverage report (run with `node --import tsx scripts/audit-locale-coverage.ts` from `backend/`)
- `upsert-faq-translations.ts <LOCALE> <file.json>` — upserts `ServiceFaqTranslation` rows from `{ services: [{ slug, faqs: [{id, question, answer}] }] }`
- `upsert-service-translations.ts <country> <LOCALE> <file.json>` — upserts both `ServiceTranslation` fields and `ServiceFaqTranslation` from `{ services: [{ slug, fields: {...8 keys...}, faqs?: [...] }] }`
- `tmp-fix-specialty-de.ts` — already has the 3 specialty DE upserts hardcoded, just needs running

All run via: `cd backend && node --import tsx scripts/<name>.ts <args>`

## Already done (verified in DB — skip)

- CZ: ServiceFaqTranslation for all 5 non-default locales (EN/PT/ES/RO/DE), 96 FAQs × 5 = 480 rows. CZ ServiceTranslation was already complete before this audit.
- IE: ServiceTranslation + ServiceFaqTranslation for all 5 non-default locales (PT/ES/CS/RO/DE), 23 services / 165 FAQs each.
- PT: ServiceTranslation + ServiceFaqTranslation for all 5 non-default locales (EN/ES/CS/RO/DE), 25 services / 172 FAQs each.
- Static locale JSON files (`frontend/locales/{locale}/*.json`, 6 locales × 11 namespaces): audited, 0 real gaps. (Two apparent gaps in `account.json`/`subscription.json` are dead/unused keys — confirmed via grep, no fix needed.)
- Compliance scan of all 433 EN `ServiceFaq` rows against a banned-phrase list (guarantee/cure/miracle/risk-free/"do you have X"/etc): only 2 hits, both benign clarifying-question FAQs that already say "No, clinical judgement decides" — no changes needed.

## Remaining work

### 1. Romania (ro) service field translations — HIGHEST PRIORITY, was in progress when interrupted

Romania has 18 PUBLIC services with **zero FAQs** (nothing to translate there — flag as a content gap for admin to author FAQs, don't fabricate any). Service *fields* (name/summary/seoTitle/seoDescription/heroTitle/heroDescription/detailBody/ctaLabel) are missing across up to 5 locales per service (2 services already have EN done; the rest need all 5).

Steps:
1. Regenerate the source data if `C:\Users\kingh\AppData\Local\Temp\claude\...\scratchpad\job-ro-allfields.json` no longer exists (temp dir may be cleared) — rebuild it by querying `prisma.service.findMany({ where: { visibility: "PUBLIC", country: { code: "ro" } }, select: { slug, name, summary, seoTitle, seoDescription, heroTitle, heroDescription, detailBody, ctaLabel, translations: { select: { locale: true } } } })`, compute each service's `missingLocales` (the subset of `["EN","PT","ES","CS","DE"]` not already in `translations`), and write `{ services: [{ slug, fields: {...8 keys...}, missingLocales: [...] }] }`.
2. Translate: for each service, only produce translations for the locales listed in its `missingLocales`. Source language is Romanian. Preserve HTML tags in `detailBody` exactly. Follow the ad-compliance rules below.
3. Write output as `{ services: [{ slug, translations: { EN: {...8 keys...}, PT: {...}, ... only for that service's missingLocales } }] }`.
4. Upsert: this shape doesn't match `upsert-service-translations.ts` directly (that script expects one locale per file) — either write a small one-off script that loops per-locale extracting `translations[locale]`, or just re-run the translation per-locale (5 separate smaller jobs, one per target locale, using the same job/upsert pattern as IE and PT below) — the per-locale approach is more reliable and is what worked for IE/PT.

### 2. Specialty DE translations (trivial, script already written)

Run: `cd backend && node --import tsx scripts/tmp-fix-specialty-de.ts`
Upserts German names for 3 specialties (Cardiology→Kardiologie, Dermatology→Dermatologie, Nutrition→Ernährungsberatung), already hardcoded in the script. Just execute it.

### 3. Doctor profile translations (21 doctors missing, mostly just DE)

Query gaps: `prisma.doctor.findMany({ where: { active: true }, select: { id, slug, fullName, title, bio, seoTitle, seoDescription, country: { select: { code, defaultLocale } }, translations: { select: { locale } } } })`, filter to those missing any of the 6 locales other than their country's default. Most are PT-country doctors missing only DE (bio/title in Portuguese, need German). A few (1 Brazil doctor, 3 Czech doctors) are missing 4-5 locales.

Translate `title` and `bio` (bio may contain HTML — preserve tags) into the missing locale(s) per doctor. `seoTitle`/`seoDescription` are null for most — leave null unless already populated in source. Upsert via `prisma.doctorTranslation.upsert({ where: { doctorId_locale: { doctorId, locale } }, create/update: { title, bio, seoTitle, seoDescription } })`.

Do NOT author new `DoctorFaq` content — that table is empty (0 rows) across every doctor and locale. That's a content-authoring gap, not a translation gap; leave it and note it in your final report.

### 4. HealthTestFaqTranslation architecture gap (real engineering work)

`HealthTestFaq` (backend/prisma/schema.prisma, search for `model HealthTestFaq`) has NO per-locale translation table, unlike `ServiceFaq` which got `ServiceFaqTranslation` in migration `20260706000000_service_faq_translations`. There are currently 0 `HealthTestFaq` rows in the DB (2 HealthTest records, no FAQs authored yet), so this is purely an architecture fix, not a content backfill.

To fix, mirror the ServiceFaq pattern exactly:
1. Add `HealthTestFaqTranslation` model to `backend/prisma/schema.prisma` (copy `ServiceFaqTranslation`, rename `serviceFaqId`→`healthTestFaqId`, relation to `HealthTestFaq`).
2. Add `translations HealthTestFaqTranslation[]` to `HealthTestFaq`.
3. Write a new migration (see the reference migration `20260706000000_service_faq_translations/migration.sql` for the exact SQL shape to mirror — table + FK + unique index on `(healthTestFaqId, locale)`).
4. Mirror the service-layer changes from that same commit (`git show d0c1b5f3fb5acc69890b2df98fc3e27123195644 --stat` to see the full file list) into the health-test equivalents: `backend/src/services/health-test-faq.service.ts` (create if it doesn't exist, mirroring `service-faq.service.ts`), the admin FAQ CRUD routes/validations, the public health-test detail route/locale param, and the admin FAQ panel component (mirror `frontend/app/(admin)/admin/services/_components/service-faq-panel.tsx`).
5. Run `prisma migrate dev` (or the project's diff-from-live-DB + `migrate deploy` workaround if `migrate dev` is broken — check with the user first per repo convention, this project has had broken-migration issues before per its memory notes) and `prisma generate`.

### 5. Missing-locale-key build/test check (acceptance-criteria item)

Add a script (e.g. `frontend/scripts/check-locale-keys.mjs` or similar existing convention in this repo) that:
- Flattens every namespace JSON under each `frontend/locales/{locale}/` folder.
- Diffs every non-`en` locale's key set against `en` (the base) per namespace.
- Fails (non-zero exit) if there's a missing key, an extra key, or a placeholder (`{word}`) mismatch between corresponding keys.
- Wire it into an existing `test`/`lint`/`typecheck` npm script in `frontend/package.json` (or add a new `check:locales` script and reference it from CI if this repo has a CI config) so missing keys are caught before deploy.

A working reference implementation of the diff logic (already tested, 0 false positives found) is described here — flatten each JSON to dotted-path keys, compare key sets, and compare sorted `{placeholder}` matches per key between locale and base.

## Ad-compliance rules (apply to ALL new translated content, not just Romania)

Use neutral availability language ("Book a GP appointment", "X consultations are available", "Speak with a licensed doctor"). Keep claims factual. Preserve any existing safety/emergency or "no guarantee, clinical judgement" caveats faithfully — never soften or drop them. Do NOT introduce: guarantee/cure/miracle/risk-free/"100% safe" language, questions presuming the reader has a condition ("Do you have X?"), pressure/fear/shame phrasing, prescription-drug promotion, or before/after cosmetic claims. Preserve HTML tags exactly in any `detailBody`/`bio` field; translate only text nodes.

## When done

Re-run `cd backend && node --import tsx scripts/audit-locale-coverage.ts` and confirm the gap counts have dropped to reflect only the RO-FAQs-don't-exist and DoctorFaq-empty-everywhere content gaps (which are out of scope — nothing to translate). Run `tsc --noEmit` in both `backend/` and `frontend/` before declaring done. Delete the temporary one-off scripts (`tmp-fix-specialty-de.ts` and anything else prefixed `tmp-`) once their upserts have run successfully. Report: what was translated (counts per country/locale), what was structurally added (HealthTestFaqTranslation), what build check was added, and what's still intentionally left as a content gap (RO FAQs, DoctorFaq) for admin/legal to author and review.
