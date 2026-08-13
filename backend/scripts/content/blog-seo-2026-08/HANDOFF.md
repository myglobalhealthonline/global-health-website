# Blog SEO batch, August 2026 — handoff

12 articles (2 per market), each in every locale its market serves. 66 locale
rows total. **7 written, 59 remaining. Nothing applied to production yet.**

Run the dry-run from `backend/`:

```bash
node --env-file=.env --import tsx scripts/seed-blog-seo-2026-08.ts
```

`--only=ie` scopes to a country code, `--only=pt-autodeclaracao` to one article.
`--apply` writes. `.env` points at **production** — dry-run and read the diff first.

## Locale model — read this before changing anything

`BlogTranslation` is never read by the public site. `frontend/lib/content/blog-post-page.tsx`
states posts have exactly one authored locale; a locale that isn't the post's own
is served the same body under `noindex` and canonicalised away, and
`frontend/app/sitemap.ts` emits only `p.locale`. Backend `getPublicBlogPostBySlug`
filters on `BlogPost.locale` and never touches the translations table.

So **each locale is its own `BlogPost`** with a native slug, all sharing the
market's `BlogPostCountry` row. That is the only shape that renders per locale
and enters the sitemap. Do not "fix" this by moving to `BlogTranslation` without
also changing the three files above.

## Status

| Market | Article | Target (vol / KD) | Written | Remaining |
| --- | --- | --- | --- | --- |
| IE | `ie-illness-benefit` | illness benefit ireland — 6,600 / 5 | en, pt, es | cs, ro, de |
| IE | `ie-blood-tests` | blood test dublin — 1,600 / 0 | en | pt, es, cs, ro, de |
| CZ | `cz-neschopenka` | neschopenka — 2,400 / 10 | cs | en, pt, es, ro, de |
| CZ | `cz-lekar-online` | lékař online 24/7 — 340 / 1 | cs | en, pt, es, ro, de |
| PT | `pt-autodeclaracao` | autodeclaração de doença — 12,100 / 0 | pt | en, es, cs, ro, de |
| PT | `pt-consulta-viajante` | consulta do viajante — 5,400 / 3 | — | all 6 |
| ES | `es-baja-ansiedad` | baja laboral por ansiedad — 1,000 / 0 | — | all 6 |
| ES | `es-dermatologo-online` | dermatólogo online — 260 / 0 | — | all 6 |
| RO | `ro-scrisoare-medicala` | scrisoare medicală — 1,000 / 0 | — | all 6 |
| RO | `ro-boli-cronice` | boli cronice — 880 / 0 | — | all 6 |
| BR | `br-atestado-medico` | atestado médico online — 1,600 / 12 | — | all 3 |
| BR | `br-pedido-exames` | pedido de exames online — 210 / 0 | — | all 3 |

Locales: IE/CZ/PT/ES/RO serve `en, pt, es, cs, ro, de`; BR serves `pt, en, es` only.

## Research already done — do not repeat

All six markets were researched in their own locale (IE 2372/en, CZ 2203/cs,
PT 2620/pt, ES 2724/es, RO 2642/ro, BR 2076/pt), via `get_keyword_metrics`,
`get_serp_results`, `get_search_console_performance` and `research_keywords`.
Each content file's header carries its own volume, KD, SERP read and GSC
evidence. OpenSEO project `7b96b0f3-8190-4b11-a370-5b69a9f99ff1`.

Deeper per-country `research_keywords` expansions still to run before writing:
**ES, RO, BR.** The CZ and PT expansions each changed a target, so expect these
to as well.

Targets already changed by expansion:
- CZ article 2: `praktický lékař online` (no volume figure) → `lékař online 24/7`
  (170 + 170, KD 0/1). Head term `online lékař` is 880/mo but KD 28 — above ceiling.
