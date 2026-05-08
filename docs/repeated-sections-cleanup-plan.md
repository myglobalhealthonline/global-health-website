# Repeated Sections Cleanup Plan

## Scope

**In scope:**
- Static marketing pages (`StaticMarketingTemplate`)
- Consultation listing pages (`ConsultationListingTemplate`)
- Service detail template fallback content (`ServiceDetailTemplate`)
- Doctor team pages (`DoctorTeamTemplate`)
- Doctor profile pages (`DoctorProfileTemplate`)
- Shared CTA behaviour (`BookingCTA`)
- FAQ / HowItWorks usage

**Out of scope:**
- `CountryHomeTemplate` — not changed
- Country home route redesign
- Wix content matching
- Database content migration
- Launch / indexing governance

---

## Current Repetition Issues

| Area | File | Problem | Fix |
|---|---|---|---|
| Static pages | `StaticMarketingTemplate` | Same `HeroSection` with media frame + trust badges on every page regardless of context | Add `variant` prop; suppress media + trust badges for non-standard variants |
| Static page endings | `marketing-page-data.ts` | `defaultBottomCta` applied to About, Careers, Gift-card, Partner-clinics, Corporate-plans, FAQ | Remove `defaultBottomCta` from pages where patient booking CTA is contextually wrong |
| Consultation header | `ConsultationListingTemplate` | Hardcoded review/star block (4.94) rendered identically on GP and specialist pages | Add `showReviewScore` prop; specialist page passes `false` |
| Consultation ending | `ConsultationListingTemplate` | `BookingCTA` always rendered regardless of whether page already has sufficient decision prompts | Add `showFinalCta` prop |
| Service fallback | `ServiceDetailTemplate` | 8 generic cards rendered for every service missing `bodyHtml` — identical across all incomplete services | Replace with concise 3-section fallback (overview, prepare, urgent note) |
| Doctor team ending | `DoctorTeamTemplate` | Generic "Book with the right clinician" `BookingCTA` after page already shows doctor cards | Add `showBottomCta` prop defaulting to `false` |
| Doctor profile star block | `DoctorProfileTemplate` | Hardcoded 4.94 star rating shown on every doctor profile with no per-doctor data | Add `showReviewScore` prop defaulting to `false` |
| Doctor profile CTA | `DoctorProfileTemplate` | Full `BookingCTA` with proof pills at end of profile | Change to `density="compact"` + `showProofPoints={false}` |
| Proof pills | `BookingCTA` | Proof pills appear on every CTA variant including compact/inline instances | Add `showProofPoints` + `density` props to make pills opt-in |

---

## Components to Reduce

| Component | Current Use | New Rule |
|---|---|---|
| `BookingCTA` | Proof pills always rendered for all variants | `showProofPoints={false}` hides pills; `density="minimal"` strips padding + hides pills by default |
| `HeroSection` | Media frame always rendered even on document/FAQ/light pages | Add `showMedia` prop; non-standard variants suppress the media frame |
| `StaticMarketingTemplate` | Same hero/trust/CTA structure on every page | Add `variant` prop; each variant controls trust badges, media, eyebrow, section order |

---

## Pages to Change

| Page/Template | Current Pattern | New Pattern |
|---|---|---|
| `/about` | Standard hero + trust badges + media + `defaultBottomCta` | `variant="light"` — no trust badges, no media, no bottom CTA |
| `/careers` | Standard hero + trust badges + media + `defaultBottomCta` | `variant="document"` — no trust badges, no media, no bottom CTA |
| `/gift-card` | Standard hero + trust badges + media + `defaultBottomCta` | `variant="light"` — no trust badges, no media, gift-specific CTA removed |
| `/partner-clinics` | Standard hero + trust badges + media + `defaultBottomCta` | `variant="directory"` — no trust badges, no media, partner-contact CTA only |
| `/corporate-plans` | Standard hero + trust badges + media + `defaultBottomCta` | `variant="directory"` — no trust badges, no media, business-enquiry CTA only |
| `/frequent-asked-questions` | Standard hero + FAQ block + `defaultBottomCta` | `variant="faq"` — no trust badges, no media, FAQ rendered first, no bottom CTA |
| `/plans-pricing` | Standard hero + trust badges + media + pricing CTA | `variant="pricing"` — no trust badges, no media, pricing CTA preserved |
| `/general-consultation-ie` | Review stars always shown, final BookingCTA always shown | `showReviewScore` default true, `showFinalCta` default true (GP page unchanged) |
| `/specialty-ie` | Same review stars + same final CTA structure as GP page | Pass `showReviewScore={false}` to differentiate specialist listing |
| Service detail (no body) | 8 identical generic fallback cards | Concise 3-section fallback: overview, what to prepare, urgent care note |
| Doctor team page | Generic BookingCTA always rendered after doctor cards | `showBottomCta` defaults `false`; doctor cards already serve as decision UI |
| Doctor profile page | Hardcoded 4.94 star rating + full proof-pill CTA | `showReviewScore` defaults `false`; bottom CTA uses `density="compact"` + `showProofPoints={false}` |

