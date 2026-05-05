# i18n Strategy

## Locale folders
`locales/en`, `locales/pt`, `locales/es`, `locales/cs`, `locales/ro`, `locales/de`

Each locale includes:
- `common.json`
- `home.json`
- `services.json`
- `faq.json`
- `legal.json`
- `forms.json`

## Locale code policy
- Portuguese locale code is `pt` (never `pr`).

## Responsibilities
- Locale JSON: static UI labels and reusable copy blocks.
- Database: country-specific operational content (doctors, services, pricing, clinics, assets, settings).

## Loading strategy
- Server components load locale copy via `lib/i18n/get-common-locale.ts`.
- Fallback: requested locale -> country default locale -> `en`.
