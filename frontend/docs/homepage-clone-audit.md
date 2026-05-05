# Homepage Clone Audit (`/`)

Source audited: `https://www.myglobalhealth.online/` (homepage)
Target route: `frontend/app/(site)/page.tsx`

## Section-by-Section Breakdown

1. Header
- Sticky white header with logo, clinics/about dropdowns, utility links, auth link, and primary booking CTA.
- Implemented via existing `SiteHeader` in route layout.

2. Hero
- Includes medical clinic positioning, main H1, short support text, primary + secondary CTA, trust badges, and hero visual.
- Implemented with `HeroSection` and local placeholder hero image.

3. Country Selector
- Grid of country-entry cards with country code badges and entry CTA.
- Implemented with `CountrySelector` using `activeCountries` routes.

4. How It Works
- Three-step guided flow matching Wix sequence: location/specialty, consultation type, email confirmation.
- Implemented with `HowItWorks` upgraded to structured step cards.

5. Trust/Benefits
- Trust heading + strict standards message + four benefits (rating, licensed doctors, confidentiality, fast access).
- Implemented with upgraded `TrustSignals` cards.

6. Service/Category Section
- Grid of common consultation categories/services and booking-related options.
- Implemented with `ServicesGrid` and route-safe links.

7. Booking CTA
- Prominent conversion strip with clear action text and primary button.
- Implemented with `BookingCTA`.

8. Footer
- Existing footer CTA + columns + contact/legal links preserved via `SiteFooter` layout.

## Visual Notes
- Color direction aligned to cyan/teal healthcare palette from source.
- Rounded cards, soft borders, and gradient CTA blocks used to match Wix style language.
- Spacing tuned for stacked mobile and wider desktop blocks.
- One H1 kept on page.

## Responsive Notes
- Checked layout behavior at target widths by class design:
  - 320, 375, 390, 430: single-column sections/cards; CTA buttons stack/wrap; no forced min-width overflow.
  - 768: two-column card grids begin where intended.
  - 1024, 1280, 1440: hero and section containers capped for readable line lengths, multi-column grids active.
- No horizontal-scroll utilities or fixed oversized elements introduced.

## Assets Needed
- Logo variants (final brand files)
- Final hero artwork
- Country flag/badge set
- Trust icons and service icons (brand-approved)
- Footer CTA decorative graphic

See: `frontend/docs/asset-inventory.md`

## Implementation Notes
- Existing route architecture untouched.
- Homepage now composes required section components in target order.
- Components upgraded with backward-compatible props to avoid route breakage.

## Remaining Gaps
- Real brand image assets are still placeholders pending approval/migration.
- Exact typography family from Wix is not yet confirmed; current site font stack remains project default.
- Trust/service icon artwork can be swapped after final asset pack is approved.

## Visual QA Checklist

Method used: live Wix homepage source review plus implemented `/` component/layout review at the requested breakpoint ranges.

| Area | Match Status | Notes | Suggested Fix |
| --- | --- | --- | --- |
| Hero spacing | partially matched | Current hero has clean spacing and scales safely, but the live Wix page uses a denser stack around the logo/hero image and slightly tighter content grouping. | Tighten top spacing between header and hero copy, and introduce the real hero/logo asset set before final polish. |
| Heading size | partially matched | Current `h1` scales well from mobile to desktop, but the live Wix heading reads slightly smaller relative to the hero visual and uses a less bold overall typographic balance. | Reduce desktop hero heading scale one step and revisit font family once approved brand typography is available. |
| Button styles | partially matched | Rounded primary/secondary CTA treatment is directionally correct, but the live buttons are visually flatter and more brand-specific. | Match border radius, padding, and fill/border contrast more closely after approved design tokens are confirmed. |
| Country selector layout | matched | Five-country grid order and card CTA behavior align well with the source intent and collapse safely on mobile widths. | Replace code-badge placeholders with final country graphics or flags. |
| How-it-works section | matched | Section order, three-step structure, and copy intent match the Wix homepage well. Mobile and tablet stacking logic is sound. | Add final step icons only after approved assets are available. |
| Services grid | partially matched | Useful service coverage exists, but the live Wix homepage is less card-heavy and more branded in its visual treatment. | Rebalance card density and add approved service iconography if the business wants closer visual parity. |
| Trust/benefit section | partially matched | Messaging is aligned, but the live Wix page uses image-backed trust blocks and country availability graphics that the current implementation does not yet replicate. | Introduce approved trust illustrations and available-in-Europe country artwork. |
| CTA section | partially matched | Core CTA copy is present, but the live Wix bottom CTA includes decorative imagery and supporting trust bullets/checkmarks around it. | Add approved CTA graphics and supporting trust bullet treatment after asset approval. |
| Header visual match | not matched | Routing and menu behavior are preserved, but the live header uses a graphic logo and a more branded navigation presentation than the current text-wordmark header. | Replace text wordmark with approved logo asset and refine nav spacing/CTA styling. |
| Footer visual match | not matched | Current footer preserves link structure, but the live Wix homepage has a different visual hierarchy and places its heavier CTA/trust artwork lower in the footer experience. | Reorder footer CTA/trust presentation to match the source after homepage review approval. |
| Mobile menu behavior | matched | Existing Radix dialog menu should behave safely across the requested mobile widths, with scrollable content and persistent CTA. | Keep current behavior; only style-polish after visual review. |
| No horizontal scroll | matched | Current homepage sections use capped containers, wrapping CTA rows, and responsive grids with no obvious overflow risk at 320px through 1440px. | Re-check after any future asset swaps, especially wide logo or hero artwork. |

Legend:
- `matched`: close enough for this pass
- `partially matched`: structurally right but still needs visual parity work
- `not matched`: clear visual/ordering difference from the live Wix page
