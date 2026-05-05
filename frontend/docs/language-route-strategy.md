# Language Route Strategy

## Current Approach

- Public routes stay stable (no locale prefixes in URL yet).
- Language switching updates locale context/cookie and text labels, not route path.
- Route resolution remains path-based with safe fallback behavior.

## Route Label Translation

- Canonical route definitions live in `frontend/lib/routing/public-route-registry.ts`.
- Localized route labels live in:
  - `frontend/locales/en/routes.json`
  - `frontend/locales/pt/routes.json`
  - `frontend/locales/es/routes.json`
  - `frontend/locales/cs/routes.json`
  - `frontend/locales/ro/routes.json`
  - `frontend/locales/de/routes.json`
- Label lookup is handled by `frontend/lib/i18n/route-labels.ts`.

## How Language Selector Uses Route Registry

- Selector keeps the current route path unchanged.
- Selector changes locale context only.
- UI route labels/titles are resolved via `getRouteLabels(route, locale)`.
- If a locale key is missing, fallback order is:
  1. selected locale entry
  2. English route label entry
  3. route registry default label

## Aliases and Canonical Paths

- Legacy/alias URLs are preserved in the registry with:
  - `legacy: true`
  - `canonicalPath: <canonical route>`
- Current aliases intentionally kept:
  - `/terms-and-conditions` -> `/term-and-conditions`
  - `/privacy-policy` -> `/privacy`
  - `/copy-of-privacy-policy` -> `/privacy`
  - `/refund-policy` -> `/return-and-refund-policy`
  - `/gdpr-compliance` -> `/privacy`

## Future Localized URL Strategy (Not Enabled Yet)

- Future option: locale-prefixed paths like `/pt/home` or locale-country domains.
- Route registry can support this by adding localized `pathVariants` while keeping one canonical route key.
- Existing canonical/alias logic remains valid during migration.

## Why Legacy URLs Are Preserved

- SEO continuity from previous URL structure.
- Backward compatibility for bookmarks, indexed links, and ad campaigns.
- Safe migration path while shared templates and adapters continue to evolve.

## Missing Translation Behavior

- Missing route label translations do not break navigation.
- Route stays functional on the same path.
- UI falls back to English labels.
- No forced redirect to non-existing localized paths.
