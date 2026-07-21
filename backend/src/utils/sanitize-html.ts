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
  // Blog bodies (admin-uploaded HTML articles) need images, figures and
  // tables. These are structural/content tags with no script execution;
  // attributes are still whitelisted below and img src is http/https only.
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "colgroup",
  "col",
];

/**
 * Permissive sanitizer for full, self-styled blog articles. Unlike
 * `sanitizeRichHtml`, this KEEPS `<style>` blocks, `class`/`id`, and all
 * inline styles + layout/structural tags so a designed HTML article renders
 * as authored. It is ONLY safe because containment happens at the render
 * site: the frontend wraps this HTML in `.gh-article-body` and
 * `scope-blog-html.ts` rewrites every `<style>` into
 * `@scope (.gh-article-body) { … }` (CSS scoping — NOT a Shadow DOM), plus
 * the output is double-sanitized, and because we still strip every script
 * vector here:
 *   - <script>, <iframe>, <object>, <embed>, <form>/<input>/<button>, <link>,
 *     <meta>, <base> are dropped (not in the allow-list).
 *   - on* event handlers and javascript:/data: URLs are dropped.
 */
const BLOG_ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small",
  "sub", "sup", "abbr", "q", "cite", "wbr",
  "ul", "ol", "li", "dl", "dt", "dd", "blockquote", "pre", "code", "kbd", "samp", "var",
  "h1", "h2", "h3", "h4", "h5", "h6", "a", "hr",
  "div", "span", "section", "article", "header", "footer", "main", "aside", "nav",
  "figure", "figcaption", "address", "time", "details", "summary",
  "img", "picture", "source",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  // Inline SVG icons (shapes only — no <use>/<foreignObject>/href, no script surface).
  "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse",
  "style",
];

const BLOG_COMMON_ATTRS = ["class", "id", "style", "title", "role", "dir", "lang", "align"];

const SVG_PRESENTATION_ATTRS = [
  "viewbox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap",
  "stroke-linejoin", "stroke-dasharray", "opacity", "transform", "focusable",
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points",
];

export function sanitizeBlogHtml(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  return sanitizeHtmlLib(trimmed, {
    allowedTags: BLOG_ALLOWED_TAGS,
    // We allow <style> for designed articles; safe because output renders in
    // an isolated Shadow DOM and scripts are stripped. No <script> is allowed.
    // The containment contract lives at the render site: the frontend wraps
    // this HTML in `.gh-article-body` and `scope-blog-html.ts` rewrites every
    // <style> into `@scope (.gh-article-body) { … }`. If that render-side
    // scoping is ever removed, `<style>` here stops being safe.
    allowVulnerableTags: true,
    allowedAttributes: {
      "*": [...BLOG_COMMON_ATTRS, "aria-label", "aria-hidden", "aria-labelledby", "aria-describedby"],
      a: [...BLOG_COMMON_ATTRS, "href", "name", "target", "rel"],
      img: [...BLOG_COMMON_ATTRS, "src", "srcset", "sizes", "alt", "width", "height", "loading"],
      source: ["src", "srcset", "sizes", "type", "media"],
      td: [...BLOG_COMMON_ATTRS, "colspan", "rowspan"],
      th: [...BLOG_COMMON_ATTRS, "colspan", "rowspan", "scope"],
      col: [...BLOG_COMMON_ATTRS, "span"],
      colgroup: [...BLOG_COMMON_ATTRS, "span"],
      time: [...BLOG_COMMON_ATTRS, "datetime"],
      details: [...BLOG_COMMON_ATTRS, "open"],
      svg: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS, "xmlns", "aria-hidden"],
      g: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      path: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      circle: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      rect: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      line: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      polyline: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      polygon: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
      ellipse: [...BLOG_COMMON_ATTRS, ...SVG_PRESENTATION_ATTRS],
    },
    // No allowedStyles filter → inline styles pass through verbatim (layout,
    // spacing, colour, grid/flex all survive). Safe inside the Shadow DOM.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
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

export function sanitizeRichHtml(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  return sanitizeHtmlLib(trimmed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // Links: anchor only — no javascript: URLs, no target=_top tricks.
      a: ["href", "title", "rel", "target"],
      // Images in blog bodies. No on* handlers (not listed = stripped);
      // src restricted to http/https via allowedSchemesByTag below.
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "scope", "style"],
      col: ["span", "style"],
      colgroup: ["span", "style"],
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
    // Images must load over http/https only — block data: (SVG-in-data XSS
    // vectors) and any other scheme.
    allowedSchemesByTag: { img: ["http", "https"] },
    allowedStyles: {
      "*": {
        color: [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/],
        "background-color": [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(.+\)$/],
        "font-weight": [/^\d{3}$/, /^(normal|bold|bolder|lighter)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "font-family": [/^[a-zA-Z0-9\s,'"-]+$/],
        // Numeric units plus the CSS keyword sizes that contentEditable's
        // execCommand("fontSize", 1-7) emits (e.g. "large", "x-large"). Without
        // the keyword branch the rich-text size control is stripped on save.
        "font-size": [
          /^\d{1,3}(px|pt|em|rem|%)$/,
          /^(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)$/,
        ],
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
