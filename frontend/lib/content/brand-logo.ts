/**
 * Brand lockups used across the site + portals.
 *
 *  - `DEFAULT_BRAND_LOGO` (a.k.a. DARK) — green text + line on transparent
 *    background. Use on light surfaces: public site header, mobile drawer,
 *    auth pages.
 *  - `DEFAULT_BRAND_LOGO_LIGHT` — white text + line on transparent. Use on
 *    dark surfaces: admin / doctor / patient portal sidebars.
 *  - `DEFAULT_BRAND_ICON` — globe-only mark. Reserved for favicons, badges,
 *    and tight contexts where the wordmark won't fit.
 *
 * The admin can override `DEFAULT_BRAND_LOGO` via the `site-logo` CMS asset
 * (see `resolveSiteLogoAsset`). The light variant + icon are not yet CMS-
 * configurable because they're identity-critical lockups, not marketing
 * imagery.
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
