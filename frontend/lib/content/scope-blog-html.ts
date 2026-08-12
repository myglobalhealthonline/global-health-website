import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";
import postcss from "postcss";

/** Wrapper class the public article body + its scoped CSS hang off. */
export const BLOG_SCOPE_CLASS = "gh-article-body";

/**
 * At-rules that either escape `@scope` containment or pull in unscoped external
 * resources. Dropped (not repaired) whenever they appear in author CSS.
 *   - `import`    — loads an external, unscoped stylesheet.
 *   - `charset`   — no effect inside an inline block; only appears via injection.
 *   - `namespace` — XML-namespace selectors, an escape/obfuscation vector.
 */
const DENIED_AT_RULES = new Set(["import", "charset", "namespace"]);

/**
 * `@keyframes` names are GLOBAL — `@scope` contains selectors but not keyframe
 * identifiers, so an author animation named `spin` would collide with (or be
 * shadowed by) any site keyframes of the same name. Every author keyframe is
 * renamed with this prefix and its `animation` / `animation-name` references
 * rewritten to match, so author animations stay self-contained.
 */
const KEYFRAME_PREFIX = "ghblog-";

/**
 * Marker stamped on every `<h1>` the sanitizer demotes to `<h2>` (see
 * `transformTags` below). Author CSS selectors that target `h1` are rewritten
 * onto `h2[data-blog-h1]` so the demotion stays invisible: the attribute adds
 * one specificity point, which beats the author's own generic `h2` rule at the
 * same class depth regardless of source order.
 */
const DEMOTED_H1_ATTR = "data-blog-h1";

