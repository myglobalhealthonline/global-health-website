/**
 * Render the Week 3 primary-language drafts as standalone HTML previews that
 * match PRODUCTION's presentation.
 *
 * Since 2026-08-26 (`9971db26`, "roll out editorial article experience") the
 * public blog page strips every author `<style>` block and renders each body
 * through the calm-editorial layout: page-supplied hero (serif title, dek,
 * byline, clinical reviewer), an "On this page" sidebar built from the body's
 * `<h2>`s, and the `.gh-article-editorial--authored-sections` styles from
 * `frontend/app/globals.css`. The old standalone renders embedded the retired
 * dark-hero stylesheet from `blog-seo-2026-08/template.ts`, so they looked
 * nothing like the live site.
 *
 * This preview therefore runs the CMS body through the SAME frontend
 * functions production uses (`calmEditorialBlogHtml`, `prepareBlogArticleHtml`,
 * `editorialBlogBodyClassName`) and inlines the exact blog CSS block plus the
 * root design tokens copied verbatim from `globals.css` at render time. What
 * you see in the file is what the CMS row renders as once published.
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
import { calmEditorialBlogHtml } from "../../frontend/lib/content/scope-blog-html.js";
import { prepareBlogArticleHtml } from "../../frontend/lib/content/blog-table-of-contents.js";
import { editorialBlogBodyClassName } from "../../frontend/lib/content/blog-presentation.js";

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE === CHECK) throw new Error("Choose exactly one mode: --write or --check");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../../docs/plans/content-drafts/week-3");
const globalsCssPath = resolve(scriptDirectory, "../../frontend/app/globals.css");

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/**
 * Pull the production blog CSS out of globals.css by anchor, not by line
 * number, so the preview follows the live stylesheet when it moves.
 */
function productionBlogCss(): string {
  const css = readFileSync(globalsCssPath, "utf8");
  const between = (startNeedle: string, endNeedle: string, label: string) => {
    const start = css.indexOf(startNeedle);
    if (start < 0) throw new Error(`globals.css: cannot find start of ${label} (${startNeedle})`);
    const end = css.indexOf(endNeedle, start);
    if (end < 0) throw new Error(`globals.css: cannot find end of ${label} (${endNeedle})`);
    return css.slice(start, end);
  };
  // Root design tokens: the first `:root {` block (brand palette, type scale,
  // container width, header height).
  const rootStart = css.indexOf(":root {");
  const rootEnd = css.indexOf("\n}\n", rootStart);
  const tokens = css.slice(rootStart, rootEnd + 3);
  // Blog article + calm editorial block: from the shared body wrapper to the
  // start of the next unrelated component family.
  const blog = between(".gh-article-body {", "\n.gh2-", "blog article CSS");
  const forest = ".gh2-section-forest { background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); }";
  return `${tokens}\n${blog}\n${forest}`;
}

const UI = {
  EN: { back: "All articles", onThisPage: "On this page", reviewedBy: "Clinically reviewed by", minRead: "min read", nextStep: "Next step", ready: "Ready to speak to a doctor?", book: "Book a consultation", preview: "Draft preview · production calm-editorial layout · not published" },
  PT: { back: "Todos os artigos", onThisPage: "Nesta página", reviewedBy: "Revisão clínica por", minRead: "min de leitura", nextStep: "Próximo passo", ready: "Pronto para falar com um médico?", book: "Marcar consulta", preview: "Pré-visualização · layout editorial de produção · não publicado" },
  CS: { back: "Všechny články", onThisPage: "Na této stránce", reviewedBy: "Odborně zkontroloval/a", minRead: "min čtení", nextStep: "Další krok", ready: "Chcete mluvit s lékařem?", book: "Objednat konzultaci", preview: "Náhled konceptu · produkční editorial layout · nepublikováno" },
  ES: { back: "Todos los artículos", onThisPage: "En esta página", reviewedBy: "Revisión clínica de", minRead: "min de lectura", nextStep: "Siguiente paso", ready: "¿Quiere hablar con un médico?", book: "Reservar consulta", preview: "Vista previa · diseño editorial de producción · no publicado" },
  RO: { back: "Toate articolele", onThisPage: "Pe această pagină", reviewedBy: "Revizuit clinic de", minRead: "min de citit", nextStep: "Pasul următor", ready: "Vreți să vorbiți cu un medic?", book: "Programează o consultație", preview: "Previzualizare · layout editorial de producție · nepublicat" },
} as const;

const css = productionBlogCss();

