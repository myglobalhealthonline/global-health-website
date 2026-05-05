# Runtime Routing (Phase 1.5)

## Why `proxy.ts` (not `middleware.ts`)
Next.js 16 deprecates middleware convention in favor of `proxy.ts`. This project uses `proxy.ts` so routing boundary logic stays future-compatible.

## Country resolution
Frontend resolves country context at runtime in this order:
1. enabled domain map (`lib/routing/domain-map.ts`)
2. runtime header country (`x-gh-country`) when provided by `proxy.ts`
3. legacy route prefix map (`lib/routing/legacy-route-map.ts`)
4. fallback country (Ireland)

Examples:
- global/default host + `/home` -> Ireland
- `/home-pt` -> Portugal
- `/home-sp` -> Spain
- `/home-cz` -> Czechia
- `/home-rm` -> Romania

## Locale resolution
Locale negotiation order:
1. explicit locale in route segment (if present)
2. runtime header locale (`x-gh-locale`) when present
3. locale cookie (`gh_locale`)
4. `Accept-Language` best supported match
5. selected country default locale
6. fallback `en`

Supported: `en`, `pt`, `es`, `cs`, `ro`, `de`.

## Request context extraction
`lib/routing/get-request-context.ts` extracts:
- host
- pathname
- resolved country code
- resolved locale
- legacy route status
- matched legacy route prefix

`proxy.ts` passes lightweight headers to app rendering:
- `x-gh-country`
- `x-gh-locale`
- `x-gh-legacy-route` (when matched)

## Redirect behavior (minimal/safe)
Only explicit aliases are redirected:
- `/terms-and-conditions` -> `/term-and-conditions`
- `/privacy-policy` -> `/privacy`
- `/copy-of-privacy-policy` -> `/privacy`
- `/refund-policy` -> `/return-and-refund-policy`
- `/gdpr-compliance` -> `/privacy`

No country home routes, service routes, or dynamic consultation routes are auto-redirected in this phase.

## Custom domains (future)
Domain mapping is centralized in `domain-map.ts` with `enabled` flags.
Example domains can be documented without affecting production until explicitly enabled.

## Legacy route preservation
No aggressive route rewrites are applied. Legacy Wix route families stay owned by frontend routing adapters and existing public pages.

## Backend/content boundary
- Frontend: routing, locale loading, legacy handling, page rendering
- Backend: Prisma/database + future business APIs

Phase 1.5 keeps frontend fully functional even when backend is offline by using fallback site context.
