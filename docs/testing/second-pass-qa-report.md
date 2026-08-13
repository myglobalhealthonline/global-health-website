# Second Pass QA Report

## Executive Summary

The second pass tightened publication safety more than visual polish. Public medical pages now have stronger readiness checks, canonical doctor/service aliases are reduced, seeded non-Ireland medical route families are noindexed, incomplete Ireland service pages can self-noindex at render time, and admin create/edit flows now downgrade weak public content to draft or inactive states instead of letting it publish cleanly.

The main remaining risk is not structural duplication anymore. It is editorial depth. Ireland canonical service detail pages are technically safer now, but they still depend on admin/API service content quality. Non-Ireland country and consultation families remain too generic for indexing, which is why they are now intentionally excluded from search.

## Remaining High-Risk Issues

- Non-Ireland country home and consultation listing families are still seed-level content and not fully localized. They are now noindex, but they still need real local operational and clinical copy before index eligibility.
- Canonical Ireland service detail pages still rely on admin/API fields such as `heroDescription`, `detailBody`, price, and duration. If those are weak or incomplete, the page now shows an editorial-review notice and noindexes itself, but the final clinical copy still needs human review.
- Doctor profile quality still depends on admin-entered registration and bio depth. Profiles now noindex if they lack core trust fields, but weak bios can still appear to users if the route is accessed directly.
- Blog remains intentionally constrained. The index is noindex when empty, and article routes 404 without real editorial data, but the site still lacks a populated medically reviewed content set.

## Pages Still Too Generic

- `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm`
  Reason: country pages still use scaffold-level country copy and broad positioning rather than true local access guidance.

- `/general-consultation-pt`, `/general-consultation-sp`, `/general-consultation-cz`, `/general-consultation-rm`
  Reason: consultation listings are structurally improved but still not localized enough to index as country-specific medical landing pages.

- `/specialty-pt`, `/specialty-sp`, `/specialty-cz`, `/specialty-rm`
  Reason: specialist discovery UX is safer, but content still lacks country-specific specialty availability and clinical routing depth.

- `/online-prescription`, `/home-delivery`, `/home-health-test`
  Reason: these pages are more route-specific than before, but they still depend on admin service records to become fully complete product-grade pages.

- Team pages outside Ireland if doctor coverage is sparse
  Reason: template repetition is reduced, but credibility still depends on verified clinician records, languages, and registrations actually existing in admin data.

## Pages Safe to Index

- `/`
  Purpose is clear and acts as the global routing homepage.

- `/home`
  Ireland home is the strongest country page and has the best available service depth.

- `/general-consultation-ie`
  Ireland GP listing is indexable because it has the most mature route-specific structure and service routing.

- `/specialty-ie`
  Ireland specialist listing is indexable as the primary specialist discovery hub.

- `/plans-pricing`
  Pricing is now the canonical route and the duplicate list route redirects away.

- `/privacy`
- `/term-and-conditions`
- `/return-and-refund-policy`
- `/legal-notices`
  These are canonical legal routes with document-first layout.

- Canonical Ireland service detail pages only when validation passes:
  - `/ireland/[serviceSlug]`
  - `/ireland-specialist-consultations/[serviceSlug]`
  These routes now self-noindex when service content is incomplete.

- Canonical doctor profile pages only when validation passes:
  - `/ireland-team/[doctorSlug]`
  - country team doctor routes
  These now noindex when credentials or bios are not strong enough.

## Pages That Should Stay Noindex

- `/login`
- `/register`
- `/forgot-password`
- `/account`

- `/category/[slug]`
  Category pages remain noindex because they are still thin compared with core medical pages.

- `/services/[serviceSlug]`
- `/service-page/[serviceSlug]`
  These are alias or routing-support families and remain noindex-safe.

- `/home-health-tests/[testSlug]`
  Test detail pages stay noindex until test-specific operational content is stronger.

- `/blog` when `frontend/data/blog-posts.ts` is empty.

- `/post/[slug]` when a real editorial record is missing or missing required review fields.

- Non-Ireland seeded medical route families:
  - `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm`
  - `/general-consultation-pt`, `/general-consultation-sp`, `/general-consultation-cz`, `/general-consultation-rm`
  - `/specialty-pt`, `/specialty-sp`, `/specialty-cz`, `/specialty-rm`

- Any canonical Ireland service page that fails validation at runtime.

- Any doctor profile page that fails credential/bio validation at runtime.

## Pages That Need Editorial Review

- All Ireland service detail pages whose admin records are missing:
  - detailed clinical body
  - emergency warning
  - online-care limitations
  - prescription/referral/certificate boundaries
  - duration
  - price

- Any doctor profile missing:
  - registration number or verification URL
  - substantial bio
  - qualifications
  - language coverage

- Any future blog post missing:
  - author
  - reviewer
  - category
  - update date
  - excerpt
  - SEO title
  - SEO description

- Legal and static content pages without:
  - review date
  - SEO title
  - SEO description
  - full approved body copy

## Admin Validation Improvements

Implemented:

- Added [publication-validation.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/lib/content/publication-validation.ts)
  This validates:
  - blocked internal wording
  - missing SEO fields for blog/content pages
  - missing clinical service fields
  - missing price/duration
  - missing emergency/limitations/boundary language
  - missing doctor credentials
  - duplicate title/description checks for admin blog/content pages and practical equivalents for services/doctors

- Added [publication-guard.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/lib/content/publication-guard.ts)
  This sanitizes unsafe public strings before render.

