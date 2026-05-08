# Operational Readiness & Index Release Plan

This document defines what must be **operationally confirmed** before page groups move from **draft / `noindex`** to **public indexing**. It reflects the **current codebase behaviour** and **does not invent facts** (pricing, legal jurisdiction, credentials, or workflows must come from clinic operations, counsel, or authoritative registers—not from this file).

## How indexing works today (implementation)

| Surface | Primary gate |
|--------|----------------|
| Ireland general service detail (`/ireland/[serviceSlug]`) | `validatePublicServiceRecord` must produce **no validation errors** (`shouldNoindex === false`) **and** `Service.editorialChecklist.readyToIndex === true`. Otherwise metadata sets `robots: { index: false, follow: true }`. |
| Ireland specialist service detail (`/ireland-specialist-consultations/[serviceSlug]`) | Same pattern as general services. |
| Doctor profile (`/ireland-team/[doctorSlug]` and other `*-team/[doctorSlug]`) | `validatePublicDoctorRecord` must pass **and** `Doctor.editorialChecklist.readyToIndex === true`. Otherwise `noindex`. |
| Public blog article (`/post/[slug]`) | Driven by **`frontend/data/blog-posts.ts`** (static). Articles without a non-empty `reviewer` return **404**. Metadata uses `validateAdminBlogPayload`; failures → `noindex`. **`blogPosts` is currently an empty array** → `/blog` is `noindex` and no articles are served. (**Admin `BlogPost` rows in the database are not wired to this route** until product connects CMS → public blog.) |
| Home health test detail (`/home-health-tests/[testSlug]`) | **`robots.index` is hard-coded `false`** in route metadata (always `noindex` until product changes this). |
| Legal routes (`/privacy`, `/legal-notices`, `/term-and-conditions`, `/return-and-refund-policy`, etc.) | Explicit **`robots: { index: false, follow: true }`** on several templates pending legal sign-off. |
| Non–Ireland country stubs (`/home-pt`, `/general-consultation-pt`, …) | Many templates already force **`noindex`**. |

Publication checks live in `frontend/lib/content/publication-validation.ts` (service duration, starting price + currency, emergency wording, online-care limits, prescription/referral/certificate boundaries, blocked placeholder language, etc.).

**Rules for this programme**

- Do **not** set `readyToIndex: true` automatically in admin or seed data; it is an explicit **human release decision** after operational sign-off.
- **Pricing**: treat displayed amounts as **conditional** until commercially and clinically confirmed against the live source of truth (see Wix verification below).
- **Legal approval** is separate from **editorial** approval; **clinical review** is separate from **copywriting**.

---

## Release checklists by page group

### Ireland services

Applies to each **`Service`** row for Ireland (`country.code === "ie"`) that has a public URL (e.g. `/ireland/...`, `/ireland-specialist-consultations/...`, prescription listing flows, etc.). Repeat **per service record**.

| Checkpoint | Required before index |
|------------|----------------------|
| `durationMinutes` | Confirmed against operational booking rules (and matches what patients see). |
| `basePriceCents` | Confirmed **starting** price; note taxes/fees/delivery separately if applicable. |
| `currencyCode` | Confirmed (typically `EUR` for Ireland—verify). |
| Clinician / service scope | Written scope of what the online consult covers and excludes; aligned with clinical governance. |
| Emergency boundary | **`detailBody`** must include urgent/emergency guidance per `publication-validation` (not optional for passing validation). |
| Prescription / referral / certificate limits | Boundary language present where relevant (`GENERAL`, `SPECIALIST`, `PRESCRIPTION` kinds). |
| Final index decision | Record owner + date; only then set `editorialChecklist.readyToIndex === true` **after** validation passes. |

