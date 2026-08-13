/**
 * Blog article UI/UX repair — 2026-08-12.
 *
 * Every published article is a "designed" article: admin-authored HTML that
 * ships its own <style> block. An audit of all 53 live URLs (5 markets, 6
 * locales) found the same defects repeating across the 3 template families
 * the corpus is built from:
 *
 *   1. DOUBLE HERO. The page template already renders a full hero (cover
 *      image, the post's H1, author/date/reading-time chips, reviewed-by).
 *      The body then opened with a SECOND full hero carrying the same title,
 *      brand lockup and category — ~1,540px of hero before any content.
 *      Fix: the body's hero keeps its unique copy (deck, lead, facts, CTAs,
 *      summary panel) and becomes a light "lede"; its duplicate title, brand
 *      line and category link are removed.
 *
 *   2. CONTRAST. Pairs measured below WCAG AA in the live DOM:
 *        - `.section-forest a{color:#FFF}` (0,3,0) outranked `.btn-primary`
 *          (0,2,0) → white on lime, 1.36:1, on every dark-section CTA.
 *        - `.hero-panel a` forest green on near-black, 1.70:1.
 *        - `.tc-example` mint on ivory, 2.43:1.
 *        - legacy hero meta/byline at 40-50% white, 3.29-4.27:1.
 *        - `.future-tag` gold on white, 2.29:1.
 *        - editorial template's coral labels 4.10/4.20:1 and amber 2.86:1.
 *
 *   3. STICKY TOC BEHIND THE HEADER. `.article-nav` sticks at top:0 z-20; the
 *      site header sticks at top:0 z-200 and is ~99px tall. Measured: the nav
 *      was 100% covered whenever it stuck. The nav is now not sticky at all —
 *      pinning it below the header would stack two bars and eat ~170px of a
 *      mobile viewport, and the site header should be the only pinned thing
 *      on a blog page.
 *
 *   4. DEAD RELATED-CARD GRIDS. Some bodies carry their own related-articles
 *      grid whose links point at retired Wix URLs (/post/…, /pt/portugal/blog/
 *      categorias/…). The page template renders a live, data-driven related
 *      section below, so these are removed rather than repaired.
 *
 *   5. LEAKED <title>. Six rows were pasted as complete HTML documents; the
 *      sanitizer unwrapped <title>, leaving its text as the first thing on the
 *      page ("Diabetes em Portugal: … | Global Health").
 *
 *   6. IN-ARTICLE SITE CHROME. The editorial template ships its own header
 *      brand bar and footer (including a placeholder
 *      "globalhealth.example.com" link), duplicating the real site chrome.
 *
 * Every edit is additive-or-deletive on markup the audit verified is present,
 * and CSS repairs are APPENDED to the row's own <style> block rather than
 * rewritten in place — the appended rules win on source order at equal
 * specificity, and the original declarations stay readable in the admin
 * editor. Re-running is idempotent BY RESULT: each row is re-derived from
 * scratch and only written when it actually differs, and a previously
 * appended block is replaced rather than duplicated. So revising the CSS
 * constants below and re-running is the intended way to ship a follow-up.
 *
 * Deliberately NOT done here: re-skinning the six legacy articles (Playfair /
 * Space Mono / terracotta / gold) onto the gh-blog design system. That is a
 * visual redesign, not a defect fix, and wants eyes on it.
 *
 *   node --env-file=.env --import tsx scripts/fix-blog-article-ui-2026-08.ts                 # dry run
 *   node --env-file=.env --import tsx scripts/fix-blog-article-ui-2026-08.ts --out ./tmp     # dry run + write patched HTML for review
 *   node --env-file=.env --import tsx scripts/fix-blog-article-ui-2026-08.ts --apply         # write
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const OUT_DIR = (() => {
  const i = process.argv.indexOf("--out");
  return i !== -1 ? process.argv[i + 1] : null;
})();

/** Opens this script's appended CSS block, and is how {@link upsertCss} finds
 *  a previous revision of it to replace. */
