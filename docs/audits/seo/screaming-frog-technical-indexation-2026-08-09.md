> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).** The counts, statuses and priorities below are a record of what was true when this document was written. Do not treat them as current.

# Screaming Frog technical indexation batch — 2026-08-09

Source exports: `issues_overview_report.csv`, `internal_all.csv` (crawl timestamp
2026-08-09 08:55 UTC). Scope: technical defects that can affect Google
indexation. Explicitly out of scope: title/description length, readability,
duplicate H2s, image alt/size — quality/perf backlog, not indexation.

## 1. The 33-URL metadata/head cluster

Exactly 33 URLs (5 doctor + 28 service pages, all 6 markets) simultaneously
flagged: Page Titles/Meta Description/Directives/Canonicals/Hreflang
"Outside `<head>`", plus Canonicals: Missing. One systemic cause, not six.

**Root cause.** `generateMetadata()` on service/doctor detail pages built the
hreflang alternates by sequentially `await`-ing one DB-backed API call per
supported locale (up to 6 in a row) —
`indexableServiceAlternates` (`app/[country]/[lang]/services/[serviceSlug]/page.tsx`)
and `doctorHreflangCluster` (`lib/seo/doctor-hreflang.ts`, which carried a
`ponytail:` comment already flagging the sequential design as a latency risk
to revisit).

Measured against the live backend API (`api.myglobalhealth.online`), 6
sequential locale reads for one service took **3.7–4.6s** wall-clock;
resolving the same 6 reads in parallel took **~0.7s** (3 repeated runs each).

Next.js 16 streams `<title>/<meta>/<link>` tags into the HTML body *after*
`</head>` when `generateMetadata()` isn't ready by shell-flush time, unless
the request's User-Agent matches `htmlLimitedBots` — a config Next ships with
a built-in default (`node_modules/next/dist/shared/lib/router/utils/html-bots.js`)
that does **not** match Screaming Frog's default UA string
(`Screaming Frog SEO Spider/x.x`). At ~4 seconds per cold render, Screaming
Frog's head-only, non-DOM extraction reliably lost that race and read the
metadata as absent/misplaced.

**Google distinction.** Googlebot's renderer is spec-compliant and documented
to handle Next's streamed metadata; nothing in this crawl or in our live
testing shows Google itself failing to read these canonicals. The verified,
Google-facing problem was **generateMetadata latency**, not a Google
extraction gap — so `htmlLimitedBots` deliberately does **not** add
Googlebot. It adds only `Screaming Frog SEO Spider`, whose extraction mode
genuinely cannot see streamed tags.

**Fix (shared mechanism, not per-URL):**
- `indexableServiceAlternates` / `doctorHreflangCluster`: `Promise.all` the
  per-locale reads instead of a sequential loop — the primary fix, verified
  ~5–6x latency reduction.
- `next.config.ts`: `htmlLimitedBots` extended with `Screaming Frog SEO Spider`
  on top of Next's complete, unmodified default list (verified programmatically
  that every default-covered bot — Bingbot, facebookexternalhit,
  Mediapartners-Google, AdsBot-Google, etc. — still matches; Googlebot's
  plain UA deliberately does not).

## 2. Canonicals — before/after

Before: 33/33 "missing" (an artifact of Screaming Frog's head-only canonical
extraction, not an absent tag — all 33 already had a correct, self-referencing
canonical, just positioned after `</head>` on a slow render). After the fix:
verified self-canonical, `index,follow`, in `<head>` for representative pages
in all 6 markets.

## 3. Hreflang missing return link (1 URL, from the issues overview)

Live-audited hreflang reciprocity across all 33 flagged URLs, all 58 published
doctor profiles, and all 24 country-homepage locale variants — found zero
persistent asymmetry. The one partial cluster found
(`portugal/pt/doctors/dr-tiago-miguel-figueira`, 5 alternates instead of 7) is
fully reciprocal on its own terms — `cs`/`ro` variants are genuinely
`noindex` on both sides, correctly excluded per
`isPublicDoctorRecordIndexable`.

**Classification: transient metadata-streaming / latency artifact.** The
same sequential-await race that broke `<head>` placement could shrink a
page's hreflang set by one entry on an unlucky single request. No new
hreflang was invented. Confirm clean on the focused recrawl (§10).

## 4. Internal redirects — `/book-online` → `/book`

Both flagged 3xx sources traced to the **same** place: the homepage hero
"Book a consultation" CTA on Ireland and Portugal only
(`app/[country]/[lang]/page.tsx`, `page?.ctaHref ?? bookHref`). `ctaHref`
lives on `PageContent` (Prisma), one row per `(countryId, pageKey)` with
**no locale column** — so every locale variant of a country's homepage
shares one hardcoded href.