/** `h1` used as a TYPE selector — not `.h1`, `#h1`, `[x=h1]` or `h1-foo`. */
const H1_TYPE_SELECTOR = /(^|[\s>+~,(])h1(?![-\w])/gi;
/** Non-global twin of {@link H1_TYPE_SELECTOR}; `.test()` on a /g regex is
 *  stateful via lastIndex and would skip every other match. */
const H1_TYPE_SELECTOR_TEST = /(^|[\s>+~,(])h1(?![-\w])/i;

// Mirrors the backend's sanitizeBlogHtml allow-list (backend/src/utils/
// sanitize-html.ts) so a designed article that survives save also survives
// render. Keep the two lists in sync.
const BLOG_ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "article",
  "aside",
  "details",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "header",
  "footer",
  "img",
  "mark",
  "picture",
  "section",
  "source",
  "span",
  "summary",
  "time",
  // Inline SVG icons (shapes only — no <use>/<foreignObject>/href).
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "style",
];

const SVG_PRESENTATION_ATTRS = [
  "viewbox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap",
  "stroke-linejoin", "stroke-dasharray", "opacity", "transform", "focusable",
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points",
];

const BLOG_ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  "*": ["class", "id", "style", "title", "role", "dir", "lang", "aria-label", "aria-hidden", "aria-labelledby", "aria-describedby", DEMOTED_H1_ATTR],
  a: ["class", "id", "href", "name", "target", "rel", "title"],
  img: ["class", "id", "src", "srcset", "sizes", "alt", "title", "width", "height", "loading"],
  source: ["src", "srcset", "sizes", "type", "media"],
  details: ["class", "id", "open"],
  time: ["class", "id", "datetime"],
  svg: [...SVG_PRESENTATION_ATTRS, "class", "id", "xmlns", "aria-hidden"],
  g: [...SVG_PRESENTATION_ATTRS, "class"],
  path: [...SVG_PRESENTATION_ATTRS, "class"],
  circle: [...SVG_PRESENTATION_ATTRS, "class"],
  rect: [...SVG_PRESENTATION_ATTRS, "class"],
  line: [...SVG_PRESENTATION_ATTRS, "class"],
  polyline: [...SVG_PRESENTATION_ATTRS, "class"],
  polygon: [...SVG_PRESENTATION_ATTRS, "class"],
  ellipse: [...SVG_PRESENTATION_ATTRS, "class"],
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
    // <style> is deliberate: its contents are hardened + @scope-wrapped below.
    allowVulnerableTags: true,
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
    transformTags: {
      // Defence-in-depth: force rel="noopener noreferrer" on every link so a
      // target="_blank" in admin-authored HTML can't reverse-tabnab the opener.
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
      // SEO audit Phase 4 #4 — the page template already renders the post
      // title as the page's one <h1> (blog-post-page.tsx). An admin-authored
      // body that also opens with its own <h1> (rich-text paste, or a
      // designed article's own heading) produces two <h1>s per page. Demote
      // every body h1 to h2 at render time. All flagged articles are on the
      // same shared template, so fixing it here (not per-article content)
      // prevents any future admin-authored post from reintroducing it.
      //
      // The demoted node is stamped with `data-blog-h1`; hardenStyleBlockCss
      // below rewrites the author's own `h1` selectors onto it. Without that,
      // a designed article whose CSS says `.gh-blog h1 { color:#FFF }` over a
      // dark hero fell through to its `h2` rule and rendered forest-on-forest
      // at 1.36:1 — the demotion is only "semantic, never visual" once the
      // author's h1 styling follows the element.
      h1: sanitizeHtml.simpleTransform("h2", { [DEMOTED_H1_ATTR]: "" }, true),
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
 * Harden a `<style>` block's contents with a REAL CSS parser (postcss) before
 * it's wrapped in `@scope`. Replaces the old regex/brace-counting scoper whose
 * parser-differential (what the regex sees vs. what a browser parses) was the
 * containment-escape risk in SEC-007.
 *
 * The parse-then-reserialize round-trip is itself the core defence: postcss
 * only ever emits structurally well-formed, balance-guaranteed CSS, so the
 * "close the `@scope` block early and run unscoped rules after it" escape is no
 * longer expressible in the output regardless of how the input was crafted.
 *
 * On top of that it:
 *   - drops `@import` / `@charset` / `@namespace` (see {@link DENIED_AT_RULES});
 *   - namespaces `@keyframes` + their `animation` references
 *     (see {@link KEYFRAME_PREFIX});
 *   - strips declarations whose value carries `expression(`, `javascript:`, or a
 *     `url()` pointing anywhere other than http(s) or a `data:image/*` payload
 *     (relative/`data:` non-image/other schemes = tracking + exfil vectors).
 *
 * Anything postcss can't parse (unbalanced braces, stray escapes, junk) makes
 * the whole block fail closed → returns null (drop the block entirely) with a
 * server-side warning, never a partial repair.
 *
 * NOTE: layout properties (`position:fixed`, `top`, `z-index`, …) inside a
 * `<style>` block are intentionally left intact — the live editorial article
 * relies on them and `@scope` keeps them from affecting the surrounding page.
 * The inline `style=""` attribute is separately constrained to a presentational
 * allowlist by `allowedStyles` above.
 */
function hardenStyleBlockCss(css: string): string | null {
  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch (err) {
    warnDropped("unparseable CSS", err);
    return null;
  }

  // 1. Collect author keyframe names so both the @keyframes rules and every
  //    animation reference to them can be renamed in lock-step.
  const keyframeNames = new Set<string>();
  root.walkAtRules(/^(-\w+-)?keyframes$/i, (at) => {
    const name = at.params.trim();
    if (name) keyframeNames.add(name);
  });

  // 2. Drop containment-escaping / resource-loading at-rules.
  root.walkAtRules((at) => {
    if (DENIED_AT_RULES.has(at.name.toLowerCase())) {
      warnDropped(`@${at.name} at-rule`);
      at.remove();
    }
  });

  // 3. Namespace keyframe identifiers.
  if (keyframeNames.size > 0) {
    root.walkAtRules(/^(-\w+-)?keyframes$/i, (at) => {
      const name = at.params.trim();
      if (keyframeNames.has(name)) at.params = KEYFRAME_PREFIX + name;
    });
    root.walkDecls(/^(-\w+-)?animation(-name)?$/i, (decl) => {
      for (const name of keyframeNames) {
        decl.value = decl.value.replace(
          new RegExp(`(^|[\\s,])(${escapeRegExp(name)})(?=$|[\\s,])`, "g"),
          `$1${KEYFRAME_PREFIX}$2`,
        );
      }
    });
  }

  // 4. Authors write `:root { --vars }` / `html` / `body` rules, but inside
  //    `@scope` those selectors can never match (the scope root is a <div>).
  //    Rewrite them to `:scope` so pasted standalone-page CSS — especially
  //    CSS-variable blocks — applies verbatim to the article wrapper.
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent?.type === "atrule" && /^(-\w+-)?keyframes$/i.test((parent as postcss.AtRule).name)) return;
    if (!/(?:^|[\s>+~,(]):?(?:root\b|html\b|body\b)/i.test(rule.selector)) return;
    rule.selectors = rule.selectors.map((sel) =>
      sel
        .replace(/(^|[\s>+~(])(?::root|html|body)(?![\w-])/gi, "$1:scope")
        .replace(/:scope(\s+:scope)+/g, ":scope"),
    );
  });

  // 4b. Follow the h1 → h2 demotion (see transformTags) into the author's own
  //     CSS: every selector with an `h1` type token gains a sibling selector
  //     matching the demoted node. Additive, never a replacement, so a real
  //     surviving <h1> keeps its rule. `[data-blog-h1]` adds one specificity
  //     point, which is what makes the copy outrank the author's generic `h2`
  //     rule at the same class depth no matter which came first in the source.
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent?.type === "atrule" && /^(-\w+-)?keyframes$/i.test((parent as postcss.AtRule).name)) return;
    const rewritten = rule.selectors
      .filter((sel) => H1_TYPE_SELECTOR_TEST.test(sel))
      .map((sel) => sel.replace(H1_TYPE_SELECTOR, `$1h2[${DEMOTED_H1_ATTR}]`));
    if (rewritten.length > 0) rule.selectors = [...rule.selectors, ...rewritten];
  });

  // 5. Value hygiene: drop declarations carrying script/exfil vectors.
  root.walkDecls((decl) => {
    const value = decl.value;
    if (/expression\s*\(/i.test(value) || /javascript:/i.test(value)) {
      warnDropped(`declaration "${decl.prop}" (script vector)`);
      decl.remove();
      return;
    }
    if (/url\s*\(/i.test(value) && !hasOnlySafeUrls(value)) {
      warnDropped(`declaration "${decl.prop}" (unsafe url())`);
      decl.remove();
    }
  });

  return root.toString();
}

/** Every `url(...)` in the value points at http(s) or a `data:image/*` payload. */
function hasOnlySafeUrls(value: string): boolean {
  const urlRe = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(value)) !== null) {
    const target = match[2].trim().toLowerCase();
    const isHttp = target.startsWith("http://") || target.startsWith("https://");
    const isDataImage = target.startsWith("data:image/");
    if (!isHttp && !isDataImage) return false;
  }
  return true;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function warnDropped(what: string, err?: unknown): void {
  const suffix = err instanceof Error ? `: ${err.message.split("\n")[0]}` : "";
  console.warn(`[scope-blog-html] dropped ${what} from author CSS${suffix}`);
}
