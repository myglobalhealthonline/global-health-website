# Ireland GP page — content-brief triage

Source: `GlobalHealth_IrelandGP_ContentBrief.docx` (July 2026, v1.0).
Page: `/ireland/en/gp-consultation-online` (template `general-consultation`, all markets).

Every one of the brief's 33 items mapped to **where the string actually lives** and
who owns it. The brief's Dev/Content/CMS tags are editorial; this is the code reality.

Three buckets:
- **A — code (DONE this session).** Committed frontend edits.
- **B — DB patch script.** `backend/scripts/patch-ireland-gp-content.ts` — idempotent,
  dry-run default, matched-on-current-value. Run `--apply` after the price call.
- **C — blocked / decision.** Needs a confirmation, a go-live call, or per-country
  plumbing that doesn't exist yet.

---

## Do before launch (priority order)

| # | Item | Bucket | Status / action |
|---|------|--------|-----------------|
| 1 | Slug `gp-appointment` → `gp-consultation-online` + 301 | **A** | ✅ done — see files below |
| 6 | Review claim `4.8/5 · 2,000+ reviews` | **C** | ⚠ **compliance** — false/unverifiable claim (EU Omnibus + Google Ads disapproval). Global i18n `gpPage.hero.stat2*`, shared by all 6 markets. **Recommend fixing now** (see C-6). |
| 7 | Card 1 price `€45` → `from €39` | **C** | Product-team confirm which price is canonical, then apply (C-7). |
| 4,5 | Title tag + meta description | **B** | Run patch script `--apply`. |
| 8 | Footer description (drop "across Europe") | **B** | In patch script (IE `CountryFooter.tagline`). |
| 9 | Footer clinics: Czechia→Czech Republic; +Romania,+Brazil | **B**/**C** | cz rename in script. **Romania/Brazil = market go-live decision, not a copy edit** (C-9). |
| 2,3,10 | Canonical/OG URL + footer GP link | **A** | ✅ done. Domain half needs `NEXT_PUBLIC_SITE_URL` prod value (C-env). |
| 28,29,30 | FAQ price + wait-time + new sick-cert FAQ | **B** | In patch script (GEO/AEO asset — highest content value). |
| 31 | Final-CTA "across Europe" | **A** | ✅ done. |

---

## Bucket A — code, DONE (frontend, `Dev-hassaan`, uncommitted)

Slug migration `gp-appointment` → `gp-consultation-online` (all markets; the rewrite is
`/:country/:lang/...`, so IE-safe and every market rides the same 301):

- `frontend/next.config.ts` — rewrite source → new slug; new **301** `gp-appointment`→`gp-consultation-online`; retargeted the `general-consultation` and `online-doctor-visit` legacy redirects.
- `frontend/app/(site)/[country]/[lang]/general-consultation/page.tsx` — canonical URL (l62), hreflang path (l74), breadcrumb + MedicalProcedure JSON-LD URLs (l207,215).
- `frontend/components/layout/SiteHeader.tsx` (l62), `MobileNav.tsx` (l110), `SiteFooter.tsx` `CARE_FIELDS` (l56) — nav/footer links → new slug (**item 10**).
- `frontend/app/sitemap.ts` (l34), `frontend/app/llms.txt/route.ts` (l29) — machine URLs.
- `frontend/app/(admin)/admin/page-content/_components/section-preview.tsx` — doc comment.

"across Europe" (**item 31**):
- `frontend/components/sections/FinalCTA.tsx` (l103) — fallback body → "Browse licensed, nationally-registered doctors…" (the GP page renders FinalCTA with no i18n prop, so this fallback is what visitors see).
- `page.tsx` (l381) — Doctify strip headline `"Trusted by patients across Europe"` → country-aware `"Trusted by patients in {country}"` (bonus; hardcoded "across Europe" on the page, not in the brief).

`tsc --noEmit` green.

> Not touched: the many other global "across Europe" strings (home hero, about, contact, tests, page-seo, home.json) — out of this brief's scope. See grep in session notes if a site-wide sweep is wanted.

---

## Bucket B — DB patch script (ready; `--apply` when price confirmed)

`backend/scripts/patch-ireland-gp-content.ts` — `node --import tsx scripts/patch-ireland-gp-content.ts [--apply]`.
Dry-run runs the updates inside a transaction and rolls back, printing real matched-counts.

| # | Item | Table.field |
|---|------|-------------|
| 4 | Title tag | `PageContentTranslation.seoTitle` (IE/GENERAL_CONSULTATION/EN) |
| 5 | Meta description | `PageContentTranslation.seoDescription` |
| 11 | Paragraph below H1 | `PageContentTranslation.heroSubtitle` |
| 15 | Overview `Clinicians`→`Doctors` | `PageContentTranslation.intro` (substring replace) |
| 23 | Who-it's-for H2 | `PageContentTranslation.whoForTitle` |
| 24 | +mental-health bullet | `PageContentTranslation.whoForItems` (append if absent) |
| 27 | Why-GH H2 | `PageContentTranslation.whyChooseTitle` |
| 28 | FAQ 2 price answer | `PageContentTranslation.faq[]` (matched by current answer) |
| 29 | FAQ 5 wait-time answer | `PageContentTranslation.faq[]` (matched by current answer) |
| 30 | New sick-cert FAQ | `PageContentTranslation.faq[]` (append if absent) |
| 17–20,22 | Card 1/2/3/4/5 names | `Service.name` + `ServiceTranslation(EN).name` |
| 21 | Card 4 copy (Family Medicine→GPs) | `Service.summary` + `ServiceTranslation(EN).summary` |
| 26 | Dr Maklad `Medical Doctor`→`GP` | `Doctor.title` (+ any IE `DoctorMarketTranslation.title`) |
| 8 | Footer description (IE) | `CountryFooter.tagline` (IE upsert) |
| 9a | Czechia→Czech Republic | `Country.name` where `code=cz` |

**Item 32 (OG/Twitter title+desc) is auto-covered:** `generateMetadata` feeds `seoTitle`/
`seoDescription` straight into `openGraph`/`twitter`, so setting 4+5 updates them too.

---

## Bucket C — blocked / decision needed

**C-6 · Review claim (🔴 critical, compliance).** `gpPage.hero.stat2Title` = `"4.8/5 patient
rating"`, `stat2Subtitle` = `"From 2,000+ verified patient reviews."` — global i18n in all 6
locale files (`en/pt/es/cs/ro/de common.json`). The brief's replacement (`"45,000 consultations
in 2025 · Reviewed on Doctify"`) is an IE-specific volume claim that can't live in shared copy.
The fabricated `4.8/5 · 2,000+` is a genuine liability everywhere. **Recommended: replace the
shared stat with a country-neutral, verifiable claim** (e.g. `"Independently reviewed" /
"Verified patient reviews collected on Doctify."`) across all 6 locale files — removes the risk
site-wide without a false number. Say the word and I'll do it. If the literal "45,000
consultations" is wanted for IE only, that needs a per-country hero-stat field on `PageContent`.

**C-7 · Card 1 price €45 → from €39.** `Service.basePriceCents`. Brief itself says *"confirm with
product team which price to display."* Once confirmed: set the IE GENERAL card's `basePriceCents`
(and check the card renders a `from` prefix). One-line update or admin edit — deliberately kept
out of the script so no price ships unconfirmed.

**C-9 · Romania/Brazil footer clinics.** Footer clinics come from the CMS active-country list
(`Country.isActive`). They're "missing" because those markets aren't activated. **Activating a
country makes the whole market live** — a go-live decision, never a footer-copy script. Confirm
launch intent, then flip via admin.

**C-12/13/14/16/25 · Hero bullets + section H2s.** All global i18n with `{country}` tokens:

| # | i18n key | Current | Brief wants | Why blocked |
|---|----------|---------|-------------|-------------|
| 12 | `gpPage.hero.feature3*` | "Quick appointments" | "Same-day … within hours not weeks" | country-neutral → safe to change globally if desired |
| 13 | `gpPage.hero.stat1*` | "Registered in {country}" | "IMC-registered — Irish Medical Council" | **IMC is IE-only** (PT=OM, ES=colegio…) — can't globalize |
| 14 | `gpPage.hero.stat3*` | "Trusted by thousands" | "Only multilingual online GP clinic in Ireland" | IE-specific claim |
| 16 | `gpPage.gpConsultationsTitle` | "GP consultations available" | "GP services available online in Ireland" | country-neutral variant possible; literal needs per-country |
| 25 | `gpPage.doctorsSectionTitle` | "Doctors in {country}" | "IMC-registered GPs available online in Ireland" | IMC + IE-specific |

To honour these **literally for IE**, `PageContent` needs new per-country fields (hero
featureCards/trustStats + the two section titles) wired into `page.tsx`. That's a small
schema+wiring feature — scope it separately if the brief's exact IE wording is required. Otherwise
apply the country-neutral variants (12, 16) to the shared i18n.

**C-env · Prod domain.** Canonical/OG absolute URLs (items 2,3) resolve correctly once
`NEXT_PUBLIC_SITE_URL=https://myglobalhealth.online` is set on Railway. Ops, not code.

**C-33 · Footer Care links liveness.** Confirm `see-a-specialist` and `lab-tests` pages are live
per market; remove the footer link if a market doesn't offer them.

---

## KEEP — verified no change (brief §2,4,5,7,8,9,10)

H1, breadcrumb, hero bullets 1–2 row 1, FAQs 1/3/4/6/7/8, medical disclaimer, all "✅ KEEP"
card descriptions, why-GH bullets, CTA label/H2. No action.
