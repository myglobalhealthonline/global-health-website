/** Wrapper class the public article body + its scoped CSS hang off. */
export const BLOG_SCOPE_CLASS = "gh-article-body";

/**
 * Contain an admin-authored article's own CSS so it can't bleed into the
 * surrounding site chrome (header / footer / CTA).
 *
 * Every `<style>` block in the article HTML is wrapped in
 * `@scope (.gh-article-body) { … }`. Inside an `@scope` block, selectors only
 * match elements within the scope root, so even bare global selectors like
 * `body {}`, `h2 {}` or `* {}` can only affect the article — the rest of the
 * page is untouched. (`@scope` is supported by all current evergreen
 * browsers; where unsupported the block is ignored, leaving the article
 * unstyled but the site intact.)
 */
export function scopeBlogHtml(html: string): string {
  if (!html) return html;
  return html.replace(
    /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, css: string) =>
      `<style${attrs}>@scope (.${BLOG_SCOPE_CLASS}) {\n${css}\n}</style>`,
  );
}
