# Asset Inventory

Asset migration plan for the cloned public homepage routes.
This inventory covers the root homepage `/` and the Ireland country homepage `/home`.

## Root Homepage (`/`)

| Asset Category | Exact Placeholder File Path | Where It Is Used | Replace With Wix Asset / Brand Asset | Status |
| --- | --- | --- | --- | --- |
| hero | `frontend/public/images/hero/homepage-hero-placeholder.svg` | [page.tsx](C:\Users\kingh\Desktop\NashaaFrontend\global-health-website\frontend\app\(site)\page.tsx) via `HeroSection.heroImage` | Root homepage hero image shown under the main heading | needs replacement |

## Ireland Homepage (`/home`)

| Asset Category | Exact Placeholder File Path | Where It Is Used | Replace With Wix Asset / Brand Asset | Status |
| --- | --- | --- | --- | --- |
| hero | `frontend/public/images/hero/ireland-home-hero-placeholder.svg` | [page.tsx](C:\Users\kingh\Desktop\NashaaFrontend\global-health-website\frontend\app\(site)\home\page.tsx) via `countryHome.hero.heroImage` | Wix `/home` hero image (`hero2.jpg`) | needs replacement |
| clinic/location graphic | `frontend/public/images/ireland/about-placeholder.svg` | Ireland about section in `CountryHomeTemplate` | Wix `/home` about/clinic image near “Quality Healthcare, Without Leaving Home” | needs replacement |
| doctor/team image | `frontend/public/images/ireland/doctor-spotlight-placeholder.svg` | Ireland doctor spotlight section in `CountryHomeTemplate` | Wix `/home` doctor portrait / testimonial image near Dr. Khoiamul Islam quote | needs approval |
| badge / service graphic | `frontend/public/images/ireland/home-delivery-placeholder.svg` | Ireland home-delivery section in `CountryHomeTemplate` | Wix `/home` home delivery artwork | needs replacement |

## Prepared Placeholder Assets Not Yet Wired Into Production Sections

| Asset Category | Exact Placeholder File Path | Where It Is Intended To Be Used | Replace With Wix Asset / Brand Asset | Status |
| --- | --- | --- | --- | --- |
| logo | `frontend/public/logos/global-health-logo-placeholder.svg` | Header/footer logo once image branding replaces the text wordmark | Main Wix header/footer logo image | needs approval |
| icon | `frontend/public/icons/trust/licensed-doctors.svg` | Root or country trust illustration for licensed doctors | Wix trust illustration associated with “Licensed Doctors” | needs approval |
| icon | `frontend/public/icons/trust/secure-confidential.svg` | Root or country trust illustration for secure/confidential messaging | Wix trust illustration associated with “Secure & Confidential” | needs approval |
| icon | `frontend/public/icons/trust/fast-access.svg` | Root or country trust illustration for fast access messaging | Wix trust illustration associated with “Fast Access” | needs approval |
| country graphic | `frontend/public/icons/countries/ie-placeholder.svg` | Ireland badge/flag in selector or availability section | Wix Ireland country graphic / flag artwork | needs replacement |
| country graphic | `frontend/public/icons/countries/pt-placeholder.svg` | Portugal badge/flag in selector or availability section | Wix Portugal country graphic / flag artwork | needs replacement |
| country graphic | `frontend/public/icons/countries/es-placeholder.svg` | Spain badge/flag in selector or availability section | Wix Spain country graphic / flag artwork | needs replacement |
| country graphic | `frontend/public/icons/countries/cz-placeholder.svg` | Czechia badge/flag in selector or availability section | Wix Czechia country graphic / flag artwork | needs replacement |
| country graphic | `frontend/public/icons/countries/ro-placeholder.svg` | Romania badge/flag in selector or availability section | Wix Romania country graphic / flag artwork | needs replacement |
| icon | `frontend/public/icons/services/general-consultation.svg` | Future service icon in root or country consultation cards | Wix service/category icon for general consultation | needs approval |
| icon | `frontend/public/icons/services/specialist.svg` | Future service icon in root or country consultation cards | Wix service/category icon for specialist consultation | needs approval |
| icon | `frontend/public/icons/services/prescription.svg` | Future service icon in root or country consultation cards | Wix service/category icon for online prescription | needs approval |
| footer | `frontend/public/images/footer/cta-footer-placeholder.svg` | Future bottom CTA/footer decorative area | Wix CTA/footer artwork near “Start Your Online Consultation” | needs replacement |

## Assets Needed From Business / Team

1. Approved header/footer logo currently used on the Wix site.
2. Approved root homepage hero artwork.
3. Approved Ireland homepage hero artwork.
4. Ireland about-section clinic image.
5. Ireland doctor/team portrait or approved testimonial artwork.
6. Ireland home-delivery artwork.
7. Approved country flags / country graphics.
8. Approved trust illustrations and service/category icons.
9. Final CTA/footer artwork used on the bottom conversion block.

## Notes

- Do not hotlink Wix CDN assets in production.
- Do not substitute random stock imagery.
- Public Wix assets still need explicit approval before being treated as final migrated brand assets.
