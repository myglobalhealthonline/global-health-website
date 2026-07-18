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
 * emphasis, images). `<style>`/`<script>` and all event-handler attributes
 * are dropped. Presentation comes from the component's own scoped CSS, not
 * from inline styles in the body.
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
    // Force rel="noopener noreferrer" on every link so a target="_blank" in
    // admin-authored HTML can't reverse-tabnab the opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}
