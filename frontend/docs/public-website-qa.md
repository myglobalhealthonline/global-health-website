# Public Website QA

Audit date: 2026-05-05

## Pages Reviewed
- `/`
- `/home`
- `/home-pt`
- `/home-sp`
- `/home-cz`
- `/home-rm`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland/diabetes-consultation`
- `/ireland-specialist-consultations/cardiology-consultation`
- `/ireland-team`
- `/ireland-doctors/dr-mirza-aun-mohammad`
- `/plans-pricing`
- `/online-prescription`
- `/home-delivery`
- `/home-health-test`
- `/blog`
- `/post/how-online-medical-consultations-work`
- `/privacy`

## Viewport Notes
- `320`: verify no horizontal scroll, menu readability, stacked cards, clear booking CTA
- `390`: verify mobile balance for hero, service cards, booking form, footer CTA
- `768`: verify tablet wrapping and section spacing
- `1024`: verify header/nav density and two-column template balance
- `1280`: verify card rhythm, hero hierarchy, footer spacing
- `1440`: verify max-width discipline and restrained whitespace

## UI/UX Issues Found
- Some shared pages still used the earlier Wix-derived palette rather than the approved healthcare palette.
- Shared templates were structurally sound but too generic in hierarchy, making key pages feel like scaffolds instead of guided patient journeys.
- Booking form fields were readable but not yet unified under a consistent input/label system.
- Header and mobile navigation had small polish issues:
  - touch-target consistency
  - CTA emphasis
  - dropdown sizing
  - encoding glitch in mobile accordion icon
- Footer copy had an encoding issue in the copyright row and needed calmer panel treatment.
- Doctor/profile cards felt too placeholder-heavy and not credible enough in presentation.

## Fixes Applied
- Normalized global tokens in `frontend/app/globals.css` to the approved palette:
  - dark green primary
  - soft green accent
  - white background
  - neutral borders
  - `#333333` body text
  - `#666666` muted text
- Added shared field classes:
  - `gh-input`
  - `gh-select`
  - `gh-textarea`
  - `gh-field-label`
- Strengthened global focus visibility and tap-target sizing.
- Refined shared header/navigation:
  - cleaner CTA sizing
  - better desktop nav padding
  - calmer hover states
  - clearer dropdown width and padding
  - mobile menu icon/fixed CTA polish
- Refined footer:
  - softer background panel
  - better content width balance
  - corrected copyright rendering
  - improved CTA/footer transition block
- Improved shared content sections and cards:
  - hero trust badges
  - clearer country selector chips
  - stronger step markers
  - softer trust icon treatment
  - improved service metadata chips
  - more credible doctor placeholder panels
  - clearer pricing/blog/home-test card hierarchy
- Improved high-intent templates:
  - booking flow
  - consultation listings
  - service detail
  - doctor team/profile
  - blog index/article
  - legal pages
  - static marketing pages

## Remaining Gaps
- Exact visual parity with the live Wix site is still blocked by missing real brand assets:
  - final logo
  - final hero imagery
  - doctor photos
  - trust badges/illustrations
  - footer CTA art
- Some service, doctor, blog, and legal pages still use safe generalized content rather than final editorial or clinical copy.
- Country-specific pages inherit the improved system correctly, but final parity still depends on approved local assets and content review.