const rows = WEEK3_POST_SETS.flatMap((set) =>
  set.posts.map((post) => {
    const body = renderArticle(post.article);
    const prose = wordCount(
      post.article.intro +
        post.article.sections.map((s) => s.h2 + " " + s.blocks.join("")).join(" ") +
        post.article.faqs.map((f) => f.q + " " + f.a).join(" "),
    );
    const errors: string[] = [];
    if (post.seoTitle.length > 60) errors.push(`SEO title ${post.seoTitle.length} > 60`);
    if (post.seoDescription.length > 155) errors.push(`SEO description ${post.seoDescription.length} > 155`);
    if (prose < 900 || prose > 1_250) errors.push(`${prose} prose words outside 900-1250`);
    if (!body.includes(`/services/${set.serviceSlug}`)) errors.push("missing configured service link");
    if (!body.includes("/doctors") || !body.includes("/contact")) errors.push("missing doctors/contact links");
    if (post.article.faqs.length < 2 || post.article.faqs.length > 4) errors.push("FAQ count outside 2-4");
    if (errors.length) throw new Error(`${set.key}/${post.locale}: ${errors.join("; ")}`);

    // Exactly what blog-post-page.tsx does with a CMS body.
    const prepared = prepareBlogArticleHtml(calmEditorialBlogHtml(body), post.title);
    const bodyClass = editorialBlogBodyClassName(body);
    const ui = UI[(set.countryCode === "br" ? "PT" : post.locale) as keyof typeof UI];
    const readingTime = Math.max(1, Math.round(prose / 200));
    const toc = prepared.items.length
      ? `<nav class="gh-blog-reading-toc" aria-labelledby="blog-reading-toc-title"><div class="gh-blog-reading-toc-heading"><span aria-hidden="true">+</span><h2 id="blog-reading-toc-title">${ui.onThisPage}</h2></div><ol class="gh-blog-reading-toc-list">${prepared.items.map((i) => `<li><a href="#${i.id}">${escapeHtml(i.label)}</a></li>`).join("")}</ol></nav>`
      : "";
    const reviewer = set.reviewerDisplayName
      ? `<p class="gh-blog-calm-reviewer">✓ ${ui.reviewedBy} ${escapeHtml(set.reviewerDisplayName)}</p>`
      : "";
    const html =
      `<!doctype html>\n<html lang="${escapeHtml(post.article.lang)}">\n<head>\n<meta charset="utf-8">\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
      `<title>${escapeHtml(post.seoTitle)}</title>\n<meta name="description" content="${escapeHtml(post.seoDescription)}">\n` +
      `<style>\n${css}\nbody{margin:0;background:var(--color-background-page,#fff);font-family:var(--font-manrope),ui-sans-serif,system-ui,sans-serif;color:#2D3B36}\n` +
      `.preview-banner{background:#173c2f;color:#B0F122;font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:10px 20px;text-align:center}\n` +
      `.gh-blog-calm-reviewer{margin-top:14px;color:#1d6249;font-size:14px;font-weight:600}\n` +
      `.preview-cta{padding:clamp(64px,8vw,100px) 20px;color:#fff}.preview-cta-inner{max-width:var(--container-width,1280px);margin:0 auto}.preview-cta p.k{color:var(--color-brand-accent);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}.preview-cta h2{margin:16px 0 0;font-size:clamp(2rem,4vw + .5rem,3.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.02;color:rgba(255,255,255,.92)}.preview-cta a{display:inline-flex;margin-top:28px;padding:16px 28px;border-radius:999px;background:var(--color-brand-accent);color:#0F2E25;font-weight:700;text-decoration:none}\n</style>\n</head>\n<body>\n` +
      `<div class="preview-banner">${ui.preview}</div>\n` +
      `<header class="gh-blog-calm-hero"><div class="gh-blog-calm-hero-inner">` +
      `<a class="gh-blog-calm-back" href="${post.article.categoryHref}">← ${ui.back}</a>` +
      `<p class="gh-blog-calm-category">${escapeHtml(post.category)}</p>` +
      `<h1>${escapeHtml(post.title)}</h1>` +
      `<p class="gh-blog-calm-dek">${escapeHtml(post.excerpt)}</p>` +
      `<div class="gh-blog-calm-byline"><span>${escapeHtml(set.authorDisplayName)}</span><span>${new Date().toLocaleDateString(post.article.lang, { day: "numeric", month: "long", year: "numeric" })}</span><span>${readingTime} ${ui.minRead}</span></div>` +
      reviewer +
      `</div></header>\n` +
      `<section class="gh-blog-calm-article-shell"><div class="gh-blog-reading-layout${prepared.items.length ? "" : " gh-blog-reading-layout--no-toc"}">${toc}` +
      `<div id="blog-article-content" class="gh-blog-reading-body"><div class="${bodyClass}">${prepared.html}</div></div></div></section>\n` +
      `<section class="preview-cta gh2-section-forest"><div class="preview-cta-inner"><p class="k">${ui.nextStep}</p><h2>${ui.ready}</h2><a href="${post.article.ctaBox.primary.href}">${ui.book}</a></div></section>\n` +
      `</body>\n</html>\n`;
    const filename = `${set.key}.${post.locale.toLowerCase()}.html`;
    return { filename, path: resolve(outputDirectory, filename), html, prose, total: wordCount(body) };
  }),
);

if (rows.length !== 6) throw new Error(`Week 3 renderer expected 6 files, received ${rows.length}`);

for (const row of rows) {
  if (WRITE) {
    writeFileSync(row.path, row.html, "utf8");
    console.log(`wrote ${row.filename} (${row.prose} prose words / ${row.total} total, ~${Math.round(row.prose / 200)} min read)`);
    continue;
  }
  let current = "";
  try {
    current = readFileSync(row.path, "utf8");
  } catch {
    throw new Error(`Missing standalone draft ${row.filename}; run with --write`);
  }
  // The byline date is render-day; compare everything except that span.
  const strip = (s: string) => s.replace(/<span>[^<]*<\/span><span>\d+ /g, "<span></span><span>N ");
  if (strip(current) !== strip(row.html)) throw new Error(`Standalone draft is stale: ${row.filename}; run with --write`);
  console.log(`ok ${row.filename} (${row.prose} prose words)`);
}
