/**
 * Render the approved Week 2 local drafts as standalone HTML documents.
 *
 * The 17 unapproved locale variants remain in the TypeScript research archive,
 * but this renderer deliberately has no path to write them.
 *
 * Usage:
 *   node --import tsx scripts/render-week2-blog-drafts-2026-08.ts --write
 *   node --import tsx scripts/render-week2-blog-drafts-2026-08.ts --check
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderArticle } from "./content/blog-seo-2026-08/template.js";
import { WEEK2_POST_SETS } from "./content/blog-week2-2026-08/index.js";

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

if (WRITE === CHECK) {
  throw new Error("Choose exactly one mode: --write or --check");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../../docs/plans/content-drafts/week-2");

const escapeAttribute = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const documentFor = (title: string, description: string, lang: string, body: string) =>
  `<!doctype html>\n` +
  `<html lang="${escapeAttribute(lang)}">\n` +
  `<head>\n` +
  `<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<title>${escapeAttribute(title)}</title>\n` +
  `<meta name="description" content="${escapeAttribute(description)}">\n` +
  `</head>\n<body>\n${body}\n</body>\n</html>\n`;

const rows = WEEK2_POST_SETS.flatMap((set) =>
  set.posts.map((post) => {
    const filename = `${set.key}.${post.locale.toLowerCase()}.html`;
    const path = resolve(outputDirectory, filename);
    const html = documentFor(post.seoTitle, post.seoDescription, post.article.lang, renderArticle(post.article));
    return { filename, path, html };
  }),
);

if (rows.length !== 19) {
  throw new Error(`Approved Week 2 renderer expected 19 files, received ${rows.length}`);
}

for (const row of rows) {
  if (WRITE) {
    writeFileSync(row.path, row.html, "utf8");
    console.log(`wrote ${row.filename}`);
    continue;
  }

  let current = "";
  try {
    current = readFileSync(row.path, "utf8");
  } catch {
    throw new Error(`Missing standalone draft ${row.filename}; run with --write`);
  }
  if (current !== row.html) {
    throw new Error(`Standalone draft is stale: ${row.filename}; run with --write`);
  }
  console.log(`ok ${row.filename}`);
}
