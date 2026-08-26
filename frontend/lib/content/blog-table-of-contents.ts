export type BlogTableOfContentsItem = {
  id: string;
  label: string;
  level: 2;
};

type PreparedBlogArticleHtml = {
  html: string;
  items: BlogTableOfContentsItem[];
};

const TOC_BLOCK_RE =
  /<(nav|aside)\b(?=[^>]*\bclass=(?:"[^"]*\b(?:toc-strip|article-nav|toc)\b[^"]*"|'[^']*\b(?:toc-strip|article-nav|toc)\b[^']*'))[^>]*>[\s\S]*?<\/\1>/gi;
const HEADING_RE = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
const ID_RE = /\bid=(['"])(.*?)\1/i;
const TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;
const DEMOTED_H1_RE = /\bdata-blog-h1\b/i;
const COMMON_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function prepareBlogArticleHtml(html: string, fallbackLabel = "Article"): PreparedBlogArticleHtml {
  if (!html) {
    return {
      html,
      items: [{ id: "blog-article-content", label: fallbackLabel, level: 2 }],
    };
  }

  const htmlWithoutEmbeddedToc = html.replace(TOC_BLOCK_RE, "");
  const usedIds = new Set(collectIds(htmlWithoutEmbeddedToc));
  const assignedHeadingIds = new Set<string>();
  const items: BlogTableOfContentsItem[] = [];

  const preparedHtml = htmlWithoutEmbeddedToc.replace(
    HEADING_RE,
    (match, attrs: string, innerHtml: string) => {
      if (DEMOTED_H1_RE.test(attrs)) return match;

      const label = normalizeHeadingLabel(innerHtml);
      if (!label) return match;

      const existingId = readId(attrs);
      const nextId = existingId && !assignedHeadingIds.has(existingId)
        ? existingId
        : createUniqueId(existingId || slugifyHeading(label), usedIds);
      assignedHeadingIds.add(nextId);

      items.push({ id: nextId, label, level: 2 });
      const nextAttrs = withId(attrs, nextId);

      return `<h2${nextAttrs}>${innerHtml}</h2>`;
    },
  );

  if (items.length === 0) {
    items.push({ id: "blog-article-content", label: fallbackLabel, level: 2 });
  }

  return { html: preparedHtml, items };
}

function collectIds(html: string): string[] {
  return Array.from(html.matchAll(/\bid=(['"])(.*?)\1/gi), (match) => match[2]).filter(Boolean);
}

function normalizeHeadingLabel(innerHtml: string): string {
  const withoutTags = innerHtml.replace(TAG_RE, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  return decoded.replace(WHITESPACE_RE, " ").trim();
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const named = COMMON_HTML_ENTITIES[token.toLowerCase()];
    if (named) return named;

    if (token.startsWith("#x") || token.startsWith("#X")) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (token.startsWith("#")) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return entity;
  });
}

function readId(attrs: string): string | null {
  const match = attrs.match(ID_RE);
  return match?.[2] ?? null;
}

function withId(attrs: string, id: string): string {
  if (ID_RE.test(attrs)) {
    return attrs.replace(ID_RE, `id="${id}"`);
  }
  return `${attrs} id="${id}"`;
}

function createUniqueId(baseId: string, usedIds: Set<string>): string {
  const safeBaseId = baseId.trim() || "section";
  let candidate = safeBaseId;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${safeBaseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function slugifyHeading(label: string): string {
  const ascii = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const slug = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "section";
}
