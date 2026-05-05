# Ireland Home Clone Audit (`/home`)

Source audited: `https://www.myglobalhealth.online/home`
Target route: `frontend/app/(site)/home/page.tsx`

## Section Order

1. Sticky global header
2. Small quick-link row (`Home`, `Specialist Consultation`, `GP Consultation`)
3. Hero with Ireland-specific clinic messaging, two CTAs, badges, and hero image
4. Same-day consultation / availability CTA block
5. About-us split section
6. Specialist consultation / specialties section
7. How-it-works 3-step section
8. Home-delivery promotional section
9. Doctor/testimonial spotlight
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
- Quick trust badges mirror live intent: certification, same-day consultations, multilingual support.
- Hero is image-backed with a local placeholder until approved artwork is available.

## CTAs

- Hero primary CTA for GP consultations
- Hero secondary CTA for specialist consultations
- Availability CTA block
- About section CTA
- Specialty section CTA
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
- Doctor image remains a placeholder pending approval.

## Services / Consultation Sections

- Specialist consultations are the main service grid on the live page.
- Implementation uses Ireland specialist routes for the primary card grid.
- Home delivery is broken into its own dedicated promotional section.

## Pricing / Plan References

- The live page links to pricing/plans in global navigation but does not present a major pricing section in the main body.
- No dedicated pricing block was added to `/home`.

## Trust / Benefit Sections

- Live page includes Europe-wide trust framing, ratings, safety, confidentiality, and access messaging.
- Implementation maps those into a structured trust section with five cards.

## Footer / CTA Flow

- Existing global footer remains intact.
- Bottom booking CTA remains above the footer.
- Current footer layout still differs from the Wix footer hierarchy, but route coverage is preserved.

## Images / Icons / Badges Needed

- Ireland hero image
- Ireland about-section clinic image
- Doctor/testimonial portrait
- Home-delivery artwork
- Trust illustrations
- Service/category icons
- Footer CTA decorative artwork if tighter parity is required

## Responsive Notes

- Mobile (`320`, `375`, `390`, `430`):
  - quick links wrap
  - hero remains single-column
  - CTA rows wrap safely
  - split sections collapse vertically
- Tablet (`768`, `1024`):
  - services and doctor cards move into multi-column grids
  - split sections become more balanced without forcing overflow
- Desktop (`1280`, `1440`):
  - hero image and split sections align with wider visual rhythm
  - section widths remain capped for readability

## Differences From Root Homepage (`/`)

- `/home` is country-specific and Ireland-branded rather than a multi-country entry page.
- `/home` adds quick actions, same-day consultation messaging, about-us content, doctor spotlight, and home-delivery promotion.
- `/home` focuses on specialist consultation routes instead of multi-country selection.
- `/home` uses more section density than the root homepage.

## Remaining Visual Gaps

- Final Ireland visual parity still depends on approved brand assets.
- The live Wix page includes richer imagery and embedded booking/testimonial widgets that are not being reproduced as Wix runtime code.
- Header/footer visual styling remains globally shared rather than Ireland-route-specific.