**Appendix A** lists Ireland service slugs seeded from the Wix-aligned import script (`backend/prisma/wipe-and-import-wix.ts`) for inventory tracking. Operational owners should reconcile **each row** in admin with [https://www.myglobalhealth.online/general-consultation-ie](https://www.myglobalhealth.online/general-consultation-ie), [https://www.myglobalhealth.online/specialty-ie](https://www.myglobalhealth.online/specialty-ie), [https://www.myglobalhealth.online/online-prescription](https://www.myglobalhealth.online/online-prescription), [https://www.myglobalhealth.online/home-health-test](https://www.myglobalhealth.online/home-health-test), and related pages.

---

### Doctor profiles

Repeat **per doctor** with a public profile slug.

| Checkpoint | Required before index |
|------------|----------------------|
| Verified registration number | **`imcRegistration`** (or equivalent) verified against the relevant register; stale numbers treated as **blocking**. |
| Verification URL | **`medicalRegistrationUrl`** or established procedure linking to a **primary-source** verification page (operational choice—not invented here). |
| Specialties | Correct **`DoctorSpecialty`** links (categories); aligned with how the clinician is presented on Wix / in contracts. |
| Languages | **`languages[]`** complete and accurate. |
| Availability note | Patient-facing availability / coverage statement (may live in bio or a dedicated operational field when added). |
| SEO fields | **`seoTitle`**, **`seoDescription`** reviewed; bio length and quality must satisfy `validatePublicDoctorRecord`. |
| Final index decision | **`editorialChecklist.readyToIndex === true`** only after clinical/compliance sign-off. |

---

### Blog articles

Two tracks exist until unified:

1. **Public site today**: `frontend/data/blog-posts.ts` (empty → nothing indexable).
2. **Database**: `BlogPost` model supports `reviewerDisplayName`, `lastReviewedAt`, `editorialChecklist`, etc.—wire-up to public routes is a **product** readiness item.

Per **published** article (once surfaced publicly):

| Checkpoint | Required before index |
|------------|----------------------|
| Reviewer name | Human reviewer identified (distinct from author where applicable). |
| Reviewer credential | Credential suitable for **medical/educational** positioning (operational definition). |
| `lastReviewedAt` | Set in CMS when using DB-backed posts; or equivalent in static model. |
| Final editorial approval | Record sign-off (legal/marketing/clinical as per content risk). |
| Internal links verified | Links resolve; prefer relative `/...` paths consistent with templates. |
| Final index decision | Pass `validateAdminBlogPayload` (or stricter bar) before allowing `robots` index. |

---

### Country pages

Per **`Country`** (Ireland, Portugal, Spain, Czechia, Romania) and its patient-facing hubs (`/home-*`, `/general-consultation-*`, `/specialty-*`, team pages).

| Checkpoint | Required before index |
|------------|----------------------|
| Local clinician roster | Country team reflects **active** clinicians and roles; profiles gated as above. |
| Pricing confirmation | Country currency and price lists confirmed (`PricingPlan`, service prices). |
| Language support confirmation | Matches `CountryLocale` / published claims. |
| Prescription / referral workflow confirmation | Country-specific rules documented (especially prescription and certificate flows). |
| Country-specific metadata | Titles/descriptions accurate; robots strategy intentional for stub vs live markets. |
| Final index decision | Documented owner for flipping from stub `noindex` to indexable hub pages. |

---

### Legal pages

Per route (e.g. Privacy, Terms, Legal Notices, Return/Refund).

| Checkpoint | Required before index |
|------------|----------------------|
| Legal entity | Correct trading entity name and registration details **inside** the page body (after counsel review). |
| Jurisdiction wording | Governing law / venue clauses confirmed by counsel. |
| Effective date | Clearly stated version date for each publication. |
| Legal approval owner | Named approver (role + date). |
| Final index decision | After approval, remove or relax route-level `noindex` **only** via controlled release (code + content change). |

---

## Master readiness table

Use one row per **record group** or **policy surface**. Expand in CMS/admin or tickets per slug.

| Page/Record | Current Status | Missing Operational Fields | Owner Needed | Can Index? | Next Action |
|-------------|----------------|------------------------------|--------------|------------|-------------|
| Ireland general consultations (`/ireland/[slug]`) | DB-backed services; template shows editorial notice when gated | Rich `heroTitle` / `heroDescription` / `detailBody` passing validation; clinical scope; **`readyToIndex`** explicit approval | Clinical ops + Medical director + Pricing | **No** (until checklist complete) | Reconcile each slug with Wix IE general page; fill CMS; run validation |
| Ireland specialist consultations (`/ireland-specialist-consultations/[slug]`) | Same gate pattern as general | Emergency/limit/boundary copy where missing; **`readyToIndex`** | Clinical ops + Specialty lead | **No** | Same as above vs Wix `/specialty-ie` |
| Ireland online prescription services (`ServiceKind.PRESCRIPTION`) | Prices/durations seeded from script | Scope, contraindications, prescribing limits text; **`readyToIndex`** | Prescribing governance + Medical director | **No** | Confirm vs Wix `/online-prescription`; extend bodies |
| Ireland health tests (`ServiceKind.HEALTH_TEST`) | Listed; detail route exists | Many lack **`durationMinutes`** → validation errors if ever routed like consult services; **`readyToIndex`** | Lab ops + Clinical | **No** (detail route also hard-coded **noindex**) | Decide product behaviour: keep `noindex` or implement release gates |
| Ireland home delivery | **`PricingPlan`** rows exist; **no `HOME_DELIVERY` services** in seed script | Service copy, fees, postcodes, SLA; route strategy | Ops + Legal | **No** | Define public URLs + content model |
| Doctor profiles (all countries with team routes) | API merges doctor rows; short seed bios likely **fail** bio length validation | Expanded bios; verification URL policy; **`readyToIndex`** | Clinical + Compliance | **No** | Complete profiles; verify IMC/register entries |
| Public blog (`/blog`, `/post/[slug]`) | **Empty static list**; DB posts unused publicly | Reviewer, credential, review dates, wiring CMS → site | Editorial + Medical review | **No** | Choose CMS source; populate; verify links |
| Country hub — Ireland | Listing metadata allows index by default unless overridden | Roster/pricing/language/workflow confirmations documented | Country GM + Ops | **Only hubs approved for launch** | Explicit robots strategy if stubs must stay dark |
| Country hubs — PT / ES / CZ / RM | Several **`noindex`** stubs | Full roster/pricing/local workflows | Country leads | **No** (stubs) | Complete country packs before lifting `noindex` |
| Privacy (`/privacy`) | Template + **`noindex`** | Legal entity, jurisdiction, effective date, counsel approval | Legal counsel | **No** | Final copy + approval → planned metadata update |
| Terms (`/term-and-conditions`) | **`noindex`** | Same as privacy | Legal counsel | **No** | Same |
| Legal notices (`/legal-notices`) | **`noindex`** | Same | Legal counsel | **No** | Same |
| Return/refund (`/return-and-refund-policy`) | **`noindex`** | Same | Legal counsel | **No** | Same |
| Cookies / GDPR legacy aliases | Mixed routes exist | Consolidate duplicate policies; approval | Legal + SEO | **No** | Inventory duplicates (`/privacy-policy`, `/cookies-policy`, etc.) |

---

## Appendix A — Ireland service slug inventory (import script source)

Slugs are derived with `toSlug()` in `backend/prisma/wipe-and-import-wix.ts`. Confirm **live** slugs in admin after edits.

**General (`ServiceKind.GENERAL`, excluding hub rows)**

`medical-consultation`, `pain-management-consultation`, `travel-consultation`, `online-sexual-health-and-sexology-consultation`, `self-referral`, `diabetes-consultation`, `sick-leave`, `paediatric-primary-care-consultation`, `general-practice-family-medicine-consultation`, `respiractory-infections`, `hypertension-consultation`, `driving-license-medical-certificate`, `treatment-refill`, `weight-loss-consultation`, `mental-health-assessment-consultation`, `referral-consultation`, `migraine-consultation`, `aesthetic-medicine-online-consultation`

**Specialist (`ServiceKind.SPECIALIST`)**

One row per `wixSpecialties` entry (slug pattern `…-consultation`, e.g. `cardiology-consultation`, `pediatric-consultation`, …).

**Prescription (`ServiceKind.PRESCRIPTION`)**

Examples: `hair-loss-prescription`, `hay-fever-prescription`, … (full list from `wixOnlinePrescriptionServices` in the same file).

**Health tests (`ServiceKind.HEALTH_TEST`)**

Examples: `general-health-blood-test`, `thyroid-home-blood-test`, … (from `wixHealthTests`).

---

## Wix verification (spot-check)

**Verified (May 2026):** [https://www.myglobalhealth.online/general-consultation-ie](https://www.myglobalhealth.online/general-consultation-ie) lists the same consultation titles, durations, and Euro amounts **as represented** in `wixGeneralServices` (e.g. Medical Consultation 15 min €45; GP/Family Medicine 20 min €60). Operational owners must still confirm **ongoing** pricing, VAT, and promotional rules **before** treating amounts as binding for indexing/marketing.

**Required operator action:** repeat slug-by-slug comparison for specialist, prescription, and health-test menus on Wix and attach evidence (screenshots + approval log) to each service row’s release ticket.

---

## Build validation (requested commands)

Executed from repo packages:

| Package | Command | Result |
|---------|---------|--------|
| Backend | `npm run typecheck` | Pass (`tsc --noEmit`) |
| Backend | `npm run build` | Pass (`tsc` emit) |
| Frontend | `npm run typecheck` | Pass (`tsc --noEmit`) |
| Frontend | `npm run build` | Pass (`next build`) |

---

## Platform readiness summary

| Dimension | Assessment |
|-----------|------------|
| **Structurally ready** | **Yes.** Typechecks and production builds succeed; publication validators and `robots` gates exist for key dynamic routes. |
| **Editorially seeded** | **Partial.** CMS/import populated many rows, but several records still use thin summaries/bodies; public blog static data is empty; DB blog is not exposed on `/post`. |
| **Operationally blocked** | **Yes.** Default posture requires **`readyToIndex === true`** plus passing automated publication validation for services/doctors; legal routes remain **`noindex`**; health-test detail is intentionally **`noindex`**. |
| **Safe from accidental indexing** | **Mostly yes for high-risk surfaces** (legal pages, non-IE stubs, gated dynamic consult/doctor URLs, empty blog). **Residual risk:** country/marketing templates without explicit `noindex` may index—confirm intentional SEO policy before launch traffic. |

---

## Live PostgreSQL ↔ Wix verification

Run **`backend/prisma/verify-live-wix-db.ts`** to regenerate **`docs/live-wix-db-verification-report.md`** (see **`docs/live-wix-db-verification-plan.md`**).

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.1 | 2026-05-08 | Linked scripted live DB ↔ Wix verification. |
| 1.0 | 2026-05-08 | Initial plan from implementation review + Wix IE general consultation spot-check. |
