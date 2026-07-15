# Language & Locale Investigation — Findings and Remediation Plan

**Date:** 2026-07-16
**Status:** Investigation only — no code changed
**Symptom reported:** Selected language not consistent across the site. With English selected, some pages render English while others render Portuguese, Czech, or another language.

---

## Table of contents

1. [Architecture — how locale resolution works today](#1-architecture)
2. [Where the selected language is stored](#2-storage)
3. [Priority order as implemented](#3-priority-order)
4. [Admin Portal country configuration](#4-admin-country-config)
5. [Root cause of the mixed-language symptom](#5-root-cause)
6. [Complete issue list](#6-issue-list)
7. [Gap analysis vs expected behavior](#7-gap-analysis)
8. [Recommended fixes](#8-recommended-fixes)
9. [Safe implementation plan](#9-implementation-plan)
10. [Appendix: file reference index](#10-file-index)

---

## 1. Architecture — how locale resolution works today <a name="1-architecture"></a>

### Single resolution engine

`resolveLocale()` in `frontend/lib/i18n/resolve-locale.ts:19-46` is the single source of truth for picking a locale. Every surface calls it, but each surface supplies a **different subset** of its inputs — that subset difference is where inconsistency starts.

### Middleware

The Next.js middleware lives in `frontend/proxy.ts` (exported as `proxy()`, matched via `config.matcher` at line 415-419 — there is **no `middleware.ts`** in this repo). Per request it:

- Computes request context (`getRequestContext`, `frontend/lib/routing/get-request-context.ts:21-44`) — parses `/{country}/{lang}` from the path. Handles the country-code/locale-code collision (`pt`, `es`, `ro`, `de`, `cs` are both) by checking the **second** segment first.
- Stamps the resolved locale into the `x-gh-locale` request header (`proxy.ts:338-339`).
- **Re-stamps the `gh_locale` cookie from the URL's lang segment** whenever they differ (`proxy.ts:379-390`, commit `1cb7f2f1`). This is what keeps locale-less pages in sync after navigating a country page — and also what makes a shared link in another language silently overwrite the visitor's prior choice.

### Per-surface behavior

| Surface | Locale source | Files |
|---|---|---|
| Country pages `/[country]/[lang]/...` | **URL param only** + static-seed country default. Cookie/header deliberately ignored so the subtree stays statically generatable. | `frontend/app/(site)/[country]/[lang]/layout.tsx:43-117` (resolution at 75-78, intent comment at 24-31) |
| Global pages (`/`, `/about`, `/blog`, `/cart`, `/checkout`, …) | No `[lang]` segment. Header → cookie → Accept-Language → static-seed country default. | `frontend/app/(site)/(global)/layout.tsx:84-90`, `page.tsx:19-23` |
| Doctor portal | `getPageLocale()`: header → cookie → Accept-Language → `en`. Switcher in `PortalShell` writes cookie + `router.refresh()`. | `frontend/app/(doctor)/doctor/layout.tsx:73-75`, `frontend/components/portal-shell.tsx:395-401` |
| Patient/account portal | Same as doctor portal. | `frontend/app/(auth)/account/layout.tsx:63-68` |
| Admin portal | **No i18n at all.** `AdminShell` has zero locale references; all sidebar/notification labels are hardcoded English. English-only by construction. | `frontend/app/(admin)/admin/layout.tsx:58-99, 233-263`, `frontend/app/(admin)/admin/_components/admin-shell.tsx` |
| Backend content APIs | Accept optional `?locale=` (uppercase `LocaleCode`); default to the country/market default locale when absent. | `backend/src/routes/country-scoped.route.ts:53-57` |

### Translation bundles (frontend)

- `frontend/locales/{en,pt,es,cs,ro,de}/` × 12 namespaces (`common`, `doctor` (1118 keys), `account` (665), `subscription`, `home`, `auth`, `about`, `contact`, `faq`, `forms`, `legal`, `services`).
- Loaded server-side only, statically imported in `frontend/lib/i18n/load-locale.ts:4-91`; `loadLocaleBundle()` (93-110) does `bundleByLocale[locale] ?? bundleByLocale.en`.
- **Whole-file fallback only.** No per-key fallback anywhere: a key missing from a non-en JSON renders `undefined` → empty text, not the English string.

### Translation tables (backend)

- Pattern across all CMS tables: **base columns hold the default-locale copy; a `*Translation` row overrides for one other locale** (`@@unique([parentId, locale])`). Tables: `DoctorTranslation`, `DoctorMarketTranslation`, `SpecialtyTranslation`, `ServiceTranslation`, `ServiceLinkTranslation`, `SeoLandingPageTranslation`, `HealthTestTranslation`, `PlanTranslation`, `BlogTranslation`, `PageContentTranslation`, `ServiceFaqTranslation`, `HealthTestFaqTranslation`, `CountryDisclaimerTranslation`.
- Core resolver `backend/src/modules/shared/resolve-translation.ts`: requested-locale row → default-locale row → `null` (caller falls back to base columns). Deliberately never falls back to a third language.

---

## 2. Where the selected language is stored <a name="2-storage"></a>

**Only the `gh_locale` cookie.** There is no other persistence.

**Writers:**
- Middleware re-stamp from URL (`frontend/proxy.ts:384-390`).
- Client writes via `setClientLocaleCookie()` (`frontend/lib/i18n/get-client-locale.ts:21-24`), called from `LanguageSwitcher.tsx:113,134`, `CountrySwitcher.tsx:66`, `CountryEntryGate.tsx:204`.
- `CountryEntryGate.tsx:132-142` seeds the cookie from `navigator` language on first visit if absent.

**Readers (server):** `getPageLocale()` (`frontend/lib/i18n/get-page-locale.ts:5-12`); `(global)` layout/page; several API-call sites that thread locale to the backend (`frontend/lib/api/doctor-api.ts:459,640`, `me-subscription-server.ts:45`, `app/api/cart/items/route.ts:16`, `app/api/doctor/services/route.ts:9`).

**Readers (client):** `readClientLocale()` (`get-client-locale.ts:4-12`) — cookie only, defaults `en`, no URL/header awareness. Used by `CookieBanner.tsx:31` and `app/error.tsx:18`.

**Not stored:**
- **No DB field.** `model User` in `backend/prisma/schema.prisma` (lines 2423-2483) has no `locale`/`preferredLanguage` column. Every `locale` field in the schema belongs to CMS content models. Login restores nothing; logout doesn't touch `gh_locale` (persists across sessions on the same browser) but a new device/browser or cleared cookies resets to Accept-Language/`en`.
- No localStorage/sessionStorage usage for locale.

---

## 3. Priority order as implemented <a name="3-priority-order"></a>

`resolveLocale()` chain, first match wins:

1. **URL `[lang]` segment** (`explicitLocale`) — normalized to base subtag (`pt-BR` → `pt`), must be a supported code
2. **`x-gh-locale` header** (middleware-resolved)
3. **`gh_locale` cookie**
4. **Browser `Accept-Language`** (first supported entry)
5. **Country default locale** — from the **hardcoded seed** `frontend/data/countries.ts:46-122`, *not* admin config (see §4)
6. **Hard fallback `en`**

Caveats:
- Country pages supply only inputs 1 + 5. Portals supply only 2 + 3 + 4. Global pages supply 2 + 3 + 4 + 5.
- `CountrySwitcher.tsx:103-115` and `CountryEntryGate.tsx:193-206` intentionally replace the current language with the target country's `defaultLocale` when the target country doesn't support it.
- `SiteHeader.tsx:164-173` documents the intended chain: "URL > server-resolved locale (gh_locale cookie/Accept-Language) > last-country cookie > active country's default > en".

---

## 4. Admin Portal country configuration <a name="4-admin-country-config"></a>

**Schema** (`backend/prisma/schema.prisma`):
- `enum LocaleCode { EN PT ES CS RO DE }` (13-20) — fixed set; a 7th locale needs a migration.
- `Country.defaultLocale LocaleCode @default(EN)` (325).
- `CountryLocale { countryId, locale, isDefault }` (383-391) — per-country enabled locales.

**Admin UI** (`frontend/app/(admin)/admin/countries/_components/country-fields.tsx:97-138`): `defaultLocale` select + `supportedLocales` checkbox grid. Locale list hardcoded at line 10 (mirrors the enum manually).

**Server validation** (`backend/src/modules/countries/countries.service.ts:202-235`): enforces `defaultLocale ⊆ supportedLocales` on create/update; the UI hint is cosmetic, this check is the real gate.

**Critical finding — the admin value is partially dead:**
The frontend has two country lists:
- Static seed `frontend/data/countries.ts:46-122` (`ie→en`, `cz→cs`, `pt→pt`, `es→es`, `ro→ro`, `br→pt`), self-described as "transitional seed data … replace with DB reads".
- DB-merged list `getPublicCountriesMerged()` (`frontend/lib/content/get-public-countries.ts:119-152`) which fetches `/api/countries` and can override `defaultLocale`/`supportedLocales`, and synthesizes wholly admin-added countries (78-106).

The merged list feeds only the **UI** (entry gate, country switcher, header nav). All actual **resolution** call sites — `resolveCountry()` (`frontend/lib/routing/resolve-country.ts`), `CountryLangLayout` (`[country]/[lang]/layout.tsx:54`), `(global)/layout.tsx:89` — import `getCountryByCode` from the **static seed**. Consequences:

- Changing a country's default locale in the admin portal changes what the switcher offers but **not** what the server resolves.
- An admin-added country appears in the switcher but **404s** on `/[country]/[lang]` because the layout gates on the static seed (`layout.tsx:54-55`).

---

## 5. Root cause of the mixed-language symptom <a name="5-root-cause"></a>

Not one bug. Four independent causes stack; together they produce "English selected, some pages Portuguese/Czech":

### A. Market-translation masking (highest impact)

`backend/src/modules/doctors/doctors.service.ts` — `mergeDoctorMarketTranslation` (133-152), call sites at ~510-535 and ~715-742.

Per doctor, per request:
```
requestedLocale = locale ?? marketDefaultLocale
merged       = mergeDoctorTranslation(doctor, requestedLocale, marketDefaultLocale)        // correct localization
marketMerged = mergeDoctorMarketTranslation(merged, marketTranslations, requestedLocale, marketDefaultLocale)
```
The market step calls `resolveTranslation` **independently** on `DoctorMarketTranslation` rows. If a market row exists **only in the country's default locale** (e.g. one PT market SEO edit for a Portugal doctor, no rows for other locales), the default-locale fallback returns that PT row for **every** requested locale, and its non-null fields (`title`, `bio`, `seoTitle`, `seoDescription`) override the already-correctly-localized values from `DoctorTranslation` — even when `DoctorTranslation` had a perfect requested-locale row.

Net effect: a single default-language market edit becomes sticky across all locales for that doctor in that market. **This is the literal "selected English, page shows Portuguese" mechanism** on doctor listing/profile pages.

### B. Server-side country-default fallback with no signal

- `getPublicPage` (`backend/src/modules/pages/pages.service.ts:256-302`): exact `(country, pageKey, locale)` lookup; if missing, returns the **country-default-locale row whole**, as if it were the requested language. No "fallback happened" flag.
- `getPublicPageContent` (`backend/src/modules/page-content/page-content.service.ts:339-403`): per-field `requested?.[key] ?? fallback?.[key] ?? null` where fallback is the country-default row — can mix e.g. Czech fields into an English page wherever a requested-locale field is null.

So any CMS page/section with an incomplete translation renders in the **country's language, not the user's** — silently.

### C. Global route group is structurally English

`(global)` pages have no `[lang]` segment; several hardcode English regardless of resolved locale:
- `frontend/app/(site)/(global)/cart/page.tsx:47`, `checkout/page.tsx:29`, `checkout/cancelled/page.tsx:30`, `patient-upload/page.tsx:102`, `reviews/rate/page.tsx:123` — `GH2FlowHeader`/`GH2StatusPage` titles and step arrays ("Opening your cart", `["Cart","Checkout","Payment"]`, "Rate your care", …).
- `blog/page.tsx:127,142` — "Available now", "Verified by clinicians" badges.

Navigating country page (Portuguese) → cart (English) → back reads as "language keeps changing".

### D. Hardcoded strings inside locale-aware routes

- `frontend/app/(site)/[country]/[lang]/pricing/page.tsx:331-364` — `PlansArchPanel`: "Monthly care", "Renew or cancel anytime", "Secure payments", "Stripe protected", "Licensed doctors".
- `frontend/components/sections/DoctorFilters.tsx:117` — mobile filter-sheet title "Filters".
- `frontend/lib/content/doctor-directory.ts:180` — English fallback bio: `Licensed clinician available for online consultations in ${countryName}.`
- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx:928` — English placeholder on the booking form.
- English `aria-label`s never localized: `CountryMarquee.tsx:25`, `DoctorCarousel.tsx:166,190`, `DoctorsSection.tsx:82,98`, `FeaturedDoctor.tsx:234`, `HomeHero.tsx:294`, `MedicalDisclaimer.tsx:91`, `ServicesGrid.tsx:161,170`, `TrustMarquee.tsx:46`, `slot-picker-step.tsx:117`.
- `about/page.tsx:321` and `tests/[testSlug]/page.tsx:508` — literal `title="Frequently asked questions"` bypassing the existing `faq.json` namespace.

---

## 6. Complete issue list <a name="6-issue-list"></a>

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | **High** | Default-locale `DoctorMarketTranslation` row masks all other locales' correct `DoctorTranslation` content (§5A) | `backend/src/modules/doctors/doctors.service.ts:133-152` |
| 2 | **High** | Admin-configured `defaultLocale` not used by locale resolution — static seed wins everywhere that matters (§4) | `frontend/data/countries.ts:46-122`, `resolve-country.ts`, `[country]/[lang]/layout.tsx:54,77`, `(global)/layout.tsx:89` |
| 3 | **High** | CMS content silently falls back to country default language (whole-row and per-field) (§5B) | `pages.service.ts:256-302`, `page-content.service.ts:339-403` |
| 4 | **High** | No per-user language persistence — cookie only, device-scoped; login restores nothing | `backend/prisma/schema.prisma` `model User` (no locale field) |
| 5 | Medium | Admin portal completely unlocalized (hardcoded English, no locale plumbing) | `frontend/app/(admin)/admin/layout.tsx:58-99,233-263`, `admin-shell.tsx` |
| 6 | Medium | `(global)` flow pages hardcoded English (cart, checkout, patient-upload, reviews, blog badges) (§5C) | see §5C |
| 7 | Medium | Hardcoded strings inside `[lang]` routes (§5D) | see §5D |
| 8 | Medium | Patient account page bodies hardcoded English while the layout is localized ("My account", "Next appointment", "GHN active", "Quick path", …) | `frontend/app/(auth)/account/page.tsx:145,253-273` |
| 9 | Medium | No per-key i18n fallback — missing JSON key renders empty, not English. Live instance: 6 `subscription.pricing.trust_card{1,2,3}_{title,subtitle}` keys missing in all 5 non-en locales | `frontend/lib/i18n/load-locale.ts:93-110`, `get-common-locale.ts:18-20`, `locales/{cs,de,es,pt,ro}/subscription.json` |
| 10 | Medium | Admin-added countries appear in switcher (DB-merged list) but 404 on `/[country]/[lang]` (static-seed gate) | `[country]/[lang]/layout.tsx:54-55` vs `get-public-countries.ts:78-106` |
| 11 | Low | Country switch / entry gate replaces user language with target-country default when unsupported — by design, but with #4 the original choice is unrecoverable | `CountrySwitcher.tsx:103-115`, `CountryEntryGate.tsx:193-206` |
| 12 | Low | `CookieBanner` uses cookie-only `readClientLocale()` — English flash on first visit to a non-English country/lang URL until cookie is written; general server(URL)/client(cookie) mismatch class | `frontend/components/compliance/CookieBanner.tsx:31,36`, `get-client-locale.ts:4-12` |
| 13 | Low | Shared `pt.json` is PT-PT dialect; Brazil needs the `br:pt` override (currently uncommitted). Any future same-language market silently gets the wrong dialect | `country-doctors-copy.ts` comments 100-106, `navigation.ts` `NAV_OVERRIDES` |
| 14 | Low | Copy-override coverage gaps: `country-doctors-copy.ts` Spain has only `es:es` (other 5 locales generic; untranslated country name "Spain" flagged in comment 91-94); `country-home-copy.ts` covers Ireland only | `frontend/lib/content/country-doctors-copy.ts`, `country-home-copy.ts` |
| 15 | Low | Global pages render 6 languages (via `getPageLocale`) but declare English-only hreflang/canonical and no og:locale — metadata says one English page, reality is 6 languages | `(global)/about/page.tsx:22-28,88-89`, `contact/page.tsx` |
| 16 | Info | Legacy `String` vs `LocaleCode` enum typing inconsistency in older tables (`CountryLegalDocument.locale` at schema.prisma:3629) | `backend/prisma/schema.prisma` |
| 17 | Info | Admin locale list hardcoded in UI (`country-fields.tsx:10`), duplicated from Prisma enum | `country-fields.tsx:10` |

**Translation-file health:** all 12 namespaces × 5 non-en locales are key-complete except the 6 subscription keys in #9. No orphan keys.

**Git-state note:** the read/display APIs for bulk-translated CMS content are already committed and functional — the earlier working assumption that "locale API changes are uncommitted so translations can't show" is wrong. Current uncommitted frontend work is public-site SEO/copy/nav only (hreflang native-region fix, `NAV_OVERRIDES` `br:pt`, `country-doctors-copy` RO/ES/BR entries, `bookWithTemplate` key ×6 locales, doctor-card component plumbing). Untracked `backend/scripts/patch-*` files are one-off, dry-run-by-default DB write scripts. Nothing uncommitted touches portal i18n.

---

## 7. Gap analysis vs expected behavior <a name="7-gap-analysis"></a>

| Requirement | Status |
|---|---|
| 1. Country config provides default for new/unselected users | Partially works — but the default comes from the hardcoded seed, not admin config (#2). Admin edits have no effect on resolution. |
| 2. Manual selection takes priority over country default | Works while the cookie lives on that device. Middleware re-stamping the cookie from the URL means opening a shared link in another language silently overwrites the choice (intended behavior of commit `1cb7f2f1`, but user-visible). New device/cleared cookies → choice lost (#4). |
| 3. Selection consistent across pages/portals/sessions/refreshes | Broken by #1, #3, #5, #6, #7, #8, #9. Refresh/navigation on the same device is fine; cross-portal is fine (shared cookie); cross-device is not (#4). |
| 4. Country default doesn't continuously override selection | Page chrome respects selection; **content** overrides via #1 and #3 — the country's language leaks into CMS-driven content whenever a translation row is missing or a default-locale market row exists. |

---

## 8. Recommended fixes <a name="8-recommended-fixes"></a>

Priority order:

1. **Fix market-translation masking (#1).** In `mergeDoctorMarketTranslation`, apply the market row only when its locale matches the locale actually resolved at the doctor level (or resolve both tables against one shared resolved locale and only override same-locale). Single shared function — fixes all call sites (list, profile) at once.
2. **Wire admin `defaultLocale` into resolution (#2, #10).** Have `CountryLangLayout`, `(global)` layout, and `resolveCountry` consume the DB-merged country list (`getPublicCountriesMerged`) instead of the static seed. Edge middleware can keep the seed (edge constraint is documented); RSC layers can reach the API/DB. Also unblocks admin-added countries (fixes the 404).
3. **Add `User.preferredLocale` (#4).** Nullable `LocaleCode?` column + migration. Write on language switch when authenticated; seed the `gh_locale` cookie at login. New priority: URL > cookie > **user profile** > Accept-Language > country default > en.
4. **Per-key i18n fallback (#9).** In `loadLocaleBundle`, deep-merge each non-en bundle over the `en` bundle once per locale (module-level cache). Missing keys then render English instead of empty. Backfill the 6 `subscription.pricing.trust_card*` keys anyway.
5. **Hardcoded-string sweep (#6, #7, #8).** Extract to existing namespaces (`common`, `account`, `faq`), add keys across all 6 locales. Mechanical; batch per route group.
6. **Make the CMS fallback policy explicit (#3).** Decide: country-default fallback (current) vs `en` fallback vs return-null-and-hide-section. Whatever the choice, make `pages.service.ts` and `page-content.service.ts` consistent, and consider returning a `resolvedLocale` field so the frontend can surface/measure fallbacks.
7. **Lower priority:** CookieBanner takes a server-passed `locale` prop (#12); dialect strategy for shared-language markets (#13); Spain/other copy-override locale coverage (#14); global-page hreflang/og (#15); admin-portal localization (#5 — large, likely intentional to skip); generate admin locale list from the enum (#17).

---

## 9. Safe implementation plan <a name="9-implementation-plan"></a>

Each phase independently shippable. **Phases 1 + 2 alone eliminate the visible wrong-language symptom.**

### Phase 1 — Backend logic fixes (no schema change, no migration)
- Fix `mergeDoctorMarketTranslation` locale-linkage (#1).
- Align/decide fallback policy in `pages.service.ts` + `page-content.service.ts` (#3); add `resolvedLocale` to responses.
- Unit tests: doctor with default-locale-only market row must return requested-locale `DoctorTranslation` fields for other locales; page-content per-field mixing cases.
- Verify: Portugal/Spain doctor pages requested in `en` show English titles/bios.
- Risk: low — pure read-path logic, 3 service files.

### Phase 2 — Frontend resolution + fallback (no data change)
- Swap static-seed reads for DB-merged country list in `[country]/[lang]/layout.tsx`, `(global)/layout.tsx`, `resolveCountry` (#2, #10). Keep seed as offline/error fallback. Watch static-generation implications for the country layout (may need dynamic rendering or build-time fetch).
- Per-key deep-merge fallback in `load-locale.ts` (#9) + backfill 6 subscription keys.
- Verify: change a country default locale in admin → resolution reflects it; delete a locale key locally → English renders instead of empty.
- Risk: low-medium — touchpoint is layout-level; test all 6 country routes.

### Phase 3 — User language persistence (schema migration)
- Add `preferredLocale LocaleCode?` to `User`; migration via the established workaround (shadow DB broken — diff-from-live-DB + `migrate deploy`, run scripts with `--env-file=.env`).
- Write on authenticated language switch; on login, seed `gh_locale` cookie from profile when cookie absent (or always — product decision).
- Risk: medium — migration on live DB; column is nullable and additive, so rollback-safe.

### Phase 4 — String extraction sweep (content-only)
- Batch A: `[lang]` routes (pricing panel, filters, fallback bio, booking placeholder, FAQ titles, aria-labels).
- Batch B: `(global)` flow pages (cart/checkout/upload/reviews/blog).
- Batch C: patient account page bodies (`account.json` keys exist as a namespace already).
- Keys added to all 6 locale files per batch; no logic changes.
- Risk: low — mechanical; review non-en translations before merge.

### Explicitly deferred (needs product/owner decision)
- Admin portal localization (#5).
- CMS fallback policy choice in Phase 1 (#3) — country language vs English vs hide.
- Whether login always overwrites the cookie from profile, or only seeds when absent (Phase 3).
- Dialect strategy for shared-language markets (#13).

---

## 10. Appendix: file reference index <a name="10-file-index"></a>

**Resolution core**
- `frontend/lib/i18n/resolve-locale.ts:19-46` — priority chain
- `frontend/proxy.ts:330-390, 415-419` — middleware: header stamp + cookie re-stamp
- `frontend/lib/routing/get-request-context.ts:21-44` — path parsing, country/locale collision handling
- `frontend/lib/routing/resolve-country.ts:13-46` — country resolution (static seed)
- `frontend/lib/i18n/get-page-locale.ts:5-12` — server cookie/header reader
- `frontend/lib/i18n/get-client-locale.ts:4-24` — client cookie read/write

**Layouts / context**
- `frontend/app/(site)/[country]/[lang]/layout.tsx:43-117`
- `frontend/app/(site)/(global)/layout.tsx:84-90`
- `frontend/lib/content/get-site-context.ts:17-49`, `fallback-site-context.ts:7-34`
- `frontend/app/(doctor)/doctor/layout.tsx:73-75`, `frontend/app/(auth)/account/layout.tsx:63-68`
- `frontend/app/(admin)/admin/layout.tsx`, `frontend/app/(admin)/admin/_components/admin-shell.tsx`

**Country data**
- `frontend/data/countries.ts:46-122` — static seed (defaultLocale per country)
- `frontend/lib/content/get-public-countries.ts:29-152` — DB-merged list + admin-country synthesis

**Switchers**
- `frontend/components/layout/LanguageSwitcher.tsx:81-144`
- `frontend/components/layout/CountrySwitcher.tsx:47-122`
- `frontend/components/sections/CountryEntryGate.tsx:132-206`
- `frontend/components/layout/SiteHeader.tsx:164-173`, `MobileNav.tsx:88`

**Bundles**
- `frontend/lib/i18n/load-locale.ts:4-110`, `get-common-locale.ts:18-20`, `types.ts:1`
- `frontend/locales/{en,pt,es,cs,ro,de}/*.json` (12 namespaces)

**Copy overrides**
- `frontend/lib/content/country-doctors-copy.ts` (`OVERRIDES`, keyed `code:locale`)
- `frontend/lib/content/country-home-copy.ts` (`EXTRAS`/`BUNDLE`, IE only)
- `frontend/data/navigation.ts` (`NAV_OVERRIDES`, `br:pt`)

**Backend**
- `backend/prisma/schema.prisma:13-20` (enum), `316-391` (Country/CountryLocale), `model User` 2423-2483 (no locale field)
- `backend/src/modules/shared/resolve-translation.ts` — core fallback
- `backend/src/modules/doctors/doctors.service.ts:116-152, 510-535` — merge chain incl. masking bug
- `backend/src/modules/pages/pages.service.ts:256-302` — whole-row fallback
- `backend/src/modules/page-content/page-content.service.ts:339-403` — per-field fallback
- `backend/src/modules/countries/countries.service.ts:155-235` — country create/update validation
- `backend/src/modules/shared/locale-support.ts:20-34` — write-time locale guard
- `frontend/app/(admin)/admin/countries/_components/country-fields.tsx:10, 97-138` — admin UI

**SEO**
- `frontend/lib/seo/hreflang.ts:40-98` — hreflang/og:locale (native-region fix uncommitted)
- `frontend/app/(site)/(global)/about/page.tsx:22-28, 88-89` — English-only metadata vs multilingual render
