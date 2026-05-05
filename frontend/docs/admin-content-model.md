# Admin Content Model

## Core entities
- Country
- CountryDomain
- CountryLocale
- Currency
- Clinic
- Doctor
- Specialty
- Service
- PricingPlan
- Asset
- Badge
- ConsultationSetting
- BookingSetting

## Editing boundaries
Admin UI should manage only database-managed content:
- country operations data
- doctor/service/specialty records
- pricing and consultation settings
- media assets and trust badges
- booking toggles and operational flags

Locale files remain file-managed for now:
- navigation labels
- static copy scaffolds
- forms labels
- legal placeholder text
