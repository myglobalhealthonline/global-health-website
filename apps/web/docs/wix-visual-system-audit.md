# Wix Visual System Audit

Reference site audited:
- `https://www.myglobalhealth.online/`
- `https://www.myglobalhealth.online/home`

Method:
- live HTML/CSS variable extraction from Wix runtime
- page structure review from the live rendered output
- inferred layout measurements where exact CSS values are not directly exposed

## Core Colors

Exact values extracted from live CSS variables:

| Token | Wix source value | Hex |
| --- | --- | --- |
| Primary brand | `29,75,54` | `#1D4B36` |
| Base page background | `237,237,237` | `#EDEDED` |
| Main white surface | `255,253,253` | `#FFFDFD` |
| Soft panel background | `246,245,245` | `#F6F5F5` |
| Softest background | `251,249,249` | `#FBF9F9` |
| Accent blue tint | `213,223,240` | `#D5DFF0` |
| Accent deep blue | `0,58,150` | `#003A96` |
| Text / dark green | `29,75,54` | `#1D4B36` |

Relevant Wix button variables:

| Variable | Mapped value |
| --- | --- |
| `--wst-button-color-fill-primary` | `rgb(var(--color_48))` = `#1D4B36` |
| `--wst-button-color-border-primary` | `rgb(var(--color_49))` = `#1D4B36` |
| `--wst-button-color-text-primary` | `rgb(var(--color_50))` = `#FFFFFF` |
| `--wst-button-color-fill-secondary` | `rgb(var(--color_57))` = `#EDEDED` |
| `--wst-button-color-text-secondary` | `rgb(var(--color_59))` = `#FFFDFD` |

## Typography

Exact font variables extracted from live CSS:

| Usage | Wix variable | Extracted value |
| --- | --- | --- |
| Hero / H1 | `--font_0` | `bold 80px/1em ... plus_jakarta_sans_extrabold` |
| H2 | `--font_2` | `bold 64px/1.2em ... plus_jakarta_sans_extrabold` |
| H3 | `--font_3` | `bold 44px/1.2em ... plus_jakarta_sans_extrabold` |
| H4 | `--font_4` | `32px/1.3em ... plus_jakarta_sans_extrabold` |
| H5 | `--font_5` | `24px/1.4em ... plus_jakarta_sans_extrabold` |
| H6 | `--font_6` | `20px/1.5em ... plus_jakarta_sans_extrabold` |
| Body large | `--font_7` | `18px/1.3em ... plus_jakarta_sans_medium` |
| Body medium | `--font_8` | `16px/1.4em ... plus_jakarta_sans_medium` |
| Body small | `--font_9` | `14px/1.3em ... plus_jakarta_sans_medium` |
| Small utility | `--font_10` | `12px/1.4em din-next-w01-light` |

Working interpretation for the clone:
- Main family: `Plus Jakarta Sans`
- Heading weight: `800`
- Body weight: `500`
- Small utility text: `12px` to `14px`

## Spacing Scale

Inferred from live layout structure and section rhythm:

| Area | Approximate Wix behavior |
| --- | --- |
| Header height | `~88px` |
| Main container width | `~1180px` visual cap |
| Vertical section spacing | `~80px` to `96px` desktop |
| Card gap | `16px` to `24px` |
| CTA/button horizontal padding | `24px` to `28px` |
| CTA/button vertical padding | `12px` to `14px` |

## Border Radius

Approximate from live card/button shape:

| Element | Approximate radius |
| --- | --- |
| Primary buttons | `999px` pill |
| Secondary buttons | `999px` pill |
| Cards | `24px` |
| Large image frames / CTA blocks | `28px` to `30px` |

## Shadows

Approximate from live visual treatment:

| Element | Approximate effect |
| --- | --- |
| Standard cards | soft lifted shadow, low spread |
| Hero / highlighted image frames | deeper soft shadow |
| Header | minimal or none, mostly border separation |

Working clone values used:
- card shadow: `0 18px 40px rgba(29, 75, 54, 0.08)`
- elevated shadow: `0 24px 60px rgba(29, 75, 54, 0.12)`

## Header Styles

Observed:
- warm white background
- dark green navigation text
- tight but readable desktop spacing
- prominent right-aligned primary CTA
- image logo area rather than plain text wordmark

Clone direction:
- `88px` header height
- light border
- image logo placeholder block
- pill navigation and CTA

## Footer Styles

Observed:
- footer content sits on warm white
- dark green text treatment
- bottom CTA area is dark green with white text
- columns are simple and lightly spaced

Clone direction:
- light footer columns first
- green CTA footer block after columns
- softer legal row treatment

## Button Styles

Primary:
- dark green fill
- white text
- pill radius
- medium shadow

Secondary:
- white or pale fill
- dark green text
- bordered pill

## Card Styles

Observed / inferred:
- mostly white cards on a light grey page
- rounded corners
- restrained shadows
- dark green headings
- body text is muted green/grey

## Section-by-Section Notes

### Root `/`
- Hero is centered with a large image under the copy.
- Country selector cards are visually clean, light, and evenly spaced.
- How-it-works cards are simple, icon-led, and not overly heavy.
- Trust and CTA sections rely on green/white contrast more than gradients.

### Ireland `/home`
- Quick-link row is compact and sits immediately under the header.
- Hero uses a split layout with strong left copy and a right visual.
- Same-day consultation CTA is a strong dark-green promo block.
- About, home-delivery, and doctor spotlight sections rely on large image panels and lighter surrounding backgrounds.
- Footer CTA is visually strong and near the bottom of the flow.
