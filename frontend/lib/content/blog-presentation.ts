export type EditorialBlogBodyLayout = "direct-toc" | "authored-sections" | "plain";

/**
 * Classify CMS body markup before author CSS is removed.
 *
 * The original HFMD article owns a direct sticky-TOC layout. Newer designed
 * articles nest their navigation and sections inside their own root, while
 * ordinary rich text needs a simple readable column. Keeping these shapes
 * explicit prevents a body from being auto-placed into the wrong CSS grid.
 */
export function editorialBlogBodyLayout(html: string): EditorialBlogBodyLayout {
  if (/\bclass=(?:"[^"]*\btoc-strip\b[^"]*"|'[^']*\btoc-strip\b[^']*')/i.test(html)) {
    return "direct-toc";
  }
  if (
    /<style\b/i.test(html) ||
    /\bclass=(?:"[^"]*\b(?:gh-blog|article-lede|article-section)\b[^"]*"|'[^']*\b(?:gh-blog|article-lede|article-section)\b[^']*')/i.test(html)
  ) {
    return "authored-sections";
  }
  return "plain";
}

export function editorialBlogBodyClassName(html: string): string {
  const layout = editorialBlogBodyLayout(html);
  return [
    "gh-article-body",
    "gh-article-editorial",
    `gh-article-editorial--${layout}`,
    layout === "direct-toc" ? "gh-article-calm" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The approved editorial presentation is now the shared blog template. */
export function usesEditorialBlogPresentation(slug: string): boolean {
  return slug.trim().length > 0;
}
