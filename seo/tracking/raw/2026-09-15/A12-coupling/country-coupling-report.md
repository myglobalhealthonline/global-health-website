# A12 — One-country code inside shared templates

Evidence date 2026-09-15. Repo read-only; production reads were public HTTP GET
against `https://www.myglobalhealth.online` (the apex 301s to `www`).

## (a) Counts

Locator produced 4,137 hits. After the filter (logic-bearing `context_kind`, plus
expression-shaped `other` rows in the runtime dirs; content payloads under
`backend/scripts/data/**` and prose strings dropped) and after merging adjacent
lines of one branch into one row:

| | count |
|---|---|
| Raw locator hits | 4,137 |
| Logic-kind hits (whole repo) | 533 |
| Logic-kind hits in runtime dirs (scripts excluded) | 309 |
| **Kept rows in `country_coupling.csv`** | **70** |
| Kept rows verified against production | 44 |
| Kept rows with `blocks_new_country = yes` | 57 |

By `kind`: one_market_content 39 · legitimate_market_rule 24 ·
cache_loader_routing_special_case 4 · applied_script_or_draft_module 2 · test_or_dead 1.

By template fix (12 fixes, `coupling_issues.csv` CPL-001 … CPL-012):

| TF | title | rows | priority |
|---|---|---|---|
| TF-01 | Home hero/SEO: code-owned copy module + `preferIrelandExtras` precedence literal | 7 | P1 |
| TF-02 | Localized country name gated to Brazil only | 6 | P1 |
| TF-03 | Three per-country static-page-SEO modules, three signatures | 15 | P1 |
| TF-04 | Locale-bundle editorial overrides hardcoded to ro/es/br | 4 | P1 |
| TF-05 | Tool market copy: three named JSON imports + 1,300 inline Brazil lines | 2 | P3 |
| TF-06 | Clinical-approval gate named after one market, gating three | 4 | P0 |
| TF-07 | Payments/invoicing market rules as inline switches | 6 | P1 |
| TF-08 | Identity/tax/address booking fields + GA4 market map as literals | 5 | P2 |
| TF-09 | One-market copy scattered across nine mechanisms | 9 | P2 |
| TF-10 | Seed country array + the six-locale list duplicated five times | 9 | P2 |
| TF-11 | 42 country-named modules, 152 country-named scripts | 2 | P3 |
| TF-12 | Sitemap lab-test detail loop missing the page's feature gate | 1 | P0 |

Three findings are live production defects, not just future risk:

1. **`country-home-copy.ts` `BUNDLE` is dead for Ireland.** Keys are `"IE:en"…"IE:de"`;
   the lookup key is `` `${code}:${locale}` `` with a lowercase code. Checked on
   `/ireland/en`: `Named doctors.` 0 hits, `No anonymous rotas.` 0 hits,
   `doctors available` 0 hits. Six locale blocks of reviewed Ireland copy (team H2,
   stats-band labels, how-it-works bodies, final CTA) render nothing. The uncommitted
   working-tree change normalising `BUNDLE` lookups fixes exactly this; not touched here.
2. **`/czechia/cs/doctors/dr-ahmed-maklad` serves
   `<title>MUDr. Ahmed Maklad | Praktický lékař online v Česku · Czechia</title>`** —
   the English seed name inside a Czech title, because `doctor-profile-page.tsx:211`
   localizes the country name only when `code === "br"`. The correct generic expression
   already sits five lines below it, on line 216.
3. **84 sitemapped Ireland lab-test URLs 404** — see section (e).

---

## (b) Target model — recommendation

**Recommendation: CMS/database, admin-editable, for content; a single per-country
config file is the wrong home for it.** Effort **21–27 developer-days** for the
whole migration; the next country then costs **2–3 days** instead of the current
**8–12**.

This is a hybrid only in one narrow sense, so state the split exactly:

