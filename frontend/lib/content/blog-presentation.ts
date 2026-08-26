/**
 * One-article visual pilot approved before any blog-wide rollout.
 * Keep this list explicit: adding a slug changes a public article's layout.
 */
const CALM_EDITORIAL_PILOT_SLUGS = new Set([
  "hand-foot-and-mouth-disease-signs-and-treatment",
]);

export function isCalmEditorialBlogPilot(slug: string): boolean {
  return CALM_EDITORIAL_PILOT_SLUGS.has(slug);
}
