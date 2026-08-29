/**
 * Brand lockups used across the site + portals.
 *
 *  - `DEFAULT_BRAND_LOGO` (DARK) — green text + line on transparent.
 *    Use on light surfaces: public site header, mobile drawer, auth.
 *  - `DEFAULT_BRAND_LOGO_LIGHT` — white text + line on transparent.
 *    Use on dark surfaces: admin/doctor/patient portal sidebars, footer.
 *  - `DEFAULT_BRAND_ICON` — globe-only mark. For favicons + tight badges.
 *
 * Admin can override `DEFAULT_BRAND_LOGO` via the `site-logo` CMS asset
 * (see `resolveSiteLogoAsset`). That slot is reserved for an official Global
 * Health lockup: shared site chrome presents it with the registered-mark
 * treatment, so campaign or third-party artwork must use a different slot.
 */
export const DEFAULT_BRAND_LOGO = {
  src: "/logos/global-health-dark.png",
  alt: "Global Health — Medicine anytime anywhere",
} as const;

export const DEFAULT_BRAND_LOGO_LIGHT = {
  src: "/logos/global-health-light.png",
  alt: "Global Health — Medicine anytime anywhere",
} as const;

export const DEFAULT_BRAND_ICON = {
  src: "/favicon.png",
  alt: "Global Health",
} as const;
