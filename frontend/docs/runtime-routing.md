# Runtime Routing (Phase 1)

## Country resolution
Frontend resolves country context at runtime using this order:
1. request host/domain mapping
2. legacy route prefix mapping
3. default fallback country (Ireland)

Examples:
- global/default host + `/home` -> Ireland
- `/home-pt` -> Portugal
- `/home-sp` -> Spain
- `/home-cz` -> Czechia
- `/home-rm` -> Romania

Domain mapping is prepared for future custom domains (`ireland.example.com`, `globalhealth.pt`, etc.).

## Locale resolution
Locale is selected at runtime using this order:
1. explicit locale (when present)
2. `Accept-Language` best supported match
3. country default locale
4. fallback `en`

Supported: `en`, `pt`, `es`, `cs`, `ro`, `de`.

## Legacy route preservation
Legacy Wix paths stay in frontend routing. Runtime mapping is centralized in:
- `lib/routing/legacy-route-map.ts`
- `lib/routing/resolve-country.ts`

## Redirect aliases (safe only)
Middleware handles only explicit aliases:
- `/terms-and-conditions` -> `/term-and-conditions`
- `/privacy-policy` -> `/privacy`
- `/refund-policy` -> `/return-and-refund-policy`
- `/gdpr-compliance` -> `/privacy`

## Backend + locale integration model
- Frontend owns routing, locale loading, and public rendering.
- Backend owns Prisma/database and future business APIs.
- Phase 1 keeps frontend working with static fallback context even if backend is offline.