| Goes in the **database** (admin-editable, no deploy) | Goes in **code** (deploy, developer) |
|---|---|
| Home hero title/subtitle/bullets/price badge, SEO title/description, OG title/description (TF-01) | `Country` scalar **fields** that flip behaviour: `homeCopySource`, `stripeAccountKey`, `checkoutPaymentMethods`, `invoiceIssuer`, `clinicalApprovalMode`, `requiresIdentityDocument`, `identityDocumentLabel`, `taxIdLabel`, `addressFields`, `reviewWidget` (TF-01/07/08/09) |
| Static-page titles/descriptions/H1 for about, blog, book, careers, contact, faq, legal, press, pricing (TF-03) | Third-party **integration modules** selected by those fields — `pt-invoicexpress.service.ts` is correct as a country-named module (TF-07) |
| Doctor-profile FAQs and their approval state; service/FAQ/link clinical-approval records (TF-06) | The locale JSON bundles under `frontend/locales/<lang>/*.json` — these are *language* files, translated in a workflow, not per-market rows |
| Contact offices, phones, hours; certification/authority logos (TF-09) | Market override JSON — `lib/i18n/market-overrides/<code>.json` and `lib/tools/market-copy/<code>.json` — for the copy that must be diffable and reviewed in a PR (TF-04/05) |
| Feature flags (`enabledFeatures`) — already correct, keep as the model | |

Why the database and not "one config file per country with one shared loader":

- **Who edits, and deploy cost.** The owner already edits `PageContent`, services,
  doctor profiles, country features and legal profiles in `/admin`. Today's home hero
  and static-page SEO for six markets live in three TS modules he cannot touch, and
  every change to `country-home-copy.ts`, `*-static-page-seo.ts`, `country-contact.ts`
  or `country-certification-logos.ts` is a frontend build + Railway deploy. The
  concrete cost is in the file's own comment: Czechia's homepage fell through to the
  generic *"Medicína kdykoliv"* tagline until a developer added `"cz:cs"` to a literal.
- **Clinical approval.** This is the deciding argument. `reviewedRomaniaTransaction`
  already gates admin CMS writes for ro/es/br with state hashes; approval evidence
  (including *"verbal, reported by the owner"*) is stored as a source literal in an
  81KB file. Moving copy **into** the CMS puts it **behind** that gate; leaving it in
  code routes market copy around the only clinical-approval mechanism the product has.
  A config file cannot be gated this way.
- **Translation workflow.** `frontend/scripts/check-locale-keys.mjs` (wired into
  `pnpm typecheck`) enforces key parity across the six `locales/<lang>` folders. That
  is the right home for *language* strings and must stay in code. Market overrides are
  a different axis and belong either in the CMS (owner-authored) or in one
  auto-discovered JSON per country (reviewer-authored) — never as named imports in a
  loader, which is what `load-locale.ts` does today for exactly three markets.
- **Cache/revalidation already supports it.** `frontend/lib/api/client.ts` wires
  `next: { revalidate, tags }` whenever a caller passes them; `get-country-legal.ts`,
  `get-country-footers.ts` and `get-country-trust.ts` already tag per country
  (`country-legal:{code}`, `country-footer:{code}`, `SITE_CACHE_TAGS.countryDoctors(code)`)
  and `/admin` server actions already call `revalidateTag(..., "max")` on save. Adding
  home-copy and static-page-SEO rows needs **one new tag per country**, not a new
  caching design. `get-country-footers.ts` uses `revalidate: false` + a tag — the
  indefinite-cache-until-busted pattern that suits copy that changes rarely.
- **Effort for the next country.** Under the DB model a new market is admin rows plus
  one `locales/` review pass. Under the config-file model it is still a PR, a review
  and a deploy for every copy iteration — i.e. the current cost with tidier filenames.

Risks: (1) copy regression during migration — mitigated by byte-diffing the
2026-09-15 production baselines recorded per row in `country_coupling.csv`;
(2) an empty DB row blanking a page — keep the i18n template as the last fallback,
the way `isCountryFeatureEnabled` already treats an undefined feature list as "all on";
(3) CMS copy is not diffable — real, which is why tool copy and locale overrides stay
as per-country JSON in the repo (TF-04/TF-05): those were clinically reviewed line by
line and the PR diff is the review artefact; (4) widening the clinical gate — ship
`clinicalApprovalMode` in `shadow` first, as `MEDICAL_ACCESS_ENFORCE` was.

**Migration order** (each step is independently shippable and independently
revertable):

