# Admin Content Model

## Account Scope (editing vs login)

- **`Doctor`** in this model means **public profile records** (marketing pages). Staff **`ADMIN`** users edit them like CMS rows — doctors themselves **do not log into this site**.
- **Doctor portal** (clinical tooling) is **deferred** and separate from this content model.

## Core entities
- Country
- CountryDomain
- CountryLocale
- Currency
- Clinic
- Doctor (public directory only — not a User account)
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
