# Ranking-growth batch — structural fixes + legacy-URL consolidation report

Date: 2026-08-10 · Data: production DB reads, live production HTML/API checks, OpenSEO GSC pull, e2e (Playwright, dev server pointed at production API for real content).

Three approved structural fixes, verified end-to-end, then a legacy-URL consolidation report (no code — GSC evidence only). Commercial-query analysis is a separate follow-up (see end).

## A. Fix verification

### A1 — Service list crawlability

**Root cause**: `ServicesGrid`/`ServiceCatalog` (`frontend/components/sections/`) sliced to ONE page client-side (`useState`) — only the current page's items ever entered the React tree, so a crawler reading raw server HTML only ever saw page 0 (5 items).

**Fix**: every page's items now render into the DOM as real `<Link>`/`<a>` elements; only the visually-active page is toggled via the `hidden` attribute (not client-state gating existence). Pagination UX, ordering, filters, booking CTAs, and the `hidden` group's removal from the a11y tab order (matching a well-built carousel) are all unchanged. One accepted cosmetic trade-off: the fade-up stagger animation only plays the first time a group scrolls into view, not on every manual page-flip back to it — desktop only, `RevealOnScroll` already skips entirely on touch/coarse-pointer and reduced-motion, so mobile is unaffected.

**Before**: `curl /ireland/en/general-consultation` → exactly 5 `<a href="/ireland/en/services/...">` in raw HTML (verified live pre-fix, matches `PAGE_SIZE_FEATURED`).

**After**: same page, all of Ireland's 16 live GENERAL services present as real links in raw HTML — verified via a Playwright e2e test hitting a local dev server pointed at the real production API (`request.get`, no JS execution, HTTP-level only).