| # | Fix | Days | Why here |
|---|---|---|---|
| 1 | TF-12 sitemap gate | 0.5 | P0, one line, removes 84 sitemapped 404s |
| 2 | TF-02 localized country name | 0.5 | P1, deletes four branches, fixes a live Czech title |
| 3 | TF-01 home copy + case normalisation | 3 | P1, restores six dead Ireland copy blocks |
| 4 | TF-03 one `staticPageSeo` loader | 4 | Largest hit count; unlocks es/ro/br owned copy |
| 5 | TF-10 seed array → DB + one locale constant | 2 | Must precede any new-country work; also fixes `de` notifications |
| 6 | TF-04 market-override convention | 2 | Removes `brazilOnly()` from ~20 call sites |
| 7 | TF-06 clinical gate → table | 5 | P0 by impact but needs clinical sign-off; land after the copy moves |
| 8 | TF-07 payments fields | 3 | Blocks the 7th market's money routing |
| 9 | TF-08 booking/identity/analytics fields | 2 | Includes the silently-dropped GA4 events |
| 10 | TF-09 remaining one-market copy | 3 | Mechanical once 3 and 4 exist |
| 11–12 | TF-05 tool copy files; TF-11 script/module cleanup | 3 | Pure refactor / `git mv` only |

---

## (c) New-country checklist under the recommended model

**Data rows (admin, no deploy)**
- `Country` — code, name, slug, defaultLocale, bookingTimezone + the new behaviour
  fields (`homeCopySource`, `stripeAccountKey`, `checkoutPaymentMethods`,
  `invoiceIssuer`, `clinicalApprovalMode`, `requiresIdentityDocument`,
  `identityDocumentLabel`, `taxIdLabel`, `addressFields`, `reviewWidget`).
- `CountryLocale` — one row per supported locale, default first (Brazil's three-locale
  set is the precedent for a market that does not take all six).
- `enabledFeatures` (`/admin/country-features`) — `subscriptions` is strict opt-in;
  `health-tests` must be on before any lab-test content exists (see TF-12).
  Then `PricingPlan` + translations, but only if `subscriptions` is enabled.
- `Service` + `ServiceTranslation` + `ServiceFaq` + `ServiceLink` per locale;
  `Doctor` + `DoctorCountry` (chamber entity, registration number, URL) +
  `DoctorMarketTranslation` + `DoctorFaq`.
- `CountryLegalProfile` + trust translations — including the data-protection law name
  (Brazil needed a script to turn `GDPR`/`RGPD` into `LGPD`); `CountryTrust`
  (regulator name/URL, certification logos); `CountryFooterLink` /
  `CountryAuthorityLink` in categories `DOCTOR_REGISTRY`, `MEDICAL_REGULATOR`,
  `DATA_PROTECTION`, `HEALTH_AUTHORITY`, `MEDICINES`, `COMPLAINTS`.
- `PageContent` `HOME` per locale, plus the STATIC page rows once TF-03 lands.

**Locale JSON** — no new files unless the market brings a new *language*. If it does:
create `frontend/locales/<lang>/` with all 17 namespaces (`about, account, auth,
book-a-test, common, company, contact, corporate, doctor, faq, faq-markets, forms,
home, legal, services, subscription, tools`), add the code to
`frontend/lib/i18n/types.ts` `supportedLocaleCodes` (and, after TF-10, nowhere else),
and fill `common.countryNames` with the new country in **all** locales — that is the
key the whole TF-02 fix depends on.

**Images** — site logo / footer CTA / homepage hero are global slots
(`merge-ireland-home-media.ts`, misnamed). Per-market: certification and authority
logos only; the OG image subtitle is derived, not uploaded.

**Redirects** — only if the market has legacy URLs. `frontend/next.config.ts` holds 51
redirect rules today, all Wix-migration history.

**Sitemap** — automatic once the `Country` row exists, *provided* TF-12 has landed;
otherwise verify every feature-gated family (`/lab-tests`, `/book-a-test`,
`/see-a-specialist`, `/pricing`) against the page's own gate.

**Hreflang** — automatic per-country via `hreflangAlternates`. The tools cluster is
separate (`lib/tools/markets.ts`) and today reads the **seed array**, so until TF-10
lands a new market is silently absent from the global tool cluster.

