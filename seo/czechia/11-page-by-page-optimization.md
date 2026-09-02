# Czechia page-by-page optimization package

**Prepared:** 2026-09-01

> **Dated evidence, not current operational status.** The canonical global ledger
> at [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md) owns
> current status, priorities and next actions. This document describes the 2026-09-01
> package; the 2026-09-02 Prague approval that followed it is recorded in ledger §36,
> and the independent review of the whole batch is ledger §38.

**Scope:** 50 current public URLs: 48 Czech pages plus the two explicitly mapped English/expat pages.
**Primary artifact:** [`page-by-page-completion-matrix.csv`](page-by-page-completion-matrix.csv)

## What is complete

- Every in-scope URL has exactly one primary keyword and a focused secondary set.
- All 481 rows in `03-keyword-master.csv`, including low-volume rows, retain an owner URL that exists in the 50-row matrix.
- Exact live titles, meta descriptions and H1s were captured on 2026-09-01 local time before recommendations were written. The UTC-timestamped replay artifact is [`raw/live-page-seo-snapshot-2026-09-01.csv`](raw/live-page-seo-snapshot-2026-09-01.csv).
- Every title, meta description, H1, visible description, bio, FAQ set, internal-link role, CTA, canonical, hreflang, schema type and indexability state received a row-level disposition.
- All 50 pages returned `200`, declared a self-canonical, returned `index, follow`, included a self-referencing hreflang entry and emitted structured data appropriate to the route type.
- The FAQ route passes the source-level visibility check: `faqJsonLd(...)` and `FAQTabs` consume the same `groups` array. Only the active tab is server-rendered; the remaining questions become visible when their tabs are selected.
- Every rewritten field in the matrix passed the final deslop check. No long dashes, canned framing or filler phrases remain in the proposed copy.
- No new URL, redirect, page, schema claim, service, medicine pathway or doctor credential was invented.

## Source-model count

| Source model | Rows | Included page types |
| --- | ---: | --- |
| Static/i18n | 14 | blog hub, standalone and legal routes |
| PageContent | 4 | Czech and English home, GP hub, doctor directory |
| Service | 16 | 15 Czech services plus the English Prague service |
| Blog | 4 | four Czech posts |
| Doctor | 5 | five current Czech public profiles |
| Tool | 7 | all Czech public tools |
| **Total** | **50** | |

The other 231 Czechia sitemap URLs are de/es/pt/ro translations and non-target English variants. They were not widened into this Czech keyword batch without locale-specific evidence and native review.

## Keyword and intent controls

- GP commercial intent stays on `/czechia/cs/gp-consultation-online`; the 24/7 article remains informational.
- Booking intent for neschopenka stays on the service; ČSSZ process intent stays on the explainer; benefit calculation stays on the 2026 sick-pay article.
- English Prague intent stays on `/czechia/en/services/lekar-online-praha`; the English home remains a market hub.
- Doctor profiles own clinician-name searches. The directory owns the roster query, not individual names or service terms.
- Tool queries stay on existing calculators and checks. Sex, spelling and calculation variants are supporting terms, not new URLs.
- `psychiatr online`, free-chat terms, eye-doctor booking terms and diagnostic `test na osteoporózu` language were not forced into services that do not provide those products.

## FAQ and availability review

The live scan found blanket same-day, instant-confirmation or automatic-document language across service cards, service bodies and several doctor-profile FAQs. The page-specific matrix identifies every affected page. These generic sentences are editorial guardrails, not executable page-level FAQ drafts:

**Availability answer**

> Volné termíny se zobrazují při rezervaci podle aktuální dostupnosti lékaře a zvoleného jazyka. Konkrétní den ani čas nelze slíbit předem.

**Clinical outcome answer**

> Případný eRecept, eNeschopenku, žádanku, doporučení nebo jiný dokument může lékař vystavit pouze po odpovídajícím klinickém posouzení. Výsledek konzultace nelze slíbit předem.

**English availability answer**

> Available appointments are shown during booking and depend on the doctor and consultation language. A specific day or time cannot be guaranteed in advance.

Only the two fully prepared service drafts contain exact, source-level FAQ replacements and are marked `FAQs optimized: yes`. The other affected service and doctor rows are marked `no`: an exact old/new FAQ edit remains pending clinical review and is not represented as complete.

## Full local drafts already implemented

Two pages have complete review-gated repository drafts, not just matrix recommendations:

| URL | Draft coverage | Approval hash | Production state |
| --- | --- | --- | --- |
| `/czechia/cs/services/neschopenka-online` | title, meta, H1, summary, hero, body, CTA, seven existing FAQs, ČSSZ link, emergency and explainer links | `9d4b1ad095dab37b716d794301ca0607fab21940391da7f43df72020b91d0a0e` | owner-authorized; locale fallbacks preserved; pending recorded clinical approval |
| `/czechia/cs/services/obnoveni-lecby` | title, meta, H1, summary, hero, body, CTA, six existing FAQs, ePreskripce link, emergency and GP links | `a02d12a3e9aada7f106233841bc55ec6b268805561660020734306e054ff5106` | owner-authorized; locale fallbacks preserved; pending recorded clinical approval |

The guarded updater defaults to dry-run, verifies exact source fingerprints and refuses an apply when non-Czech fallback content would change.

## Binding holds

- `/czechia/cs/gp-consultation-online` and `/czechia/cs/blog/lekar-online-24-7-co-vyresi`: hold until the registered 2026-09-08 query-to-page measurement gate.
- `/czechia/cs/services/cestovni-medicina-praha`: recrawl measurement hold; recommendations are recorded but not marked implemented.
- Legal bodies: metadata recommendations only; substantive text requires the legal owner.
- Doctor bios: retained because no new authoritative qualification, registration, language, location or availability evidence was supplied. Metadata and availability FAQ corrections do not alter biography facts.

## Fact-preservation result

The comparison preserves names, registrations, qualifications, languages, prices, durations, service scope, clinical thresholds, calculator formulas, regulatory roles and legal terms. Where current copy made an unsupported operational promise, the recommendation removes or narrows that promise rather than replacing it with a new fact. No clinical factual claim was expanded.

## Implementation boundary

The 14 non-clinical static pages and 18 clinician-approved Czech pages are live and
publicly verified. The approved clinical batch comprises the Czech home, 12
services, the diabetes article and four tools. Seventeen of those were approved on
2026-09-01; `/czechia/cs/services/lekar-online-praha` was approved separately on
2026-09-02 and is recorded in ledger §36. Exact replay evidence for the 2026-09-01
approvals is
[`raw/clinical-production-readback-2026-09-01.csv`](raw/clinical-production-readback-2026-09-01.csv),
with the production operation recorded in
[`raw/production-write-receipt-2026-09-01-clinical-seo.json`](raw/production-write-receipt-2026-09-01-clinical-seo.json).
The remaining 14 eligible pages stay source-pinned and fail closed pending their
specialist, native-English or governance approval. The three measurement holds and
two reviewed-no-change rows remain untouched. Doctor biographies, credentials,
prices, durations, availability, booking behavior, clinical algorithms and
non-target locales were not changed.