- Admin save behavior now downgrades weak records:
  - services save as inactive when validation fails
  - doctors save as inactive when validation fails
  - blog posts save as draft/inactive when validation fails
  - content pages save as draft/inactive when validation fails

Files wired into admin flows:

- [services/new/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/services/new/page.tsx)
- [services/[id]/edit/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/services/[id]/edit/page.tsx)
- [doctors/create/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/doctors/create/page.tsx)
- [doctors/[id]/edit/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/doctors/[id]/edit/page.tsx)
- [blog-posts/new/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/blog-posts/new/page.tsx)
- [blog-posts/[id]/edit/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/blog-posts/[id]/edit/page.tsx)
- [content-pages/new/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/content-pages/new/page.tsx)
- [content-pages/[id]/edit/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(admin)/admin/content-pages/[id]/edit/page.tsx)

## SEO Validation Results

Passes:

- Legal aliases redirect instead of rendering full duplicate pages.
- Pricing alias redirects to `/plans-pricing`.
- Service alias routes noindex and redirect to canonical families.
- Ireland doctor alias now redirects to `/ireland-team/[doctorSlug]`.
- Dynamic category pages stay noindex.
- Blog index noindexes when there are no real posts.
- Blog article routes 404 without real editorial records.
- Sitemap excludes noindex/duplicate route families using [sitemap.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/sitemap.ts).
- Canonical metadata added for canonical Ireland service pages, blog articles, and doctor profiles.

Remaining SEO caveats:

- Non-Ireland route families still need true localized metadata and content before indexing can be restored.
- The site still lacks a populated editorial blog corpus, so healthcare authority content is not yet competitive.

## UX Differentiation Results

Homepage:
- Clearer than before, but still uses a marketing-first rhythm. Acceptable for now.

Country pages:
- More distinct than the first state, but only Ireland feels index-ready. Other countries still feel like launch-market placeholders.

GP consultation pages:
- Better decision support and less decorative repetition. Ireland is usable; non-Ireland remains too generic.

Specialist directory pages:
- Better than before because the giant quote/partner blocks were removed. Still needs stronger filter/comparison UX in a future pass.

Service detail pages:
- Biggest improvement in this pass. Clinical structure now exists, and incomplete records are explicitly held back from indexing.

Pricing:
- Canonical path is cleaner and duplicate route risk is reduced.

Team and doctor pages:
- Less repetitive, more credibility-focused, and better protected by validation.

Legal:
- Clear document layout and alias cleanup are materially better.

Blog:
- Editorial integrity is enforced, but actual content is still missing.

Booking:
- Booking remains conversion-focused. It still contains some generalized trust language, but public safety is improved.

## Trust & Compliance Results

Passes:

- Major public trust leak phrases are blocked by render sanitization and publication validation.
- Service pages now require emergency-warning and boundary language to be considered indexable.
- Doctor pages now require stronger credentials to remain indexable.
- Alias routes no longer expose duplicate public content.

Remaining concerns:

- Some public-facing seed/fallback pathways still exist in code comments and internal data layers, though they are now guarded from public render.
- The booking and homepage experience still uses broad trust language in places; it is no longer the main risk, but still not as evidence-driven as the clinical pages should become.

## Final Fix List

| Priority | Issue | Route/File | Fix | Risk If Ignored |
|---|---|---|---|---|
| P0 | Incomplete medical services could still appear publicly | [publication-validation.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/lib/content/publication-validation.ts), [ireland/[serviceSlug]/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/ireland/[serviceSlug]/page.tsx), [ireland-specialist-consultations/[serviceSlug]/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/ireland-specialist-consultations/[serviceSlug]/page.tsx) | Added service completeness validation, conditional noindex, and editorial-review notice | Thin or unsafe medical pages could index and damage trust |
| P0 | Doctor alias duplication | [ireland-doctors/[doctorSlug]/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/ireland-doctors/[doctorSlug]/page.tsx) | Redirect alias to canonical team doctor route | Duplicate doctor pages compete in search and confuse crawl signals |
| P0 | Weak admin publication governance | admin create/edit pages listed above | Save invalid services/doctors as inactive and invalid blog/content as draft/inactive | Incomplete public pages can leak back into production |
| P1 | Seed-level non-Ireland medical pages still too generic | `home-*`, `general-consultation-*`, `specialty-*` for `pt`, `sp`, `cz`, `rm` | Marked noindex in route metadata and excluded from sitemap | Search engines index weak localized content |
| P1 | Empty blog could still look public-ready | [blog/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/blog/page.tsx), [post/[slug]/page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/post/[slug]/page.tsx) | Noindex empty blog index and 404 posts without full editorial records | Healthcare authority signal stays weak and low-quality pages index |
| P1 | Duplicate title/description risk in admin-created public records | validation + admin create/edit flows | Added duplicate text checks where schema supports them | Cannibalization and low-quality metadata persist |
| P2 | Homepage still has some generic trust rhythm | [page.tsx](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/frontend/app/(site)/page.tsx) | Future pass: replace generic trust block with route-to-country decision support | Homepage still feels more marketing-led than clinical |
| P2 | Specialist listings still lack true directory behavior | `specialty-*` pages and `ConsultationListingTemplate` | Future pass: add filter, symptom routing, and specialty comparison | Specialist discovery remains flatter than it should be |
| P2 | Non-Ireland team pages may still be sparse | `*-team` routes | Future pass: noindex sparse team pages until enough credentialed doctors exist | Thin profile/directory pages weaken trust |
