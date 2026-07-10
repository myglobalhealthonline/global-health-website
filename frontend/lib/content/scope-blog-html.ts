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
    (_match, attrs: string, css: string) => {
      const safeCss = hardenStyleBlockCss(css);
      // Dangerous or unbalanced CSS is dropped whole rather than partially
      // repaired — a half-fixed style block is how containment breaks.
      if (safeCss === null) return "";
      return `<style${attrs}>@scope (.${BLOG_SCOPE_CLASS}) {\n${safeCss}\n}</style>`;
    },
  );
}

/**
 * Stop-gap hardening of `<style>` block contents, applied before they're
 * wrapped in `@scope`. This is regex-based, NOT a CSS parser — it only
 * rejects the specific escape/tracking vectors called out in SECURITY_AUDIT2
 * finding S-011:
 *   - `@import` — would pull in an unscoped external stylesheet.
 *   - `url(...)` / `expression(...)` — external resource loads used for
 *     tracking pixels or (legacy IE) script execution.
 *   - Unbalanced braces — the actual "close the @scope block early and run
 *     unscoped CSS after it" containment escape. Comments are stripped first
 *     so a `}` hidden inside `/* ... *\/` can't be used to fake balance.
 * Returns null (meaning: drop the whole block) if any check trips, since a
 * regex can't safely repair CSS it can't parse.
 */
function hardenStyleBlockCss(css: string): string | null {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@import\b/i.test(withoutComments)) return null;
  if (/url\s*\(/i.test(withoutComments)) return null;
  if (/expression\s*\(/i.test(withoutComments)) return null;
  const openCount = (withoutComments.match(/\{/g) ?? []).length;
  const closeCount = (withoutComments.match(/\}/g) ?? []).length;
  if (openCount !== closeCount) return null;
  return withoutComments;
}
