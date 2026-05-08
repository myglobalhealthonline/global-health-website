# Live Wix ↔ PostgreSQL CMS Verification Plan

## Purpose

Produce an **evidence-based** comparison between:

1. **Live Wix / production marketing site** (`https://www.myglobalhealth.online/…`), and  
2. **Actual PostgreSQL CMS rows** read via **Prisma** (never assuming `wipe-and-import-wix.ts` matches what is deployed in DB).

Outputs:

| Artifact | Role |
|----------|------|
| This plan | Methodology, scope, limitations, sign-off separation |
| `backend/prisma/verify-live-wix-db.ts` | Automated fetch + DB read + report generation |
| `docs/live-wix-db-verification-report.md` | **Generated** snapshot table (overwritten each run) |

## Principles (non-negotiable)

- **Import script ≠ database.** Seed sources are hints only; truth is `DATABASE_URL`.
- **Wix pricing is evidence, not approval.** Commercial/clinical validity stays with operations.
- **Never set `readyToIndex: true`** via this tooling.
- **Mismatches are review tickets**, not auto-fixes.
- **Clinical review ≠ legal ≠ commercial ≠ editorial.**

## Data sources

| Source | Use |
|--------|-----|
| PostgreSQL | Prisma queries: `Service`, `Doctor`, `BlogPost`, `ContentPage`, `Country`, etc. |
| Live Wix HTML | `fetch()` on listed URLs; HTML stripped to lines for **heuristic** parsing |
| Next.js repo | `frontend/app/sitemap.ts`, `frontend/data/blog-posts.ts`, route-level `robots` (for indexability narrative) |
| Publication rules | Logic **mirrored** in the script from `frontend/lib/content/publication-validation.ts` (keep in sync manually when rules change) |

## Live URLs (minimum)

| Page | Path | Extracted signals |
|------|------|-------------------|
| IE general consultations | `/general-consultation-ie` | Title, duration, EUR price rows |
| IE specialties | `/specialty-ie` | Same pattern |
| IE online prescriptions | `/online-prescription` | Title, €25, 5 min |
| IE home health tests | `/home-health-test` | Title, EUR price (duration/lab copy secondary) |
| IE team | `/ireland-team` | Registration IDs / roster scale |
| IE blog (optional signal) | `/blog` | Article titles/count when parseable |

Optional: other country **home** URLs if live parity matters for that sprint.

## Verification checklist (maps to report rows)

1. **Service counts** by `Service.kind` and `Country.code`
2. **Service slugs** (DB) vs Wix-derived titles (no slug on Wix — match by **normalized title**)
3. **Titles / names** alignment and orphan detection (Wix-only vs DB-only)
4. **Durations** where both sides expose minutes
5. **Prices / currency** — compare cents/EUR where extractable; flag ambiguous HTML
6. **`readyToIndex`** — read `editorialChecklist.readyToIndex` only (never write)
7. **`noindex` / indexability** — script computes **mirror** of service/doctor gates + notes hard-coded route rules (e.g. health-test detail, legal templates)
8. **Doctor count & credentials** — DB vs Wix registration markers (IMC / PSI / etc.)
9. **`BlogPost` rows vs public exposure** — DB count vs static `blogPosts` wiring
10. **`ContentPage` / country-related CMS** — counts and sample `pageKey`s
11. **Legal content** — distinguish CMS pages vs Next **template** legal routes (`robots` often `noindex` pending counsel)
12. **Sitemap alignment** — parse `noindexStatic` from `sitemap.ts`; note dynamic routes excluded from XML

## Limitations

- **HTML parsing is best-effort.** Wix markup changes can break or skew extraction; rerun after major site edits.
- **Title normalization** uses lowercase spacing, maps `&` → `and`, maps known spelling drift (**Respiractory** → **respiratory**), and excludes CMS hub rows (**`general-consultation`**, **`specialist-overview`**) when comparing Wix grids to CMS menus—they are hub/overview rows, not per-card duplicates on Wix.
- **Near-duplicates** still require human review.
- **Indexability** for dynamic URLs is **approximated** in Node (same rules as frontend validator **copy**); production metadata should still be spot-checked in browser.

## How to run

From repo root (with `DATABASE_URL` in `backend/.env` and network access):

```bash
cd backend
npx tsx prisma/verify-live-wix-db.ts
```

Or:

```bash
npm run verify:wix-db --prefix backend
```

Report path: `docs/live-wix-db-verification-report.md`.

## Sign-off matrix

| Concern | Owner |
|---------|--------|
| Clinical scope / boundaries | Medical director / clinical governance |
| Pricing & promotions | Commercial / ops |
| Legal pages & jurisdiction | Counsel |
| SEO / indexing switches | Product + SEO after ops gates |
| CMS data fixes | Content ops via admin |

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.1 | 2026-05-08 | Hub exclusion rules; HTML entity decoding; backend `verify:wix-db` npm script |
| 1.0 | 2026-05-08 | Initial plan + scripted verification |
