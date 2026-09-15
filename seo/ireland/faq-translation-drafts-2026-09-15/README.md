# Ireland FAQ translation drafts (2026-09-15)

**Status: clinician-approved (Dr Tiago, confirmed by the owner 2026-09-15) and wired into `frontend/locales/<lang>/faq-markets.json`. The draft files keep their original `_status` and reviewer notes as the review record.**

These files translate the Irish market FAQ (`frontend/locales/en/faq-markets.json`, key `ie`, 6 groups, 18 questions) into Spanish, Portuguese, Czech, Romanian and German. They were drafted by AI on 2026-09-15 at the owner's request.

## Why they exist

OpenSEO flagged `/ireland/{es,pt,cs,ro,de}/faq` as `noindex-page`. Those pages serve the English FAQ as a fallback, so `lib/content/country-faq.ts` noindexes them on purpose. The noindex lifts automatically once `faq-markets.json` for that language has its own `ie` entry. See ledger §7 in `docs/plans/seo-control-state-2026-09.md`.

## Rules before any draft goes live

Editorial plan 2026-08-19 requires native-language review for medical (YMYL) copy. So each draft needs:

1. **Native-language editorial review.** Fix phrasing, register and terminology. Check every entry in `_reviewNotes`.
2. **Clinical review.** Confirm no claim was strengthened, softened, added or lost, especially sick certificates, prescriptions, emergency advice and registration wording.
3. **A recorded reviewer.** Name, date and language go in the ledger entry for the publish batch.

## How to publish a reviewed draft

1. Copy the reviewed `ie` object into `frontend/locales/<lang>/faq-markets.json` as a top-level `ie` key. Do not copy the `_status`, `_source`, `_locale` or `_reviewNotes` keys.
2. Run from `frontend/`: `node scripts/check-locale-keys.mjs`, `node node_modules/typescript/bin/tsc --noEmit`, and `node node_modules/vitest/vitest.mjs run tests/unit/seo/sitemap.test.ts`.
3. Deploy, then check that `/ireland/<lang>/faq` serves `index, follow` and appears in the sitemap.

## Files

| File | Content |
| --- | --- |
| `es.json`, `pt.json`, `cs.json`, `ro.json`, `de.json` | One draft per language, same structure as the source plus review notes |
| `check_drafts.py` | Structural check against the English source |

Check all drafts from the repo root:

```bash
python seo/ireland/faq-translation-drafts-2026-09-15/check_drafts.py
```
