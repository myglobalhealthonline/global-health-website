import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";

/** Wrapper class the public article body + its scoped CSS hang off. */
export const BLOG_SCOPE_CLASS = "gh-article-body";

const BLOG_ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "article",
  "aside",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "img",
  "section",
  "span",
  "style",
];

const BLOG_ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  "*": ["class", "id", "style", "aria-label", "aria-hidden"],
  a: ["href", "name", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading"],
};

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
  const sanitized = sanitizeHtml(html, {
    allowedTags: BLOG_ALLOWED_TAGS,
    allowedAttributes: BLOG_ALLOWED_ATTRIBUTES,
    // Constrain the inline `style` attribute to a presentational allowlist.
    // This keeps the rich-text editor's typography output (color, font,
    // alignment) while dropping layout-escape vectors an admin-authored or
    // imported payload could use to deface the page — position, z-index,
    // top/left/inset, transform, width/height, margin/padding. (Full CSS in
    // <style> blocks is separately contained via @scope below.)
    allowedStyles: {
      "*": {
        color: [/.*/],
        "background-color": [/.*/],
        "font-size": [/^[\d.]+(px|em|rem|%|pt)$/],
        "font-family": [/.*/],
        "font-weight": [/^(normal|bold|lighter|bolder|[1-9]00)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "text-decoration": [/^(none|underline|line-through|overline)$/],
        "line-height": [/^[\d.]+(px|em|rem|%)?$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    // Defence-in-depth: force rel="noopener noreferrer" on every link so a
    // target="_blank" in admin-authored HTML can't reverse-tabnab the opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });

  return sanitized.replace(
    /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, css: string) =>
      `<style${attrs}>@scope (.${BLOG_SCOPE_CLASS}) {\n${css}\n}</style>`,
  );
}
