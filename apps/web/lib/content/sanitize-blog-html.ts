import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "blockquote",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "span",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "pre",
  "code",
  "div",
] as const;

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"] as const;

/**
 * Sanitizes admin-provided blog HTML into a safe subset for public rendering.
 * Keeps common editorial markup while stripping executable payloads.
 */
export function sanitizeBlogHtml(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class"],
    },
    allowedSchemes: [...ALLOWED_SCHEMES],
    allowProtocolRelative: false,
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    nonBooleanAttributes: ["target", "rel", "class"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    },
  }).trim();
}
