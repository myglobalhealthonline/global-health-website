import sanitizeHtmlLib from "sanitize-html";

/**
 * Defence-in-depth HTML sanitizer for doctor bio fields.
 *
 * The backend already runs every admin-authored bio through
 * `sanitize-html` (see `backend/src/utils/sanitize-html.ts`) at write
 * time, so by the time bytes reach the frontend they should already be
 * safe. We re-run the same library here against the same allow-list so
 * a backend bypass or a future content path that skips the backend
 * sanitizer still can't produce live HTML in the browser.
 *
 * Why not a homegrown regex pass: HTML parsers are forgiving with
 * malformed markup in ways regexes are not. `onerror=alert(1)` (no
 * quotes around the attribute value) sneaks past naive on-handler
 * strippers, and `<svg/onload=…>` style tricks bypass tag-name
 * filters. Pinning to the `sanitize-html` allow-list keeps both layers
 * honest.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "h2",
  "h3",
];

const ALLOWED_COLOR = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/;

function stripAllTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function toDoctorBioPlainText(raw: string): string {
  return stripAllTags(raw);
}

export function sanitizeDoctorBioHtml(raw: string): string {
  if (raw == null) return "";
  if (raw.length === 0) return "";
  // No tags at all → escape + wrap in <p> so the prose layout still
  // renders a paragraph (preserves the previous behavior).
  if (!raw.includes("<")) {
    const escaped = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<p>${escaped}</p>`;
  }

  return sanitizeHtmlLib(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      span: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {},
    allowedStyles: {
      span: {
        color: [ALLOWED_COLOR],
      },
    },
    disallowedTagsMode: "discard",
  });
}