**Analytics** — GA4 `market` value must equal the country slug; until TF-08 lands
`trackBookingEvent` drops every booking event for an unknown market.
**Admin settings** — country features, review destination (Google/Doctify/Trustpilot),
notification languages, Stripe keys (`STRIPE_SECRET_KEY_<CODE>` /
`STRIPE_WEBHOOK_SECRET_<CODE>`).

**Tests to run** — `frontend/tests/unit/seo-live-urls.test.ts`,
`frontend/lib/content/country-locale-matrix.test.ts` (note: not under `tests/unit/`),
`node frontend/scripts/check-locale-keys.mjs` (also run by `pnpm typecheck`),
`frontend/tests/unit/ireland-core-page-seo.test.ts` and `czechia-core-page-seo.test.ts`
as the per-market SEO regression pattern to clone, and
`backend/src/routes/authz-matrix.test.ts` after any TF-06 change.

---

## (d) Cleanup queue

`country_scripts_cleanup.csv` — 152 rows, none referenced from runtime:
**keep_as_runner 70** (9 already in `applied/`, 19 `data/` payloads, 25
legal-addendum HTML, 12 dry-run/rehearsal/storage runners, 5 misc) ·
**move_to_applied 51** one-shot `apply-/patch-/import-/seed-/backfill-/publish-/stage-`
writers · **archive 26** one-shot blog-article payloads under `scripts/content/blog-*` ·
**needs_owner_check 5** country-named writers with no verb prefix.

14 scripts were checked against production: 13 have their effect live (Brazil `LGPD`
on `/brazil/en/legal`; Ireland DPO + Prague HQ sentence on `/ireland/en/legal`; the
Romania weight-management title no longer duplicating Men's Health; the Brazil
test-request title trimmed; Czech career translations resolving at `/czechia/en/careers/…`;
the cz blog article, the two Ireland `/health/` landing pages, and Brazil's
R$150/R$250/R$300 plans all live). The one **no** is
`seed-ireland-randox-kits.ts` — its target `/ireland/*/lab-tests/*` pages are
sitemapped but 404 (see below). Nothing was moved or deleted in this run.

`country_modules.csv` — 42 modules. 17 are referenced from nothing at all; 21 are
draft/patch payloads that belong next to their runner, not in `backend/src/content`.
Not cleanup: `romania-clinical-review.ts` (live write-path gate for three markets,
imported by 12 services/routes), the `pt-invoicexpress` trio (legitimate
country-specific integration), and the brazil-consent modules (real market
requirement, wrong selector). `merge-ireland-home-media.ts` is a rename, not a
migration — only global asset slots, no Ireland logic.

---

## (e) Related finding — sitemap vs page feature gate

`frontend/app/sitemap.ts` gates the lab-test **hub** correctly at line ~528
(`isCountryFeatureEnabled(country, "health-tests")`), and
`frontend/app/[country]/[lang]/tests/page.tsx` calls `notFound()` on the same check —
but the lab-test **detail** loop at lines 191–201 iterates every country with no gate.

Measured 2026-09-15 on production:

- `sitemap.xml` holds 2,265 `<loc>` entries, 90 of them lab-test URLs.
- 84 are Ireland `/ireland/{en,pt,es,cs,ro,de}/lab-tests/{slug}` (14 tests × 6 locales).
  `/ireland/en/lab-tests/vitamin-d-test` → **404**. `/ireland/en/lab-tests` → **404**.
- 6 are Romania `/romania/{lang}/lab-tests` hub URLs → **200**.
- `/portugal/pt/lab-tests` and `/czechia/cs/lab-tests` → 404 and are correctly absent
  from the sitemap.

So every Ireland lab-test URL Google is asked to crawl is a 404, and the Ireland hub
that would link them does not exist either. Ireland's `health-tests` feature is off in
the live country overlay while the sitemap reads the **seed** `countries` array, whose
`enabledFeatures` is `undefined` and therefore treated as "all enabled" by the
backward-compat branch in `country-features.ts`.

Fix is one line (wrap the loop in the same guard), tracked as **CPL-012 / TF-12**,
P0. The durable version is to give `pushLocalized` an optional feature key so a route
and its sitemap entry can never disagree again — the same class of defect the
`exactLocalesForLegalType` work already fixed for `/legal/*`.