---

## Acceptance Criteria

- Static pages no longer share identical hero/CTA/trust structure.
- `defaultBottomCta` not broadly reused — each page declares intent.
- Consultation listing pages have distinct review/CTA patterns by mode.
- Service fallback content is 3 sections, not 8 generic cards.
- Doctor team page does not auto-append a generic booking CTA.
- Doctor profile star block is opt-in.
- `BookingCTA` supports `showProofPoints` and `density` props.
- `CountryHomeTemplate.tsx` is unchanged.
- `frontend` typecheck passes.
- `frontend` build passes.

---

## Implementation Summary

| File | Change | Reason |
|---|---|---|
| `components/sections/BookingCTA.tsx` | Added `showProofPoints?: boolean` and `density?: "full" \| "compact" \| "minimal"` props | Proof pills appeared on every CTA instance; `density="minimal"` removes padding + pills for inline use |
| `components/sections/HeroSection.tsx` | Added `showMedia?: boolean` (default `true`) | Suppresses `HealthcareMediaFrame` for document/FAQ/light/pricing/directory page heroes |
| `components/templates/StaticMarketingTemplate.tsx` | Added `variant` prop with 6 options; variant controls eyebrow, trust badges, hero media, and section order (faq-first) | Every static page used identical hero structure regardless of page purpose |
| `lib/content/marketing-page-data.ts` | Added `variant` field to `MarketingPageData` type; assigned correct variant + removed `defaultBottomCta` from About, Careers, Gift-card, FAQ, Pricing list; replaced generic CTA on Partner-clinics and Corporate-plans | `defaultBottomCta` ("Book consultation") was contextually wrong on non-patient-conversion pages |
| `components/templates/ConsultationListingTemplate.tsx` | Added `showReviewScore`, `showFinalCta`, `guidanceVariant` props | GP and specialist listing pages had identical review score block and bottom CTA |
| `app/(site)/specialty-ie/page.tsx` | Passed `showReviewScore={false}` | Specialist listing should not show the same hardcoded 4.94 score as the GP listing |
| `components/templates/ServiceDetailTemplate.tsx` | Replaced 8-card generic fallback with a concise 3-section fallback (overview, prepare, urgent) | Every service missing `bodyHtml` showed identical 8-card content regardless of service type |
| `components/templates/DoctorTeamTemplate.tsx` | Added `showBottomCta?: boolean` defaulting to `false` | Doctor cards already serve as selection UI; generic CTA after them was redundant |
| `components/templates/DoctorProfileTemplate.tsx` | Added `showReviewScore?: boolean` defaulting to `false`; bottom CTA changed to `density="compact"` + `showProofPoints={false}`; removed empty placeholder comment blocks | Hardcoded 4.94 star rating had no per-doctor backing; full proof-pill CTA was heavy on a profile page |

---

## Repetition Reduced

| Pattern | Before | After |
|---|---|---|
| Hero trust badges | Always shown on all static pages | Shown only for `variant="standard"` pages |
| Hero media frame | Always rendered on all static pages | Suppressed for light/document/directory/pricing/faq variants |
| `defaultBottomCta` ("Book consultation") | Applied to About, Careers, Gift-card, Partner-clinics, Corporate-plans, FAQ, Pricing list | Removed from all of those; page-specific or no CTA |
| Service fallback cards | 8 generic cards identical across all incomplete services | 3 concise sections (overview, prepare, urgent note) |
| Consultation listing review score | Shown on both GP and specialist listing pages | Specialist listing passes `showReviewScore={false}` |
| Consultation listing bottom CTA | Always rendered | Gated by `showFinalCta`; specialist page hides proof pills |
| Doctor team bottom CTA | Always rendered after doctor cards | `showBottomCta` defaults to `false` |
| Doctor profile star rating | Hardcoded 4.94 on every profile | `showReviewScore` defaults to `false` |
| Doctor profile CTA weight | Full proof-pill CTA after profile | `density="compact"` + `showProofPoints={false}` |

---

## Country Template Status

`CountryHomeTemplate.tsx` was **not changed**. Country home pages continue to use the same template, section order, and layout.

---

## Validation

- frontend typecheck: **pass** (exit 0, 11.9s)
- frontend build: **pass** (exit 0, 30.5s, 66 pages generated)
