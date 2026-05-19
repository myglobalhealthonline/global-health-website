import sanitizeHtmlLib from "sanitize-html";

/**
 * Strict allow-list sanitizer for admin-authored rich-text fields
 * (Service.detailBody, ContentPage.body, doctor bio).
 *
 * Why a strict list rather than DOMPurify's defaults:
 *   - Anything we let through gets `dangerouslySetInnerHTML`-ed onto
 *     the public site. The blast radius of accidentally allowing
 *     `<iframe>` / `<script>` / `on*` attrs is full stored-XSS.
 *   - Editors only need text formatting, links, lists, and images.
 *
 * If you need to add a tag, add it here and explain why in the diff.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "code",
  "pre",
  "hr",
  "span",
  "div",
];

export function sanitizeRichHtml(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  return sanitizeHtmlLib(trimmed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // Links: anchor only — no javascript: URLs, no target=_top tricks.
      a: ["href", "title", "rel", "target"],
      // Inline styling kept narrow: just colour + font-family + font-weight
      // + text-align so the rich-text editor's basic formatting survives.
      span: ["style"],
      div: ["style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
      li: ["style"],
      blockquote: ["style"],
    },
    // Stripe down to safe schemes + reject any inline event handlers.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {},
    allowedStyles: {
      "*": {
        color: [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/],
        "background-color": [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(.+\)$/],
        "font-weight": [/^\d{3}$/, /^(normal|bold|bolder|lighter)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "font-family": [/^[a-zA-Z0-9\s,'"-]+$/],
        "font-size": [/^\d{1,3}(px|pt|em|rem|%)$/],
        "text-align": [/^(left|right|center|justify|start|end)$/],
        "text-decoration": [/^(none|underline|line-through|overline)$/],
        "line-height": [/^[\d.]+$/, /^[\d.]+(px|em|rem|%)$/],
      },
    },
    transformTags: {
      // Force every anchor to noopener+noreferrer so an attacker can't
      // window.opener back into the admin tab. Keep target if set.
      a: (tagName, attribs) => {
        const next: Record<string, string> = { ...attribs };
        if (next.target === "_blank") {
          next.rel = `${next.rel ?? ""} noopener noreferrer`.trim();
        }
        return { tagName, attribs: next };
      },
    },
    disallowedTagsMode: "discard",
  });
}
