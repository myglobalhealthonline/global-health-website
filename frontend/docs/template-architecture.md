# Template Architecture (Phase 2)

## How templates work
Phase 2 introduces reusable server-rendered templates in `components/templates`:
- `CountryHomeTemplate`
- `ConsultationListingTemplate`
- `ServiceDetailTemplate`
- `DoctorTeamTemplate`
- `BlogIndexTemplate`
- `BlogArticleTemplate`
- `LegalPageTemplate`

Each route page maps URL params + route identity into a template props object.
This keeps route structure stable while replacing one-off placeholder screens.

## Country data flow
1. Route page calls `getTemplatePageData(pathname, countryHint)`.
2. Helper uses `getSiteContext()` fallback flow and country routing context.
3. Helper returns country metadata, canonical route paths, and listing blocks.
4. Template receives only props; no country-specific content is hardcoded inside UI components.

## Locale copy flow
1. `getSiteContext()` loads locale bundle from `locales/<locale>/*.json`.
2. Route adapter selects locale-aware values from `site.common` and `site.localeBundle`.
3. Template receives finalized copy in props.

This keeps locale concerns in data adapters instead of presentational components.

## Backend/admin future replacement path
Current templates use fallback/static adapters by design.
When backend/admin content is ready:
- replace helper internals in `lib/content/template-page-data.ts`
- keep template prop contracts stable
- keep route files stable

This allows incremental migration from fallback seed content to backend-managed content without breaking URLs.

## Legacy route mapping into templates
Legacy routes continue to resolve via existing route inventory and routing adapters.
Template adoption preserves path behavior for:
- country home routes (`/home*`)
- consultation listings (`/general-consultation-*`, `/specialty-*`)
- service detail families (`/ireland/*`, `/service-page/*`, `/services/*`)
- blog/article routes (`/blog`, `/post/[slug]`)
- legal routes (`/legal-notices`, `/term-and-conditions`, `/privacy`, `/return-and-refund-policy`, `/cookies-policy`)

No legacy SEO path family is redirected by this template layer; it only upgrades rendering structure.
