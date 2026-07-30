# Ireland specialist page — content-brief triage

Source: `GlobalHealth_IrelandSpecialists_ContentBrief.docx` (July 2026, v1.0).
Page: `/ireland/en/see-a-specialist` (route `specialist-consultation`, template all markets).

Every one of the brief's 29 items mapped to **where the string actually lives** and who
owns it. The brief's Dev/Content/CMS tags are editorial; this is the code reality.

Unlike the GP brief there is **no slug migration and no clean new frontend code** — the one
code item (review claim) already shipped. This page is almost entirely **DB PageContent +
Service rows**, plus a handful of genuine blockers.

Three buckets:
- **A — already done / code.** No DB run needed.
- **B — DB patch script.** `backend/scripts/patch-ireland-specialist-content.ts` — idempotent,
  dry-run default, matched-on-current-value. Run `--apply` after confirming the dry-run.
- **C — blocked / decision / human data.** Needs a clinical confirm, an external number, a
  go-live call, or per-country plumbing that doesn't exist yet.

Where each element renders (from `specialist-consultation/page.tsx`):
- H1 / paragraph / whoFor / whyChoose / FAQ / overview / disclaimer(full) / SEO → **DB PageContent**
  `SPECIALIST_CONSULTATION` / EN (the live values differ from both the i18n bundle and the
  neutral `service-hub-content` fallback, so the DB record is populated and wins).
- Hero bullets / stat bar / section H2 / team H2 → **global i18n** `specialistPage.*` (shared by every market).
- Card names / prices / durations → **DB Service** rows. Doctor registration → **DB Doctor** rows.
- Short disclaimer (the "GP-level" one, rendered ABOVE the specialist one) → **country-level**
  `CountryLegalProfile.shortDisclaimer`, shared by every IE page.
- Footer tagline → **country-level** `CountryFooter.tagline` (one row, shown on GP + specialist).
- Footer clinics → CMS `Country.isActive` list.

---

## The three "critical issues" callout (brief header)

| Issue | Reality | Bucket |
|---|---|---|
| 1 · GP-level disclaimer on specialist page | The GP text is the shared **country `shortDisclaimer`**, not (necessarily) the page's `disclaimerParagraphs`. Script removes it *if* it lives in the page record; otherwise it's a country-legal / page.tsx fix — see §9 below. | **B / C** |
| 2 · Paediatric "250 min" | Clinical DATA error. Script **detects + warns**, never guesses. Confirm 25 vs 50 min, fix in CMS. | **C** |
| 3 · "4.8/5 · 2,000+ reviews" | **Already done** — `specialistPage.hero.stat2` = "45,000 consultations in 2025" / "Reviewed on Doctify" in all 6 locales. | **A** |

---

## Bucket A — already done / no action

| # | Item | Note |
|---|------|------|
| 4 | Review claim `4.8/5 · 2,000+` → `45,000 consultations · Doctify` | Shipped with the GP brief across all 6 `common.json` locales (both hero blocks). Verified in `en/common.json`. |
| §1.4/1.5 | OG + Twitter title/description | Auto-covered: `generateMetadata` feeds `seoTitle`/`seoDescription` straight into `openGraph`/`twitter`, so B's SEO edits update them too. (Post-launch anyway.) |
| §1.3 | Canonical URL staging→prod | Code already builds `${getSiteUrl()}/…/see-a-specialist`. Resolves once `NEXT_PUBLIC_SITE_URL=https://myglobalhealth.online` is set on Railway (C-env, ops). |

---

## Bucket B — DB patch script (dry-run; `--apply` after review)

`backend/scripts/patch-ireland-specialist-content.ts` —
`node --import tsx scripts/patch-ireland-specialist-content.ts [--apply]`.
Dry-run runs inside a transaction and rolls back, printing real matched-counts.

| Brief | Item | Table.field |
|---|------|-------------|
| §1.1 | Title tag | `PageContentTranslation.seoTitle` (IE/SPECIALIST_CONSULTATION/EN) |
| §1.2 | Meta description | `PageContentTranslation.seoDescription` |
| §2.1 | H1 | `PageContentTranslation.heroTitle` |
| §2.2 + §10.2 | Paragraph below H1 **and** Final-CTA copy (drop "dermatology") | `PageContentTranslation.heroSubtitle` — one field feeds both |
| §3 | Overview `a clinician`→`a doctor`, `the` before IMC | `PageContentTranslation.intro` (substring) |
| §5 | Who-it's-for H2 | `PageContentTranslation.whoForTitle` |
| §item 21 | + physiotherapy bullet | `PageContentTranslation.whoForItems` (append if absent) |
| §7 | Why-GH H2 | `PageContentTranslation.whyChooseTitle` |
| §item 26 | Why-GH bullet 1 → IMC + numbers-on-profile | `PageContentTranslation.whyChooseItems[]` (matched) |
| §8.1 | FAQ price breakdown by specialty | `PageContentTranslation.faq[]` (matched by "cost from €89") |
| §8.2 | FAQ referral "not always"→"no referral required" | `PageContentTranslation.faq[]` (matched) |
| §8.3 | New direct-access FAQ (highest-intent query) | `PageContentTranslation.faq[]` (append if absent) |
| §9 | Remove GP-level disclaimer *if* in page record | `PageContentTranslation.disclaimerParagraphs` (filter para w/ "provided at GP level") |
| §4.2 | Card names ×5 (remove "in Ireland", trim "Specialist" on Nutrition/Physio) | `Service.name` + `ServiceTranslation(EN).name` |

