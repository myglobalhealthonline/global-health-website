# Database Translation Takeover Brief

## Objective

Complete all missing user-facing database translations for supported locales `EN`, `PT`, `ES`, `CS`, `RO`, and `DE`, beginning with all Ireland services and their FAQs. Irish/Gaelic is not supported.

The translation workflow must be resumable, auditable, economical, and must never overwrite an existing valid translation.

## Non-negotiable rules

- Create a fresh database content snapshot immediately before any database write.
- Run locale-coverage and language-mismatch audits before and after writing.
- Use each country's documented default-language content as the source. Never use another available translation merely because it exists.
- Runtime fallback may only be: requested locale -> documented country default locale -> base content. Report every fallback.
- Preserve IDs, prices, timestamps, URLs, email addresses, HTML structure, template variables, numbers, units, and proper names.
- Do not invent or strengthen medical claims, qualifications, guarantees, legal statements, prices, safety advice, FAQs, or advertising claims.
- If meaning is uncertain, do not translate automatically; mark the item for human review.
- Mark medical, legal, pricing, safety, SEO, and advertising-sensitive content as requiring human review.
- Draft first and review before applying. Database writes must upsert only missing rows/fields.
- Never print, log, commit, or expose `OPENAI_API_KEY`.

## Requested scope

Ultimately translate all user-facing database content:

- Services and all eight fields: `name`, `summary`, `seoTitle`, `seoDescription`, `heroTitle`, `heroDescription`, `detailBody`, `ctaLabel`
- Service FAQs
- Doctor titles, biographies, and SEO fields
- Health-test fields and FAQs
- Specialty names and summaries
- Service links
- Plans
- Legal disclaimers/notices
- Pages and landing pages
- Blog content and metadata
- Buttons, labels, and notifications stored in the database

Do not translate operational data such as IDs, numeric prices, timestamps, URLs, or emails.

## Current state

- Ireland is the first country in scope.
- Live read-only audit found:
  - Services: 187 total; 123 still missing at least one locale row after the single approved test write.
  - Service FAQs: 776 total; 343 missing translations.
  - Doctors: 38 of 62 incomplete.
  - Health tests: 2 of 2 incomplete.
  - Specialties: no incomplete records in the latest core audit.
- One mismatch remains: Czech doctor `cz/khoiamul-islam` (`cmp9n5dpq0000foju1qv98wm3`) has English base fields despite country default `CS`; a valid Czech translation exists. Investigate without overwriting it.
- A content-only snapshot already exists at:
  `C:\Users\kingh\AppData\Local\Temp\gh-i18n-snapshots\i18n-content-2026-07-10T18-27-25.json`
- The OpenAI API key is configured in `backend/.env`, and API connectivity was verified.
- One generated draft was successfully saved to `backend/tmp/i18n-drafts/ireland-services.jsonl`:
  `endocrinology-consultation`, field `name`, target `PT`, generated with `gpt-5.4`.
- One approved database test write was completed for Ireland service `dermatology-consultation`, ID `cmralbnt406ob01mzszanr3jk`. Missing names were added for PT, ES, CS, RO, and DE; existing EN was preserved. No FAQ was changed.

## Existing implementation and artifacts

Translation/audit scripts:

- `backend/scripts/snapshot-i18n-content.ts`
- `backend/scripts/audit-locale-coverage.ts`
- `backend/scripts/audit-translation-language-mismatches.ts`
- `backend/scripts/generate-i18n-proposal-report.ts`
- `backend/scripts/draft-ireland-service-translations-openai.ts`
- `backend/scripts/upsert-service-translations.ts`
- `backend/scripts/upsert-faq-translations.ts`

Reports and documentation:

- `docs/MULTILINGUAL_AND_ADS_COMPLIANCE_AUDIT.md`
- `docs/i18n-missing-translation-report.json`
- Draft output: `backend/tmp/i18n-drafts/ireland-services.jsonl`

Relevant Ireland source/import data:

- `backend/scripts/data/ireland-service-content.json`

Locale-aware API/frontend changes already exist in the dirty worktree. Preserve them:

