# Asset Inventory

Scope for final public frontend polish:
- shared public shell
- `/`
- `/home`
- representative public templates and cards

## Blocking Launch

| Asset | Type | Current Path | Used In | Why It Blocks Launch | Status |
| --- | --- | --- | --- | --- | --- |
| Shared site logo | logo | `frontend/public/logos/global-health-logo-placeholder.svg` | Header, mobile nav, footer | Brand-ready launch should not ship with a placeholder logo | needs business approval |
| Footer CTA artwork | footer / CTA artwork | `frontend/public/images/footer/cta-footer-placeholder.svg` | Footer transition and CTA parity work | If final launch requires branded footer artwork, current placeholder is not ready | needs business approval |

## Nice-to-Have

| Asset | Type | Current Path | Used In | Why It Is Nice-to-Have | Status |
| --- | --- | --- | --- | --- | --- |
| Root homepage hero image | hero | `frontend/public/images/hero/homepage-hero-placeholder.svg` | `/` hero | Current text-first structure works; real art improves polish and trust | needs replacement |
| Ireland homepage hero image | hero | `frontend/public/images/hero/ireland-home-hero-placeholder.svg` | `/home` hero | Improves parity and production finish | needs replacement |
| Ireland about image | country graphic | `frontend/public/images/ireland/about-placeholder.svg` | `/home` about section | Improves realism and split-section balance | needs replacement |
| Ireland home-delivery artwork | country graphic | `frontend/public/images/ireland/home-delivery-placeholder.svg` | `/home` delivery section | Improves section polish | needs replacement |
| Branded service icon pack | service icons | `frontend/public/icons/services/*` | service cards across public pages | Generic icons are usable; branded set would improve consistency | needs business approval |
| Branded trust badges | trust icons | `frontend/public/icons/trust/*` | trust sections and related cards | Generic icons are usable; final set would improve trust signaling | needs business approval |
| Country graphics / flags | country graphics | `frontend/public/icons/countries/*` | country selector and future country accents | Current simple labels work; visuals would improve recognition | needs replacement |

## Can Stay Temporary

| Asset | Type | Current Path | Used In | Why It Can Stay Temporary | Status |
| --- | --- | --- | --- | --- | --- |
| Doctor card placeholder panels | doctor image placeholder | inline placeholder panel in shared card/template components | team pages and doctor profiles | Clean, neutral placeholder treatment does not break usability before final portraits arrive | can stay temporary |
| Ireland doctor spotlight image | doctor image | `frontend/public/images/ireland/doctor-spotlight-placeholder.svg` | `/home` testimonial / doctor spotlight | Usable for pre-integration frontend review if the business has not approved final portrait yet | needs business approval |
| Text-first consultation listing pages | hero/illustration optional | none | `/general-consultation-*`, `/specialty-*` | These pages remain credible without hero art as long as hierarchy and CTA clarity stay strong | can stay temporary |

## Needs Business Approval

| Asset | Type | Current Path | Used In | Approval Need | Status |
| --- | --- | --- | --- | --- | --- |
| Final shared logo pack | logo | `frontend/public/logos/global-health-logo-placeholder.svg` | sitewide | Brand approval required before replacing placeholder | needs business approval |
| Doctor portraits / testimonial photos | doctor image | placeholder panels and `/images/ireland/doctor-spotlight-placeholder.svg` | `/home`, team/profile pages | People imagery should not be swapped without approval | needs business approval |
| Trust badge artwork | trust icons | `frontend/public/icons/trust/*` | trust sections | Must match legal/brand language and visual style | needs business approval |
| Final service icon set | service icons | `frontend/public/icons/services/*` | service cards | Must match brand system and information architecture | needs business approval |
| Footer CTA decorative art | footer / CTA artwork | `frontend/public/images/footer/cta-footer-placeholder.svg` | shared footer CTA | Requires brand review before final use | needs business approval |

## Notes

- Do not hotlink Wix CDN assets in production.
- Do not use random stock imagery.
- Placeholder assets should keep correct dimensions and crop behavior, but should never be presented as final approved brand assets.