const PATCH_MARKER = "gh-blog-ui-2026-08-12";

// ─────────────────────────────────────────────────────────────────────────
// Element removal
// ─────────────────────────────────────────────────────────────────────────

/**
 * Remove the element whose opening tag matches `open`, together with
 * everything up to its matching close tag. Counts nested same-name tags, so
 * it is safe on wrappers that contain siblings of their own type (the legacy
 * `.hero-top` is a <div> full of <div>s).
 *
 * Returns the input unchanged when the pattern does not match.
 */
function removeElement(html: string, open: RegExp, tagName: string): string {
  const m = open.exec(html);
  if (!m) return html;
  const start = m.index;
  const openTag = new RegExp(`<${tagName}\\b`, "gi");
  const closeTag = new RegExp(`</${tagName}\\s*>`, "gi");
  let depth = 0;
  let cursor = start;
  // Walk forward alternating between the next open and the next close.
  for (;;) {
    openTag.lastIndex = cursor;
    closeTag.lastIndex = cursor;
    const nextOpen = openTag.exec(html);
    const nextClose = closeTag.exec(html);
    if (!nextClose) return html; // unbalanced — refuse to guess
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth--;
    cursor = nextClose.index + nextClose[0].length;
    if (depth === 0) return html.slice(0, start) + html.slice(cursor);
  }
}

/** Strip text sitting before the first tag — a <title> leaked by a pasted document. */
function stripLeadingText(html: string): string {
  const firstTag = html.indexOf("<");
  if (firstTag <= 0) return html;
  const lead = html.slice(0, firstTag);
  return lead.trim().length === 0 ? html : html.slice(firstTag);
}

/**
 * Replace this script's own appended CSS at the tail of the row's <style>
 * block, or append it if the row has never been patched.
 *
 * Idempotence is by RESULT, not by "has it been touched" — a row already
 * carrying an older revision of the block gets it rewritten in place rather
 * than skipped, so editing the constants below and re-running is how this
 * script is meant to be revised. The block is always the tail of the style
 * content, so everything from the marker comment onwards is ours to replace;
 * the author's own declarations above it are never read or rewritten.
 */