- `backend/src/modules/doctors/doctors.service.ts`
- `backend/src/modules/health-tests/health-tests.service.ts`
- `backend/src/modules/services/services.service.ts`
- `backend/src/routes/health-tests.route.ts`
- `backend/src/routes/services.route.ts`
- `frontend/lib/api/site-content-api.ts`
- `frontend/lib/content/get-public-services.ts`
- `frontend/lib/content/get-public-specialties.ts`

## Important limitations to fix before bulk generation

The current Ireland drafting script is resumable and does not write to the database, but it needs cost and safety improvements before running at scale:

1. Its default model is currently `gpt-5.4`. Change the default or set `OPENAI_TRANSLATION_MODEL=gpt-5.4-mini` to reduce cost.
2. Add a configurable field filter so short fields can be generated first. Suggested order: `name`, `ctaLabel`, titles, summaries, SEO descriptions, then long HTML bodies.
3. Add response usage logging and a hard token/cost budget guard. Stop safely before exceeding the configured budget.
4. Add retry/backoff for rate limits and transient errors.
5. Keep one JSONL record per `(parent ID, locale, field)` and continue skipping completed keys.
6. Add a separate Service FAQ drafting workflow or safely generalize the script.
7. Add validators for preserved HTML tags, placeholders, URLs, numbers, email addresses, and non-empty complete output.
8. The missing-translation report was corrected for core fields, but its coverage of later/non-core entity types may still be incomplete after a helper-signature change. Verify it before treating its totals as authoritative.

## Cost strategy — user has approximately USD $4

- Do not launch all long-form content immediately.
- Use `gpt-5.4-mini` and concise structured prompts.
- Generate only missing fields; never send existing valid translations.
- Process short fields first in small batches and record API usage.
- Estimate remaining cost from actual usage before translating long `detailBody` HTML and FAQs.
- Consider OpenAI Batch API for non-urgent bulk work if implemented and validated, but retain the same per-item safeguards and resumability.
- Stop when the configured budget ceiling is reached; do not silently exceed it.

## Recommended takeover sequence

1. Inspect `git status` and preserve all current user/Codex changes.
2. Read the Prisma schema and existing admin validation rules for every translation table.
3. Inspect the saved JSONL draft without dumping sensitive or very long text.
4. Improve the draft generator with field filtering, usage/cost accounting, budget cutoff, retries, and review flags.
5. Run its dry-run and then a tiny batch of 5–10 short fields.
6. Validate the drafts and generate a reviewable proposal report containing record ID, slug, field, source locale, target locale, source text, proposed translation, sensitivity flags, and validation status.
7. Extend the same process to Ireland service FAQs.
8. Present proposals for review. Do not write drafts to the database until approval is explicit.
9. Immediately before an approved write, create a fresh auditable snapshot.
10. Upsert only missing rows/fields in a transaction; preserve existing meaningful values.
11. Re-run coverage and mismatch audits.
12. Test Ireland through API and frontend in EN/PT/ES/CS/RO/DE, including documented fallback behavior.
13. Continue country-by-country, then entity group by entity group.

## Useful commands

Run from `backend` using the project's existing TypeScript runner/package scripts. First inspect `package.json` for the exact invocation convention.

Typical operations:

```powershell
# Draft preview only
npx tsx scripts/draft-ireland-service-translations-openai.ts --dry-run --limit=5

# Small resumable draft batch; set model only for this shell
$env:OPENAI_TRANSLATION_MODEL='gpt-5.4-mini'
npx tsx scripts/draft-ireland-service-translations-openai.ts --limit=5
```

Do not enable live-database tests by bypassing the repository's safety guard. The backend test suite previously refused to run because `.env` points to the production Railway database. Use read-only audits and a safe test database instead.

## Verification already completed

- Backend TypeScript check passed after locale changes.
- Frontend TypeScript check passed.
- Frontend locale-key check passed.
- API key connectivity test passed without exposing the key.

## Completion criteria

- Every applicable parent record has exactly one valid translation row per supported target locale according to its Prisma table/admin rules.
- Existing valid translations are unchanged.
- All generated content has provenance, model, timestamp, source locale/text, target locale, validation status, and review flags.
- Sensitive drafts have human approval before database application.
- Coverage and mismatch audits pass or all remaining exceptions are documented.
- API and frontend tests pass for every country and supported locale.
- Every runtime fallback is limited to the documented country default and is reported.
