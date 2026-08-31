import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";

/**
 * Render-time sanitizer for the admin-authored `body` field of a ContentPage.
 *
 * The admin editor is expected to sanitize on write, but render-time
 * enforcement is the security boundary that actually protects visitors:
 * a payload that slips past the editor (sanitizer bypass, direct DB write,
 * data import/migration) must never execute in a visitor's browser.
 *
 * The page body is prose (headings, paragraphs, lists, links, inline
 * emphasis, images). `<style>`/`<script>`, inline styles, and all event-handler
 * attributes are dropped. Presentation comes from the component's scoped CSS.
 */
const PAGE_BODY_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
  "figure",
  "figcaption",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "caption",
];

const PAGE_BODY_ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
  "*": ["class", "aria-label", "aria-hidden"],
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  th: ["scope", "colspan", "rowspan"],
  td: ["colspan", "rowspan"],
};

export function sanitizePageBodyHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: PAGE_BODY_ALLOWED_TAGS,
    allowedAttributes: PAGE_BODY_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

const CAREER_DESCRIPTION_ALLOWED_TAGS = [
  ...PAGE_BODY_ALLOWED_TAGS.filter((tag) => tag !== "img"),
  "div", "s", "del", "h1", "h5", "h6", "hr", "code", "pre",
];

/** Sanitize the richer HTML emitted by the careers editor without changing legal content rules. */
export function sanitizeCareerDescriptionHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: CAREER_DESCRIPTION_ALLOWED_TAGS,
    allowedAttributes: {
      ...PAGE_BODY_ALLOWED_ATTRIBUTES,
      "*": ["style", "dir", "lang", "aria-label", "aria-hidden"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: [/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/],
        "background-color": [/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/],
        "font-weight": [/^\d{3}$/, /^(normal|bold|bolder|lighter)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "font-family": [/^[a-zA-Z0-9\s,'"-]+$/],
        "font-size": [/^(10|12|14|16|18|24|32)px$/, /^(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)$/],
        "text-align": [/^(left|right|center|justify|start|end)$/],
        "text-decoration": [/^(none|underline|line-through|overline)$/],
        "line-height": [/^(1(?:\.\d{1,2})?|2(?:\.0{1,2})?)$/],
      },
    },
    // Force rel="noopener noreferrer" on every link so a target="_blank" in
    // admin-authored HTML can't reverse-tabnab the opener.
    transformTags: {
      h1: "h2",
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}