function upsertCss(html: string, css: string): string {
  const close = html.lastIndexOf("</style>");
  if (close === -1) return html;
  const head = html.slice(0, close);
  const marker = head.indexOf(`/* ── ${PATCH_MARKER}`);
  const authored = marker === -1 ? head : head.slice(0, marker);
  return `${authored.replace(/\s+$/, "")}\n${css}\n${html.slice(close)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// CSS repair blocks (one per template family)
// ─────────────────────────────────────────────────────────────────────────

const CSS_GH_BLOG = `
/* ── ${PATCH_MARKER} — generated by scripts/fix-blog-article-ui-2026-08.ts ──
   The page template renders the article hero. What follows demotes the body's
   former second hero to a light lede, lifts the sticky TOC clear of the site
   header, and repairs the contrast pairs that measured below WCAG AA. */
.gh-blog .article-lede {
  align-items: start;
  padding-top: clamp(2.5rem, 4vw, 3.75rem);
  padding-bottom: clamp(2.5rem, 4vw, 3.75rem);
  border-bottom: 1px solid rgba(29,75,54,.10);
  color: var(--gh-text);
  background: linear-gradient(180deg, #FFFDF1 0%, #F6F8F1 100%);
}
.gh-blog .article-lede .eyebrow {
  border-color: rgba(29,75,54,.10);
  color: var(--gh-forest);
  background: rgba(29,75,54,.06);
}
.gh-blog .article-lede .eyebrow::before { background: var(--gh-mint); }
.gh-blog .article-lede .hero-deck { color: var(--gh-forest); }
.gh-blog .article-lede .intro-lead { color: var(--gh-text); }
.gh-blog .article-lede .hero-fact {
  border-color: rgba(29,75,54,.14);
  color: var(--gh-forest);
  background: rgba(29,75,54,.05);
}
.gh-blog .article-lede .btn-ghost {
  border: 1px solid rgba(29,75,54,.24);
  color: var(--gh-forest);
  background: #FFFFFF;
}
.gh-blog .article-lede .btn-ghost:hover {
  border-color: rgba(29,75,54,.45);
  background: rgba(29,75,54,.06);
}
/* The summary panel stays dark glass — it is the lede's contrast anchor and
   its copy is already written for a dark surface. Its links were the one
   exception: forest green on near-black, 1.70:1. */
.gh-blog .article-lede .hero-panel a { color: var(--gh-lime); }
/* The in-article contents nav does not stick. It sat at top:0 under a sticky
   99px site header (z-index 20 vs 200) and was fully covered whenever it
   stuck; pinning it below the header instead would stack two sticky bars and
   eat ~170px of an already short mobile viewport. It stays where the author
   put it, scrolls away with the lede, and the site header is the only thing
   pinned to the top of a blog page. */
.gh-blog .article-nav { position: static; }
/* The ids the TOC links to live on the '.section-anchor' <hr>, not on the
   section, so the original 'scroll-margin-top' on '.article-section' never
   applied to anything and every jump landed behind the site header. Only the
   header has to be cleared now that the nav scrolls away. */
.gh-blog .article-section,
.gh-blog .section-anchor { scroll-margin-top: calc(var(--header-height, 88px) + 32px); }
/* '.section-forest a{color:#FFFFFF}' (0,3,0) outranked '.btn-primary' (0,2,0),
   so every dark-section CTA rendered white-on-lime at 1.36:1. */
.gh-blog .section-forest .btn-primary { color: #0A1F14; }
.gh-blog .section-forest .btn-secondary { color: #FFFFFF; }
/* Mint on the ivory card gradient: 2.43:1 → 5.33:1. */
.gh-blog .tc-example { color: #5C7113; }
`.trim();

const CSS_LEGACY_DIABETES = `
/* ── ${PATCH_MARKER} — generated by scripts/fix-blog-article-ui-2026-08.ts ──
   The body's hero duplicated the page template's; its brand lockup, category
   link, dateline and title are gone and what remains is the article lede.
   Remaining rules repair sub-AA contrast. */
.hero.article-lede { padding-top: 2rem; }
/* 40% white on #1A3D2B measured 3.29:1. */
.hero-reviewed { color: rgba(255,255,255,.72); }
/* Gold on white measured 2.29:1 → 6.06:1. Still reads as the "emerging
   therapy" accent, just deep enough to be legible at 10px. */
.future-tag { color: #7A5F00; }
`.trim();

const CSS_EDITORIAL = `
/* ── ${PATCH_MARKER} — generated by scripts/fix-blog-article-ui-2026-08.ts ──
   The body's own site header and footer duplicated the real site chrome (and
   the footer shipped a placeholder globalhealth.example.com link); both are
   gone, as is the hero title the page template already renders. Remaining
   rules repair sub-AA contrast. */
.hero.article-lede { padding-top: 2.25rem; }
/* #7FB89E on #1E4D3B measured 4.24:1. */
.hero-meta span { color: #A8D5BE; }
/* Coral on paper / on the red-flag tint: 4.10 and 4.20:1. */
.section-label { color: #B03A24; }
.red-flag-title { color: #B03A24; }
/* Amber on white: 2.86:1. */
.rc-country { color: #8F5A12; }
`.trim();

// ─────────────────────────────────────────────────────────────────────────
// Per-family transforms
// ─────────────────────────────────────────────────────────────────────────

type Family = "gh-blog" | "legacy-diabetes" | "editorial" | "unknown";

function familyOf(html: string): Family {
  if (html.includes('class="gh-blog"')) return "gh-blog";
  if (/<header[^>]*class="hero"/i.test(html)) return "legacy-diabetes";
  if (/<section[^>]*class="hero"/i.test(html)) return "editorial";
  return "unknown";
}

type Patch = { html: string; steps: string[] };

/** Remove the single <h1>; the page template already renders the post title. */
function dropDuplicateTitle(p: Patch): void {
  const count = (p.html.match(/<h1[\s>]/gi) ?? []).length;
  if (count === 0) return;
  if (count > 1) {
    // Never guess which of several is the hero title — report and leave alone.
    p.steps.push(`SKIP drop-title (${count} h1s)`);
    return;
  }
  const next = removeElement(p.html, /<h1\b[^>]*>/i, "h1");
  if (next !== p.html) {
    p.html = next;
    p.steps.push("drop-title");
  }
}

/** Remove the body's own related grid (links point at retired Wix URLs). */
function dropDeadRelatedGrid(p: Patch): void {
  const next = removeElement(p.html, /<nav\b[^>]*class="related"[^>]*>/i, "nav");
  if (next !== p.html) {
    p.html = next;
    p.steps.push("drop-related");
  }
}

function patchGhBlog(p: Patch): void {
  if (p.html.includes('class="article-intro"')) {
    p.html = p.html.replace('class="article-intro"', 'class="article-intro article-lede"');
    p.steps.push("lede-class");
  } else if (!p.html.includes("article-lede")) {
    p.steps.push("SKIP lede-class (no exact article-intro class)");
  }
  const withoutBrandline = removeElement(p.html, /<div\b[^>]*class="hero-brandline"[^>]*>/i, "div");
  if (withoutBrandline !== p.html) {
    p.html = withoutBrandline;
    p.steps.push("drop-brandline");
  }
  dropDuplicateTitle(p);
  dropDeadRelatedGrid(p);
  p.html = upsertCss(p.html, CSS_GH_BLOG);
  p.steps.push("css");
}

function patchLegacyDiabetes(p: Patch): void {
  p.html = p.html.replace(/<header([^>]*)class="hero"/i, '<header$1class="hero article-lede"');
  p.steps.push("lede-class");
  for (const [label, open] of [
    // Brand lockup + category link: both already in the site header / template hero.
    ["drop-hero-top", /<div\b[^>]*class="hero-top"[^>]*>/i],
    // Dateline: the template hero already carries published + reviewed chips.
    ["drop-hero-meta", /<div\b[^>]*class="hero-meta"[^>]*>/i],
  ] as Array<[string, RegExp]>) {
    const next = removeElement(p.html, open, "div");
    if (next !== p.html) {
      p.html = next;
      p.steps.push(label);
    }
  }
  dropDuplicateTitle(p);
  dropDeadRelatedGrid(p);
  p.html = upsertCss(p.html, CSS_LEGACY_DIABETES);
  p.steps.push("css");
}

function patchEditorial(p: Patch): void {
  p.html = p.html.replace(/<section([^>]*)class="hero"/i, '<section$1class="hero article-lede"');
  p.steps.push("lede-class");
  const withoutHeader = removeElement(p.html, /<header(?:\s[^>]*)?>/i, "header");
  if (withoutHeader !== p.html) {
    p.html = withoutHeader;
    p.steps.push("drop-fake-header");
  }
  const withoutFooter = removeElement(p.html, /<footer(?:\s[^>]*)?>/i, "footer");
  if (withoutFooter !== p.html) {
    p.html = withoutFooter;
    p.steps.push("drop-fake-footer");
  }
  dropDuplicateTitle(p);
  dropDeadRelatedGrid(p);
  p.html = upsertCss(p.html, CSS_EDITORIAL);
  p.steps.push("css");
}

function patchRow(original: string): Patch {
  const p: Patch = { html: original, steps: [] };
  const stripped = stripLeadingText(p.html);
  if (stripped !== p.html) {
    p.html = stripped;
    p.steps.push("strip-leaked-title");
  }
  switch (familyOf(original)) {
    case "gh-blog":
      patchGhBlog(p);
      break;
    case "legacy-diabetes":
      patchLegacyDiabetes(p);
      break;
    case "editorial":
      patchEditorial(p);
      break;
    default:
      p.steps.push("SKIP unknown family");
  }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────

type Row = { kind: "post" | "translation"; id: string; slug: string; locale: string; html: string };

async function main() {
  const posts = await prisma.blogPost.findMany({ select: { id: true, slug: true, locale: true, body: true } });
  const translations = await prisma.blogTranslation.findMany({
    select: { id: true, slug: true, locale: true, content: true },
  });
  const rows: Row[] = [
    ...posts.map((p) => ({ kind: "post" as const, id: p.id, slug: p.slug, locale: String(p.locale), html: p.body ?? "" })),
    ...translations.map((t) => ({ kind: "translation" as const, id: t.id, slug: t.slug, locale: String(t.locale), html: t.content ?? "" })),
  ];

  if (OUT_DIR) mkdirSync(OUT_DIR, { recursive: true });

  const planned: Array<Row & { next: string; steps: string[] }> = [];
  const skipped: string[] = [];
  const suspicious: string[] = [];

  for (const row of rows) {
    if (!row.html) continue;
    // No marker short-circuit: every row is re-derived and only written when
    // the result actually differs. That is what makes revising the CSS blocks
    // above and re-running the correct way to ship a follow-up fix.
    const { html: next, steps } = patchRow(row.html);
    if (next === row.html) {
      skipped.push(`${row.slug} (${row.locale}) — already current`);
      continue;
    }
    if (steps.some((s) => s.startsWith("SKIP"))) suspicious.push(`${row.slug} (${row.locale}): ${steps.join(", ")}`);
    planned.push({ ...row, next, steps });
    if (OUT_DIR) writeFileSync(join(OUT_DIR, `${row.slug}.${row.locale}.${row.kind}.html`), next, "utf8");
  }

  const byFamily = new Map<string, number>();
  for (const p of planned) {
    const f = familyOf(p.html);
    byFamily.set(f, (byFamily.get(f) ?? 0) + 1);
  }

  console.log(`Rows scanned: ${rows.length}`);
  console.log(`Rows to patch: ${planned.length}  (${[...byFamily].map(([f, n]) => `${f}:${n}`).join(", ")})`);
  console.log(`Rows skipped: ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s}`);
  if (suspicious.length > 0) {
    console.log(`\nNeeds a look (a step did not fire):`);
    for (const s of suspicious) console.log(`  ! ${s}`);
  }
  console.log(`\nPer-row plan:`);
  for (const p of planned) {
    const delta = p.next.length - p.html.length;
    console.log(
      `  ${p.kind.padEnd(11)} ${p.slug} (${p.locale})  ${delta >= 0 ? "+" : ""}${delta}B  [${p.steps.join(", ")}]`,
    );
  }

  const stepTotals = new Map<string, number>();
  for (const p of planned) for (const s of p.steps) stepTotals.set(s, (stepTotals.get(s) ?? 0) + 1);
  console.log(`\nStep totals:`);
  for (const [s, n] of [...stepTotals].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${s}`);

  if (OUT_DIR) console.log(`\nPatched HTML written to ${OUT_DIR}`);
  if (!APPLY) {
    console.log(`\nDry run only — pass --apply to write.`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const p of planned) {
        // Optimistic guard: only write if the row is byte-identical to what was read.
        const res =
          p.kind === "post"
            ? await tx.blogPost.updateMany({ where: { id: p.id, body: p.html }, data: { body: p.next } })
            : await tx.blogTranslation.updateMany({ where: { id: p.id, content: p.html }, data: { content: p.next } });
        if (res.count === 0) throw new Error(`Aborting: ${p.kind} ${p.id} (${p.slug}) changed since read.`);
      }
    },
    // ~80 sequential guarded updates against the remote DB overrun Prisma's
    // 5s interactive-transaction default (measured 5.7s). All-or-nothing
    // matters more than speed here, so widen the window rather than batch.
    { timeout: 120_000, maxWait: 30_000 },
  );
  console.log(`\nApplied to ${planned.length} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
