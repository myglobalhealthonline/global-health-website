# Feature spec — per-section background color (Green / Ivory) in Page Content CMS

> Drop this into a FRESH Claude session. Self-contained. The Page Content CMS is already built and working (GP/Specialist/Home/Doctors/Health-Tests render DB-driven toggle-gated sections; Prescriptions DRAFT). This adds a per-section background-theme picker.

## Goal
Each structured section (intro, whoFor, whyChoose, faq, disclaimer) can be set — per country, in the admin editor — to render on a **Green** (dark forest) or **Ivory** (light) background. Today the theme is hardcoded per section in the page components. Make it admin-selectable, with the current hardcoded value as the default.

## Context / current state
- Section components accept a `theme` prop already:
  - `ServiceIntro`, `ChecklistSection`, `WhyChooseSection` (`@/components/sections/ServiceContentSections`) accept `theme` (values seen: `"light"`, `"soft"`, `"dark"`).
  - `FAQSection` renders dark; `MedicalDisclaimer` its own band.
  - Map the UX choice: **Green = `theme="dark"`** (forest), **Ivory = `theme="light"`**. (Confirm `WhyChooseSection`'s current `"soft"` — treat soft as ivory/light variant; keep "soft" as the ivory default for whyChoose unless a plain light reads better.)
- Public pages that render these sections (thread the theme into each): `frontend/app/(site)/[country]/[lang]/` → `general-consultation/page.tsx`, `specialist-consultation/page.tsx`, `tests/page.tsx`, `prescriptions/page.tsx`, `page.tsx` (HOME), `doctors/page.tsx`.
- Theme is **per-country, NOT per-locale** → store on the `PageContent` base row (like the `show*` toggles), not on `PageContentTranslation`.
- Backend: `backend/src/modules/page-content/page-content.service.ts` (`getPublicPageContent`, `upsertPageContent`, `computeSectionVisibility`, types `PageContentBase`/`PublicPageContentResult`), routes in `admin-page-content.route.ts` + `page-content.route.ts`, validation `admin-page-content.schema.ts`.
- Admin editor: `frontend/app/(admin)/admin/page-content/_components/page-content-editor.tsx` (section cards, `SectionToggle`, `SectionAside`), form parse `page-content-form-parse.ts`, client types `frontend/lib/admin/admin-api/page-content.ts`.
- Public fetcher: `frontend/lib/content/get-page-content.ts` (add themes to the record shape + normalize).

## MIGRATION SAFETY (read — repo-specific)
- Live Railway DB, **NO backups**. `prisma migrate dev` is BROKEN here — author the migration with `prisma migrate diff` and apply with `prisma migrate deploy`. **NEVER** `prisma migrate reset`. Additive only.
- The user must approve the `migrate deploy` (production DB write). Author it, dry-check it's additive (ALTER TABLE ADD COLUMN only), then apply.

## Phase 1 — Schema
Add to `model PageContent` (base row) five nullable theme columns (null = use the page's hardcoded default):
```prisma
  introTheme      String?  // "green" | "ivory"
  whoForTheme     String?
  whyChooseTheme  String?
  faqTheme        String?
  disclaimerTheme String?
```
(Or one `sectionThemes Json?` — but discrete columns match the existing `show*` pattern and are simpler to validate. Prefer columns.)
Migration: `prisma migrate diff` → hand-authored folder → `prisma migrate deploy` (5 ADD COLUMN, zero table changes). `prisma generate`.

## Phase 2 — Backend
- `admin-page-content.schema.ts`: add the 5 optional fields, each `z.enum(["green","ivory"]).nullable().optional()`.
- `page-content.service.ts`:
  - `PageContentBase` type + `getPublicPageContent` merged record: include the 5 theme fields (base row, not per-locale).
  - `upsertPageContent`: persist them (create + update) like the `show*` toggles.
  - `setPageContentFlags` unaffected.
- No route changes (routes pass `record` through).

## Phase 3 — Public fetcher + pages
- `get-page-content.ts`: add `introTheme` … `disclaimerTheme` (`"green" | "ivory" | null`) to `PublicPageContentRecord` + normalize passthrough. Add a helper to map to the component prop, e.g. `themeProp(v, fallback) = v === "green" ? "dark" : v === "ivory" ? "light" : fallback`.
- Each of the 6 public pages: where it renders a gated section, replace the hardcoded `theme="light"|"soft"|"dark"` with `themeProp(record.introTheme, "light")` etc. — **fallback = today's hardcoded value per section per page** so unset = byte-identical to now. Do NOT change any other prop or order.
  - whyChoose default is `"soft"` on most pages — keep `themeProp(record.whyChooseTheme, "soft")`.

## Phase 4 — Admin editor
In `page-content-editor.tsx`, add a 2-option **Green / Ivory** selector to each of the 5 section cards (intro, whoFor, whyChoose, faq, disclaimer). It's a per-page (base-row) value → render once per card (not per locale tab), next to the `SectionToggle` in the card header (`SectionAside`) or under the description. Use existing admin atoms (segmented control / two radio pills styled with portal tokens — grep for an existing segmented/radio pattern; else two `<label><input type="radio">` pills). Hidden form fields named `introTheme` … `disclaimerTheme`, values `green`/`ivory` (empty = default).
- `page-content-form-parse.ts`: parse the 5 fields (null when empty).
- `page-content.ts` client DTO + input types: add the 5 fields.
- Show a tiny swatch/label so the admin sees the current choice; default state (no value) can read "Default".

## Phase 5 — Verify
- `tsc --noEmit` FE + BE clean; eslint touched files; frontend build.
- Browser: set IE GP `whyChooseTheme=green` in admin → save → that section renders dark on `/ie/en/gp-appointment` (60s cache); set `ivory` → light; unset → today's default. Confirm one section per page type.
- Unset everywhere = every page byte-identical to current.
- Unit: extend the section-visibility test file with a `themeProp` mapping test (green→dark, ivory→light, null→fallback).

## Rules
- Additive migration only; owner approves `migrate deploy`. No `reset`.
- Fallback must reproduce today's exact look when a theme is unset.
- Reuse section components + admin atoms; no new global CSS; no reordering.
- Per-country (base row), not per-locale.
- Commit per phase; do not push.
