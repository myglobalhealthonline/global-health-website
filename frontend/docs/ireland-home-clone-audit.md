# Ireland Home Clone Audit (`/home`)

Source audited: `https://www.myglobalhealth.online/home`
Target route: `frontend/app/(site)/home/page.tsx`

## Exact Section Map

| Order | Section Name | Background | Layout Type | Heading Text | CTA Text | Image / Asset | Desktop Layout | Tablet Layout | Mobile Layout | Current Local Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Header | warm white `#FFFDFD` | sticky top nav | n/a | `Start Consultation` in header | shared logo | horizontal nav with dropdowns and right CTA | compressed horizontal nav | mobile trigger + menu | close |
| 2 | Quick-link row | warm white `#FFFDFD` | compact pill links | n/a | `Home`, `Specialist Consultation`, `GP Consultation` | no major art | compact chip row | wraps lightly | wraps | close |
| 3 | Ireland hero | soft light background | split hero | `Medical Consultations Wherever You Are` | `Schedule with a GP`, `Schedule with a Specialist` | Ireland hero artwork | text left, image right | balanced split/stack | stacked | close |
| 4 | Same-day consultation CTA | dark green `#1D4B36` | promo card strip | `Same-Day Consultation` | `Book Your Consultation` | no major art | large promo block | large promo block | stacked | close |
| 5 | About us | warm white `#FFFDFD` | text + image split | `Quality Healthcare, Without Leaving Home` | `Schedule an Appointment` | clinic/about image | text left, image right | balanced split | stacked | close |
| 6 | Specialist consultations | soft light background | section intro + service cards | `Specialist Consultations` | `View All Our Areas` | specialist card imagery/icons | 3-up cards | 2-up cards | stacked cards | close |
| 7 | How it works | warm white `#FFFDFD` | 3-step cards | implied process heading / flow | `Schedule a consultation` inside process cards | step illustrations/icons | 3 columns | 2 columns | 1 column | close |
| 8 | Home delivery | warm white / soft panel | split feature section | `Home Delivery` | delivery CTA | home-delivery image | text + image split | split/stack | stacked | close |
| 9 | Doctor spotlight / testimonials | light page background | image + testimonial copy | `Testimonials` | none in main spotlight | doctor portrait/testimonial image | image left, text right | balanced split | stacked | close |
| 10 | Trust / standards | light page background | heading + trust cards | `Trusted by thousands of patients across Europe` | none | trust badges / icons | centered heading + cards | 2-up cards | stacked | close |
| 11 | Footer columns | warm white `#FFFDFD` | logo + columns | footer only | footer links | shared footer logo | left brand block + columns | wrap | stacked | close |
| 12 | Footer CTA block | dark green `#1D4B36` | bottom CTA bar | `Start Your Online Consultation` | `Start Consultation` | CTA/footer graphic + trust bullets | text left, CTA right | stacked CTA row | stacked | close |

## Composition Notes

- The live Ireland page does **not** need an extra FAQ section in the visible main flow.
- The live Ireland page reads closer with a doctor spotlight/testimonial section than with a separate team-preview block in the middle of the page.
- The local route was adjusted to remove the extra team-preview and FAQ rendering from `/home`.

## Current Route Composition

Current local `/home` now renders:
1. Quick-link row
2. Ireland hero
3. Same-day consultation CTA
4. About us
5. Specialist consultations
6. How it works
7. Home delivery
8. Doctor spotlight / testimonials
9. Trust / standards
10. Bottom booking CTA
11. Shared footer

## Match Status Summary

- Header: close
- Quick-link row: close
- Hero: close
- Same-day CTA: close
- About section: close
- Specialist consultation grid: close
- How it works: close
- Home delivery: close
- Doctor spotlight: close
- Trust section: close
- Footer columns: close
- Footer CTA block: close

## Remaining Gaps

- Exact hero parity is blocked by the final Ireland hero artwork.
- About section parity is blocked by the approved clinic/about image.
- Doctor spotlight parity is blocked by the real portrait/testimonial image.
- Footer parity is blocked by the real shared logo and footer CTA artwork.
