# Asset Inventory

Scope for current parity work:
- `/`
- `/home`
- `/general-consultation-ie`
- `/general-consultation-pt`
- `/general-consultation-sp`
- `/general-consultation-cz`
- `/general-consultation-rm`

## Blocking Exact Parity

| Asset | Route | Current Path | Why It Blocks Exact Parity | Status |
| --- | --- | --- | --- | --- |
| Shared site logo | `/`, `/home` | `frontend/public/logos/global-health-logo-placeholder.svg` | Header and footer cannot match the Wix branding exactly without the real logo artwork | needs approval |
| Root homepage hero image | `/` | `frontend/public/images/hero/homepage-hero-placeholder.svg` | Hero crop/composition cannot match exactly | needs replacement |
| Ireland homepage hero image | `/home` | `frontend/public/images/hero/ireland-home-hero-placeholder.svg` | Ireland hero cannot match exact Wix composition | needs replacement |
| Ireland about image | `/home` | `frontend/public/images/ireland/about-placeholder.svg` | About split section cannot match exact visual balance | needs replacement |
| Ireland doctor portrait | `/home` | `frontend/public/images/ireland/doctor-spotlight-placeholder.svg` | Testimonial/doctor spotlight cannot match exact Wix section | needs approval |
| Ireland home-delivery artwork | `/home` | `frontend/public/images/ireland/home-delivery-placeholder.svg` | Delivery section cannot match exact composition | needs replacement |
| Footer CTA artwork | `/`, `/home` | `frontend/public/images/footer/cta-footer-placeholder.svg` | Bottom CTA/footer transition cannot fully match the live site | needs replacement |

## Already Migrated

| Asset | Route | Current Path | Notes | Status |
| --- | --- | --- | --- | --- |
| Placeholder country labels | `/` | inline labels in country cards | Functional and sized to current layout | migrated |
| Shared service icon set | `/`, `/home` | `frontend/public/icons/services/*` | Generic but reusable placeholder icon set exists | migrated |
| Shared trust icon set | `/`, `/home` | `frontend/public/icons/trust/*` | Generic trust icon set exists | migrated |

## Needs Approval

| Asset | Route | Current Path | Notes | Status |
| --- | --- | --- | --- | --- |
| Final logo pack | `/`, `/home` | `frontend/public/logos/global-health-logo-placeholder.svg` | Shared logo should be approved before replacement | needs approval |
| Ireland doctor/testimonial image | `/home` | `frontend/public/images/ireland/doctor-spotlight-placeholder.svg` | Live portrait should not be treated as final without approval | needs approval |
| Branded service icons | `/`, `/home` | `frontend/public/icons/services/*` | Current icons are generic placeholders | needs approval |
| Branded trust badges | `/`, `/home` | `frontend/public/icons/trust/*` | Current badges are generic placeholders | needs approval |

## Nice-to-Have

| Asset | Route | Current Path | Why Nice-to-Have | Status |
| --- | --- | --- | --- | --- |
| Country flag/graphic set | `/` | `frontend/public/icons/countries/*` | Improves country selector fidelity but does not block structure | needs replacement |
| Additional footer decorative graphics | `/`, `/home` | `frontend/public/images/footer/cta-footer-placeholder.svg` | Improves exact footer feel after core parity is approved | needs replacement |
| Consultation category icons pack | `/general-consultation-*` | `frontend/public/icons/consultations/*` | Current pages rely on generic Lucide icons; a branded icon pack would improve visual consistency | needs replacement |

## General Consultation Pages (Design System Pass)

| Asset | Route | Current Path | Notes | Status |
| --- | --- | --- | --- | --- |
| Consultation hero visual per country | `/general-consultation-*` | none (text-first hero) | Optional enhancement; no blocking regression for responsive or content flow | needs audit |
| Country-specific service illustration set | `/general-consultation-*` | none (icon cards only) | Add only when approved assets exist; do not hotlink Wix | needs audit |

## Notes

- Do not hotlink Wix CDN assets in production.
- Do not use random stock imagery.
- Placeholder assets should be sized and cropped to mimic the Wix layout, but not represented as final artwork.
