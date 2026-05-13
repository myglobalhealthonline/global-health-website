# Homepage Clone Audit (`/`)

Source audited: `https://www.myglobalhealth.online/`
Target route: `frontend/app/(site)/page.tsx`

## Exact Section Map

| Order | Section Name | Background | Layout Type | Heading Text | CTA Text | Image / Asset | Desktop Layout | Tablet Layout | Mobile Layout | Current Local Match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Header | warm white `#FFFDFD` | sticky top nav | n/a | `Start Consultation` in header | shared logo | horizontal nav with dropdowns and right CTA | compressed horizontal nav | mobile trigger + slide-down menu | close |
| 2 | Hero | soft light background `#FBF9F9` / `#EDEDED` | centered copy above hero visual | `Medical Consultations Wherever You Are` | primary booking CTA and country-selection CTA | homepage hero image + logo branding | centered text, CTAs, image beneath | same centered stack | single-column centered stack | close |
| 3 | Country selector | light grey page background | 5-card country grid | no extra large heading above cards in some render states, country cards act as primary selection block | country entry links | country labels / country-specific art | multi-column grid | 2-column grid | stacked cards | close |
| 4 | How it works | white / light surface | 3-card process row | `How it works` | none inside section | simple step illustrations/icons | 3 columns | 2 columns | 1 column | close |
| 5 | Trust / standards | light page background | heading + feature cards | `Trusted by thousands of patients across Europe` | none | trust badges / iconography | centered intro, 4-up cards | 2-up cards | stacked cards | close |
| 6 | Footer columns | warm white `#FFFDFD` | logo + footer columns | footer only | footer links | shared footer logo | left brand block + columns | 2-column wrap | stacked | close |
| 7 | Footer CTA block | dark green `#1D4B36` | CTA bar with bullets | `Start Your Online Consultation` | `Start Consultation` | CTA/footer graphic + trust bullets | text left, CTA right | stacked CTA row | stacked | close |

## Composition Notes

- The live Wix homepage does **not** need a generic services-card grid in the main page flow.
- The primary homepage composition is hero -> country selection -> how-it-works -> trust -> footer content -> footer CTA.
- The local route was adjusted to remove the extra services section so it follows the live composition more closely.

## Current Route Composition

Current local `/` now renders:
1. Hero
2. Country selector
3. How it works
4. Trust / standards
5. Bottom booking CTA
6. Shared footer

## Match Status Summary

- Header: close
- Hero: close
- Country selector: close
- How it works: close
- Trust / standards: close
- Footer columns: close
- Footer CTA block: close

## Remaining Gaps

- Exact header parity is blocked by the real shared logo.
- Hero parity is blocked by the final root hero artwork and exact image crop.
- Country cards still use placeholder country markers rather than final country graphics.
- Footer CTA block still lacks the exact branded footer artwork used on Wix.