**Not written by the script (intentional), surfaced in its output:**
- §4.3 Paediatric `250 min` — detected + warned. Clinical confirm → CMS.

---

## Bucket C — blocked / decision / human data

**C-1 · GP disclaimer source.** The short disclaimer above the specialist one comes from
`CountryLegalProfile.shortDisclaimer` (per-country, shared by GP + specialist + every IE page),
not the page record. If the dry-run reports "no 'GP level' text in disclaimerParagraphs", the
fix is one of:
  (a) give IE a specialist-neutral country `shortDisclaimer` (affects all IE pages — safest if
      the current one is GP-flavoured everywhere), or
  (b) suppress the country short disclaimer on the specialist page in `page.tsx` (the page
      already renders its own specialist `disclaimerParagraphs` below it).
Needs a call on which. Do **not** blank a country-wide legal string from a page script.

**C-2 · Paediatric 250 min.** `250` is a data-entry error (missing decimal / extra zero).
Patients see it before booking. Confirm 25 vs 50 with the clinical team, fix in CMS.

**C-23 · Silvia Alexandre Fernandes registration.** Add `Registered Nutritionist · INDI` **or**
`NTOI Member` — needs the actual register she holds. External data → CMS Doctor record.

**C-24 · Priscila Figueiredo CORU.** Physiotherapists are CORU-regulated (statutory; also a
Google Ads healthcare-policy requirement for allied health). Needs her CORU number → CMS.

**C-13 · Footer description.** `CountryFooter.tagline` is **one row per country**, rendered on
the GP page too. The brief's specialist-specific tagline ("…IMC-registered cardiologists,
neurologists…") would be wrong on the GP page (which the GP brief wants set to a GP tagline).
Pick a neutral IE tagline covering both services, or leave it — do not overwrite per-page.

**C-14 · Footer clinics.** Romania/Brazil are absent because `Country.isActive=false` —
activating a market is a go-live decision, never a footer script. Czechia→Czech Republic is the
`Country.name` rename already carried by `patch-ireland-gp-content.ts` (single source; not
duplicated here).

**C-i18n · Hero bullets / stat bar / section + team H2s (items 15,16,17,18,20,22).** All
global `specialistPage.*` i18n with `{country}` tokens, shared by every market:

| # | i18n key | Current | Brief wants | Why blocked |
|---|----------|---------|-------------|-------------|
| 15 | `hero.feature1*` | "Specialist care / Connect with experienced specialists online." | "IMC-registered specialists — Cardiology, Neurology, Paediatrics…" | IMC is IE-only (PT=OM, ES=colegio…) |
| 16 | `hero.feature2Title` **and** `hero.stat1Title` both = "Registered in {country}" | duplicate | delete one | true dedup, but global — needs a country-neutral replacement stat |
| 17 | `hero.stat3*` | "Trusted by thousands" | "No referral required — book directly today" | "no referral" is an IE-specialist claim; not universally true per market |
| 18 | `specialistConsultationsTitle` | "Specialist consultations available" | "…available online in Ireland" | country-neutral variant possible; literal needs per-country |
| 20 | `whoForTitle` on this page is **DB** → handled in B (§5); the i18n `whoForTitle` is the non-IE fallback | — | — | (already covered by B) |
| 22 | `doctorsSectionTitle` (+ code count prefix) | "{n} · Specialists in {country}" | "IMC-registered specialists available online in Ireland" (no count) | IMC + IE-specific; count is code-prefixed in `page.tsx` |

To honour these literally for IE, `PageContent` needs new per-country fields (hero
featureCards/trustStats + the two section titles) wired into `page.tsx` — a small schema+wiring
feature, same as flagged on the GP brief. Otherwise apply the country-neutral variants (16 dedup,
18) to the shared i18n. Scope separately if the exact IE wording is required.

**C-11 · "Duplicate CTA section" (§10.1).** `page.tsx` renders `<FinalCTA>` **once** (before the
disclaimers); there is no second CTA after it in code. Could not reproduce from source — verify
on the live page before acting (may be a rendered-artifact reading or a stale cache).

---

## KEEP — verified no change (brief ✅ items)

Breadcrumb, hero bullets 2–3 row 1, overview (bar the two-word fix), all five card
*descriptions*, whyGH bullets 2–6, FAQs 1/4/5/6, the correct specialist disclaimer, the IMC
doctor cards (Omar, Farooq, Ibrahim, Irfan). No action.