- PT article 1: `baixa médica` (4,400, KD 20 — on the ceiling) →
  `autodeclaração de doença` (12,100, KD 0). Baixa médica terms are still covered
  inside that article.

Rejected, with reasons:
- ES `justificante medico` (9,900, KD 0) — SERP is document-template generators.
  Wrong intent, and adjacent to fake-certificate content.
- RO `concediu medical` (18,100, KD 0) — **the biggest single opportunity across
  all six markets**, blocked because `sick-note-romania` is `isActive:false`.
  Reactivating that service justifies swapping a Romanian article.
- CZ `nemocenská 2026` (2,900) — KD 22. ES `cita medico online` (2,400) — KD 95.

`get_serp_results` returns `people_also_ask` as a bare item with `title: null`,
so PAA text is **not** available. FAQs are drawn from real GSC query strings and
keyword variants instead.

## Writing rules these files follow

- 1,500–2,500 words, `seoTitle` ≤ 60, `seoDescription` ≤ 155 — all enforced by
  the seed script, which aborts the whole run on any violation.
- 4–6 FAQs, rendered as `<details class="faq-item"><summary class="faq-q">` —
  the exact shape `frontend/lib/seo/article-faqs.ts` matches for FAQPage schema.
- **No fabricated figures.** No rates, waiting days, percentages, caps, durations
  or prices appear in any article. Every numeric question points at the official
  body instead. This is deliberate — those values are statutory and move.
- Every external link was verified live (SERP result or WebFetch) before being
  cited. `mzcr.cz` 301s to `mzd.gov.cz`; use the latter.
- Country-specific law by name, never the same article with the country swapped.
- No claims the business cannot support. The Portuguese article is the model:
  our PT service is *"Justificação Médica de Falta ao Trabalho"*, which is **not**
  a Certificado de Incapacidade Temporária, and the article says so plainly.
- Internal links required in every article: the market's `/services/{slug}`,
  `/doctors`, `/contact`. Enforced by the script.
- Category chips link `/{country}/{lang}/blog` — `/blog/categories/*` is a live
  404 (see `scripts/patch-blog-dead-category-links.ts`).

## Traps

- **`/\bTODO\b/i` in `frontend/lib/content/publication-validation.ts` matches the
  ordinary Spanish word "todo".** Any ES post containing it is silently
  unpublishable from the admin. Currently worked around in copy
  (`sobre todo` → `especialmente`). The real fix is dropping the `i` flag.
  Not done — outside the brief, needs sign-off.
- Other blocked patterns that trip real copy: `pending`, `fallback`, `placeholder`,
  `migration`, `adapter`, `mock`, `seeded`.
- Czech and Portuguese run short — both landed near 1,520 words on the first
  pass and needed a section added. Budget for it.
- Doctor FKs: CZ/PT/ES/RO/BR doctors have no registration numbers in the DB, so
  author lines carry title and clinic only. Do not invent council numbers. Only
  the Irish author has a verified one (IMC 523449).

## Safety built into the seed script

- Everything seeds as `DRAFT`, `publishedAt`/`lastReviewedAt` null. The client
  publishes from the admin after clinical review.
- Re-running never clobbers admin edits: each row stores a sha256 of the body it
  was seeded with in `editorialChecklist.seedHash`, and a row whose current body
  no longer matches is skipped entirely.
- Re-running never reverts `status`/`publishedAt`/`lastReviewedAt`.
- Country, service and both doctors are resolved by lookup up front; the run
  aborts rather than seeding a dangling FK. An inactive service is a hard error.
- All copy validation runs before any write, and one failure aborts the batch.

## Remaining after the content

1. `pnpm --filter frontend build` (use `ALLOW_DEGRADED_BUILD=1` with no local backend).
2. Dry-run the full 66, show the user, get explicit approval, then `--apply`.
3. Confirm the new posts appear in the sitemap — the country loop in
   `frontend/app/sitemap.ts` already covers blog URLs, so no sitemap change is needed.
