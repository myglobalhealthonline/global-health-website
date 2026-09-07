/**
 * Render the Week 3 primary-language drafts as standalone HTML documents.
 *
 * One article per market (IE, PT, CZ, ES, RO, BR). Primary language only —
 * no locale fan-out until the editorial locale rule is applied per topic.
 *
 * Usage:
 *   node --import tsx scripts/render-week3-blog-drafts-2026-09.ts --write
 *   node --import tsx scripts/render-week3-blog-drafts-2026-09.ts --check
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderArticle, wordCount } from "./content/blog-seo-2026-08/template.js";
import { WEEK3_POST_SETS } from "./content/blog-week3-2026-09/index.js";

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE === CHECK) throw new Error("Choose exactly one mode: --write or --check");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../../docs/plans/content-drafts/week-3");

const escapeAttribute = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const documentFor = (title: string, description: string, lang: string, body: string) =>
  `<!doctype html>\n<html lang="${escapeAttribute(lang)}">\n<head>\n<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<title>${escapeAttribute(title)}</title>\n<meta name="description" content="${escapeAttribute(description)}">\n` +
  `</head>\n<body>\n${body}\n</body>\n</html>\n`;

const rows = WEEK3_POST_SETS.flatMap((set) =>
  set.posts.map((post) => {
    const body = renderArticle(post.article);
    const words = wordCount(body);
    // Read time is judged on the prose a reader actually reads (intro, sections, FAQs),
    // not on the hero chrome, link lists, source list and disclaimer.
    const prose = wordCount(
      post.article.intro +
        post.article.sections.map((s) => s.h2 + " " + s.blocks.join("")).join(" ") +
        post.article.faqs.map((f) => f.q + " " + f.a).join(" "),
    );
    const errors: string[] = [];
    if (post.seoTitle.length > 60) errors.push(`SEO title ${post.seoTitle.length} > 60`);
    if (post.seoDescription.length > 155) errors.push(`SEO description ${post.seoDescription.length} > 155`);
    // 5-6 minute read at ~200 wpm.
    if (prose < 900 || prose > 1_250) errors.push(`${prose} prose words outside 900-1250`);
    if (!body.includes(`/services/${set.serviceSlug}`)) errors.push("missing configured service link");
    if (!body.includes("/doctors") || !body.includes("/contact")) errors.push("missing doctors/contact links");
    if (post.article.faqs.length < 2 || post.article.faqs.length > 4) errors.push("FAQ count outside 2-4");
    if (errors.length) throw new Error(`${set.key}/${post.locale}: ${errors.join("; ")}`);
    const filename = `${set.key}.${post.locale.toLowerCase()}.html`;
    return { filename, path: resolve(outputDirectory, filename), html: documentFor(post.seoTitle, post.seoDescription, post.article.lang, body), words, prose };
  }),
);

if (rows.length !== 6) throw new Error(`Week 3 renderer expected 6 files, received ${rows.length}`);

for (const row of rows) {
  if (WRITE) {
    writeFileSync(row.path, row.html, "utf8");
    console.log(`wrote ${row.filename} (${row.prose} prose words / ${row.words} total, ~${Math.round(row.prose / 200)} min read)`);
    continue;
  }
  let current = "";
  try {
    current = readFileSync(row.path, "utf8");
  } catch {
    throw new Error(`Missing standalone draft ${row.filename}; run with --write`);
  }
  if (current !== row.html) throw new Error(`Standalone draft is stale: ${row.filename}; run with --write`);
  console.log(`ok ${row.filename} (${row.words} words)`);
}
