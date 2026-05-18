/**
 * Brand lockup. Points to one PNG on disk so the user only needs to
 * replace a single file when the brand evolves. Dark-surfaced contexts
 * (admin/doctor/patient sidebars, footer) layer a
 * `filter: brightness(0) invert(1)` to render the same lockup white —
 * avoids shipping two near-identical assets.
 *
 * The admin can also override this via the `site-logo` CMS asset
 * (see `resolveSiteLogoAsset`).
 */
export const DEFAULT_BRAND_LOGO = {
  src: "/logos/global-health-official.png",
  alt: "Global Health — Medicine anytime anywhere",
} as const;
