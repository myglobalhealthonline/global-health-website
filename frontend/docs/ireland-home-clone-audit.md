# Ireland Home Clone Audit (`/home`)

Source audited: `https://www.myglobalhealth.online/home`
Target route: `frontend/app/(site)/home/page.tsx`

## Section Order

1. Sticky global header
2. Quick-link row (`Home`, `Specialist Consultation`, `GP Consultation`)
3. Ireland hero with two CTAs, badges, and hero visual
4. Same-day consultation CTA block
5. About-us split section
6. Specialist consultations grid
7. How-it-works 3-step section
8. Home-delivery promotional section
9. Doctor spotlight
10. Team preview
11. Trust / standards section
12. FAQ
13. Bottom booking CTA
14. Global footer

## Hero Content / Layout

- Eyebrow: `Ireland Online Medical Clinic`
- Main headline: `Medical Consultations Wherever You Are`
- Supporting copy references Irish Medical Council certification and multilingual consultations.
- CTA 1: GP consultation booking
- CTA 2: Specialist consultation booking
- Badge row mirrors the live site intent: certification, same-day consultations, multilingual support.
- Hero uses a split layout on larger breakpoints to better match the visual weight of the live Wix page.

## CTAs

- Hero primary CTA for GP consultations
- Hero secondary CTA for specialist consultations
- Same-day consultation CTA block
- About section CTA
- Specialist grid CTA
- Home-delivery CTA
- Bottom booking CTA

## Clinic / Country Messaging

- The page is framed specifically as the Ireland clinic hub.
- Messaging emphasizes access across Ireland, video consultations, and multilingual availability.
- Copy avoids adding new medical claims beyond the live Wix positioning.

## Doctors / Team Preview

- Live page shows a testimonial-style doctor spotlight and team navigation.
- Implementation includes:
  - doctor spotlight section for Dr. Khoiamul Islam
  - team preview cards section
- Doctor portrait is still placeholder-based pending asset approval.

## Services / Consultation Sections

- Specialist consultations are the main service grid on the live page.
- Implementation uses Ireland specialist routes for the primary card grid.
- Generic vector icons were added for card rhythm only; final branded icons are still pending.
- Home delivery remains a dedicated promotional section.

## Pricing / Plan References

- The live page links to pricing/plans in navigation but does not present a primary pricing block in the body.
- No dedicated pricing section was added to `/home`.

## Trust / Benefit Sections

- Live page includes Europe-wide trust framing, ratings, safety, confidentiality, and access messaging.
- Implementation maps those into a structured trust section with icon-led cards.

## Footer / CTA Flow

- Existing global footer remains intact.
- Bottom booking CTA remains above the footer with a stronger visual handoff than before.
- Footer hierarchy is still approximate because the live Wix footer uses brand assets and a different final composition.

## Responsive Notes

- Mobile (`320`, `375`, `390`, `430`):
  - quick links wrap safely
  - hero text remains readable with stacked CTAs
  - split sections collapse vertically
  - service cards and team cards stack cleanly
- Tablet (`768`, `1024`):
  - hero becomes more balanced
  - service and trust grids move into multi-column layouts
  - same-day CTA and bottom CTA maintain readable button spacing
- Desktop (`1280`, `1440`):
  - split hero, about, delivery, and doctor spotlight sections carry more of the Wix visual rhythm
  - containers remain capped to avoid overly long line lengths

## Visual QA Summary

### What Matches

- Ireland-specific route structure and section order
- Split hero direction with two CTAs
- Quick-link row placement directly below the header
- Same-day consultation CTA prominence
- About section split layout
- Specialist consultation section prominence
- Doctor spotlight before team preview
- Trust, FAQ, and bottom CTA sequencing
- No obvious horizontal-scroll risk in the current responsive layout

### What Is Still Approximate

- Shared header branding is improved but still uses a monogram/text treatment instead of the real logo
- Hero typography and image composition are closer but not exact
- Specialist cards use generic vector icons rather than final branded service art
- Footer transition is improved but still follows the existing sitewide footer structure

### What Is Blocked By Missing Assets

- Final Ireland hero artwork
- Ireland clinic/about image
- Doctor portrait or approved testimonial artwork
- Home-delivery artwork
- Final shared logo
- Brand-specific trust and service icon set
- Footer decorative artwork

## Final Visual Gaps

- Exact visual parity still depends on approved brand assets.
- The live Wix page includes richer imagery and embedded booking/testimonial widgets that are intentionally not being recreated as Wix runtime code.
- Header and footer remain globally shared components, so they are only partially country-specific in appearance.
