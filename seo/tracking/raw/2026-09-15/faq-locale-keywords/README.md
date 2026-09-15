# Market FAQ locale keywords (2026-09-15)

Keyword evidence for translating the Portugal, Spain, Czechia, Romania and Brazil market FAQs into the site's other languages. The Irish FAQ was done separately, in `seo/ireland/faq-translation-drafts-2026-09-15/`.

## Method

- **Tool:** OpenSEO `get_keyword_metrics` (DataForSEO), project `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`, no trends, no clickstream.
- **Cost:** 353 credits for 22 calls (balance 9,914 to 9,561).
- **Constraint:** DataForSEO serves only a country's primary language for that country. A Portugal-location call rejects Spanish. So each language was measured where it is spoken, searching about the target market: Spanish from Spain and Argentina, Portuguese from Portugal and Brazil, Czech from Czechia, Romanian from Romania, German from Germany.
- **Candidates:** 12 phrases per call: online doctor, doctor in X, doctor who speaks the language, online consultation, GP, prescription, medical certificate, emergency, healthcare in X, telemedicine, health insurance, hospital.

Raw results: `openseo-keyword-metrics.json`.

## What the data shows

| Language | Demand found |
| --- | --- |
| German | Real, in every market: health insurance, health system, hospital, prescription (up to 480 a month for Spain) |
| Portuguese | Spain only: health insurance, healthcare and doctor in Spain (50 to 170 a month) |
| Spanish | Tiny: Portugal (telemedicine 170, health system 50) and Brazil (10 to 30) |
| Czech | None measurable |
| Romanian | None measurable |

Where nothing is measurable, the drafts use the site's existing terminology and at most one natural "online doctor in X" phrase. They record no invented volumes.

## Drafts produced from this evidence

`seo/<country>/faq-translation-drafts-2026-09-15/<lang>.json` for:

- Portugal: es, cs, ro, de
- Spain: pt, cs, ro, de
- Czechia: pt, es, ro, de
- Romania: pt, es, cs, de
- Brazil: es

Each draft translates the **native** market FAQ, which is the reviewed copy. The English versions contain claims the native copy removed, such as same-day care and equal legal value. Each draft lists its `_keywordsUsed` and `_reviewNotes`.

Check all drafts from the repo root:

```bash
python seo/tracking/scripts/check_faq_translation_drafts.py --all
```

Drafts need clinical approval before they are copied into `frontend/locales/<lang>/faq-markets.json`.