Two-step production fix (`backend/scripts/fix-book-online-cta.ts`, then
`fix-book-online-cta-locale.ts`):
1. First pass corrected `/ireland/en/book-online` → `/ireland/en/book` and
   `/portugal/pt/book-online` → `/portugal/pt/book`. This closed the redirect
   but — caught in review — left every *other* locale of each homepage
   (`/ireland/pt`, `/portugal/en`, etc.) hardcoded into the country's
   default-locale booking flow.
2. Corrected to `ctaHref: null` on both rows, falling through to the
   already-locale-aware `buildBookHref({ country: slug, lang })`.

Verified live across all 12 locale variants (6 Ireland + 6 Portugal) — each
homepage's hero CTA now points at its own `/{country}/{lang}/book`. The
`/book-online` redirects themselves remain in place (308) for legacy/external
links.

## 5. Booking-parameter canonicals (94 URLs) — unchanged, verified correct

`/book?doctor=...` / `/book?service=...` — 94 URLs, all HTTP 200,
Non-Indexable, canonicalized to the clean `/{country}/{lang}/book`. No
combinatorial SSR crawl issue found. No action — this is the intended,
working consolidation.

## 6. Six noindex doctor profiles (+ `/cart`)

`/cart` stays `noindex` (correct, no action). Six doctor profiles, publication
gate = `validatePublicDoctorRecord` (`lib/content/publication-validation.ts`):
name, title, bio ≥120 chars, an `imcRegistration` or `medicalRegistrationUrl`,
plus `editorialChecklist.readyToIndex`.

| URL | Name | Blocker |
|---|---|---|
| `/czechia/cs/doctors/dr-gabriele-felici` | Dr Gabriele Felici | Thin/generic fallback bio (auto-generated "is a Doctor registered in Czechia" description — no authored profile content yet) |
| `/czechia/cs/doctors/dr-michael-nytra` | Dr Michael Nytra | Thin/generic fallback bio |
| `/czechia/cs/doctors/mudr-nataliya-kharlamova` | MUDr Nataliya Kharlamova | Thin/generic fallback bio |
| `/ireland/en/doctors/dr-arooj-iqbal-lodhi` | Dr Arooj Iqbal Lodhi | Thin/generic fallback bio |
| `/ireland/en/doctors/priscila-figueiredo` | Priscila Figueiredo | Editorial/compliance blocker — real, rich bio present, but page text explicitly states "Irish CORU registration in progress" |
| `/ireland/en/doctors/roney-carli` | Roney Carli | Missing registration — real bio present (Manual Therapist), but no registration number/verification URL on file |

All six correctly gated; none modified.

## 7. Robots-blocked auth routes / 6-locale booking hub — unchanged

`/account`, `/register`, `/login`, `/forgot-password` — robots-blocked,
untouched. No change made or needed.

## Tests / build

- `tsc --noEmit`: clean, twice (after each edit round).
- Focused: `lib/seo/doctor-hreflang.test.ts`, `lib/seo/hreflang.test.ts`,
  `tests/unit/metadata-separator-mojibake.test.ts` — 21/21 pass.
- Full suite (`vitest run`): 720/721 pass. The one failure
  (`tests/unit/portal-breadcrumb-routes.test.ts`, admin memberships
  breadcrumb route) is pre-existing and unrelated — predates this batch,
  touches no file this batch modified.
- `next build`: see commit/deploy log below.

## Files changed

- `frontend/next.config.ts` — `htmlLimitedBots`
- `frontend/app/[country]/[lang]/services/[serviceSlug]/page.tsx` —
  `indexableServiceAlternates` parallelized
- `frontend/lib/seo/doctor-hreflang.ts` — `doctorHreflangCluster` parallelized
- `backend/scripts/check-book-online-cta.ts`,
  `fix-book-online-cta.ts`, `fix-book-online-cta-locale.ts` — one-off
  production data fix + its read-only check
- `docs/audits/seo/screaming-frog-technical-indexation-2026-08-09.md` (this file)

## Remaining genuine technical blockers

- No GSC URL Inspection evidence yet on whether Google's *index* (as opposed
  to Google's crawler capability) currently reflects a wrong canonical/head
  state for any of the 33 URLs — that requires the GSC "Indexable URL Not
  Indexed" export called out as the next required input; not guessed here.
  See original task's item 11 and the standing plan doc
  `docs/plans/seo-indexation-plan-2026-07-28.md`.
- A real Screaming Frog recrawl (desktop app / CLI) of the 33 URLs has not
  been run from this environment — verification below used raw HTTP requests
  with Screaming Frog's default UA string as a proxy for its head-only
  extraction behavior, which is the mechanism the fix targets, but is not a
  substitute for an actual SF crawl.
