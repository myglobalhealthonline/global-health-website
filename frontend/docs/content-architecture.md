# Content Architecture

## Goal
Support multiple country-specific websites from one codebase using a hybrid model:
- Database-managed country/domain/clinical content
- File-managed static locale copy

## Hybrid model

### Database-managed (Prisma)
- countries
- doctors
- services
- specialties
- pricing plans
- clinics
- images/assets
- badges
- consultation settings
- booking settings
- currencies
- supported locales
- country domains (future custom domains)

### File-managed locales (`locales/<code>/*.json`)
- common website copy
- homepage copy
- FAQ text
- legal/static placeholders
- CTA labels
- navigation labels
- form labels
- reusable section copy

## Runtime content flow
1. Resolve request context (domain + locale + route).
2. Load locale copy from `locales/<locale>/` JSON files.
3. Load country content from database (or seed fallback in dev).
4. Build view model in server layer.
5. Pass country content + locale copy into UI components as props.

## Component contracts
- Components must not hardcode country-specific services, doctors, pricing, badges, or media.
- Components should receive `localeCopy` and `countryContent` as props.

## Legacy route compatibility
Keep legacy Wix URLs active using:
- static pages where exact route exists
- dynamic route adapters for slug families
- redirects/aliases for cleaned routes

## Domain strategy (future)
- Map incoming host to `CountryDomain` table
- Resolve default locale + country from domain
- Reuse same app deployment for all country domains