**Affected**: every country/kind combination with more than 5 active services (confirmed live: ie 16 GENERAL/7 SPECIALIST, pt 18/5, es 18/6, cz 15/0, ro 14/3, br 18/0 — every market's GENERAL catalogue was affected) and the country-home `ServiceCatalog` strip.

**Tests**: `frontend/tests/e2e/service-catalog-crawlability.spec.ts` — asserts >5 distinct service links in raw HTML for `/ireland/en/general-consultation` and `/portugal/pt` (country home). Both pass against real production content.

### A2 — Blog CTA locale hardcoding

**Root cause**: `frontend/lib/content/blog-post-page.tsx` hardcoded `/en/` in two places — the `ctaService` outbound link (visible CTA) AND the `Physician` schema URL for the article's author/reviewer doctor (structured data), regardless of the article's own resolved locale.

**Fix**: both now use the article's already-resolved `locale` variable.

**Before → after** (verified live against real content, one article per locale, all pointing at the same `baixa-medica` service so only the locale segment differs):

| Locale | Article | Before | After |
|---|---|---|---|
| en | `/portugal/en/blog/self-certification-sick-leave-portugal` | `/portugal/en/services/baixa-medica` (already correct — en was the hardcoded value) | `/portugal/en/services/baixa-medica` |
| pt | `/portugal/pt/blog/autodeclaracao-de-doenca-ou-baixa-medica` | `/portugal/en/services/baixa-medica` (wrong) | `/portugal/pt/services/baixa-medica` |
| es | `/portugal/es/blog/autodeclaracion-enfermedad-portugal` | `/portugal/en/services/baixa-medica` (wrong) | `/portugal/es/services/baixa-medica` |
| cs | `/portugal/cs/blog/autodeklarace-nemoci-portugalsko` | `/portugal/en/services/baixa-medica` (wrong) | `/portugal/cs/services/baixa-medica` |
| ro | `/portugal/ro/blog/autodeclaratie-de-boala-portugalia` | `/portugal/en/services/baixa-medica` (wrong) | `/portugal/ro/services/baixa-medica` |
| pt (Brazil) | `/brazil/pt/blog/atestado-medico-online-validade` | `/brazil/en/services/atestado-medico-online` (wrong) | `/brazil/pt/services/atestado-medico-online` |

**Tests**: `frontend/tests/e2e/blog-cta-locale.spec.ts` — all 6 rows pass against real production content, and explicitly assert the wrong `/{country}/en/services/...` href is absent for every non-English row.

### A3 — Doctor freshness architecture

**Implemented, end to end, nullable, no backfill**:
- `backend/prisma/schema.prisma` + migration `20260810120000_doctor_last_reviewed_at` — `Doctor.lastReviewedAt DateTime?`, mirrors `Service.lastReviewedAt` exactly.
- `backend/src/validations/admin-doctors.schema.ts` — `lastReviewedAt: optionalNullableDate` on the shared create/update body.
- `backend/src/modules/doctors/doctors.service.ts` — create/update handlers write it only when explicitly supplied (`!== undefined` conditional spread), never defaulted.
- Public payload: flows through automatically (every doctor query uses `include` without a narrow top-level `select`, and `mergeDoctorTranslation`/`mergeDoctorMarketTranslation` spread the base row) — confirmed via the same code-reading pass, no service-layer change needed beyond the schema.
- `frontend/lib/admin/admin-api/doctors.ts`, `doctor-fields.tsx`, `doctor-form-parse.ts`, both create/edit admin pages — a native date input, admin-only, labeled "leave blank until genuinely reviewed, don't backdate to today."
- `frontend/lib/content/get-public-doctors.ts`, `doctor-profile-data.ts` — passthrough to the public page data shape.
- `frontend/components/templates/DoctorProfileTemplate.tsx` + `doctor-profile-page.tsx` — renders as a 4th trust-badge pill ("Last reviewed \<date\>") only when set, same date-format convention as the service page / blog byline.
- Structured data: **deliberately NOT added to `physicianJsonLd`** — `Physician` (Person/MedicalOrganization branch of schema.org) has no valid `dateModified`/`lastReviewed` property, unlike the service page's entity type where that precedent was already established. Adding it there would be inventing non-standard schema, which the brief explicitly said not to do. The visible "Last reviewed" badge is the real, valid E-E-A-T signal.

**Existing doctor profiles with real dates**: **zero** — the field is brand new this batch, nothing has been backfilled (correct per the CRITICAL instruction). **Every existing doctor profile requires human review** before this signal appears anywhere; none are auto-populated.

**Tests**: covered by the existing `tsc --noEmit` (both packages) and `eslint` passes — this is additive schema/plumbing with no new business logic to unit-test beyond what the Service equivalent already established as the pattern.

## B. Legacy URL consolidation report (GSC evidence only — no redirect changes)

| Window | Legacy-shape clicks | Legacy-shape impressions | New-shape clicks | New-shape impressions |
|---|---:|---:|---:|---:|
| Last 28 days (2026-07-09 → 2026-08-06) | 505 | 13,550 | 218 | 12,343 |
| Last 90 days (2026-05-06 → 2026-08-06) | 1,378 | 35,218 | 218 | 11,829 |

Legacy share of clicks fell from ~86% (90d) to ~70% (28d) — moving in the right direction, consistent with normal post-migration consolidation, not stalled.

Representative old → new mappings (all confirmed live, single redirect hop, 200, self-canonical — no defects found):
- `/ireland-doctors/dr-grainne-ahern` → `/ireland/en/doctors/dr-grainne-ahern`
- `/pt/portugal-doctors/dr-telmo-coelho` → `/portugal/pt/doctors/dr-telmo-coelho`
- `/general-consultation-ie` → `/ireland/en/general-consultation`
- `/service-page/ie-medical-consultation` → `/ireland/en/services/{slug}`
- `/home-cz` → `/czechia/{locale}`

No redirect defects found. Per the brief: **not touched** — this is expected consolidation lag, not a code problem. Internal links already point at new URLs (confirmed throughout this session's work); sitemap/hreflang already new-URL-only (confirmed in the 2026-08-09 batch). Re-check in the next scheduled GSC pull rather than acting further now.

## Commercial-query / content-authority analysis

Not done in this batch — the brief scoped it as a distinct next phase requiring fresh GSC pulls (Groups A–F, the Commercial Opportunity Matrix, doctor-name-search audit). Doing it properly needs its own dedicated pass; bundling it into this already-large structural batch would violate the brief's own "keep this as a small isolated batch" instruction for Fix 1 and the general "audit first, don't mass-change" framing. Flagging as the immediate next step, not deferred indefinitely.

## Verification summary

- `tsc --noEmit`: clean, both packages.
- `eslint`: clean on every file this batch touched, both packages.
- `vitest run` (frontend): 732 passed, 1 pre-existing unrelated failure (confirmed via `git stash` against the pre-batch baseline in the prior session, unrelated to this batch — admin-memberships breadcrumb route tree).
- `node:test` (backend, doctors module): 5/5 pass.
- Playwright e2e (new specs, dev server pointed at production API for real content): 8/8 pass — the two structural fixes are proven against live data, not just typechecked.
