/**
 * Read-only probe (blog UI/UX audit, 2026-08-12).
 *
 * Groups every published BlogPost.body / BlogTranslation.content by the
 * fingerprint of its inline <style> block, and reports which hero wrapper
 * each row opens with. Used to scope the hero-strip + contrast patches:
 * every fix has to be written against the row's ACTUAL stored HTML, not the
 * post-sanitizer HTML the public page serves.
 *
 *   node --env-file=.env --import tsx scripts/probe-blog-html-shape.ts
 */
import { createHash } from "node:crypto";
import { prisma } from "../src/db/prisma.js";

type Row = { kind: "post" | "translation"; id: string; slug: string; locale: string; html: string };

const HERO_PATTERNS: Array<[string, RegExp]> = [
  ["header.article-intro", /<header[^>]*class="[^"]*\barticle-intro\b/i],
  ["div.article-intro", /<div[^>]*class="[^"]*\barticle-intro\b/i],
  ["header.hero", /<header[^>]*class="[^"]*\bhero\b/i],
  ["section.hero", /<section[^>]*class="[^"]*\bhero\b/i],
  ["bare header", /<header[\s>]/i],
];

function styleFingerprint(html: string): string {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  if (blocks.length === 0) return "no-style";
  return createHash("sha1").update(blocks.join("\n")).digest("hex").slice(0, 8);
}

function heroShape(html: string): string {
  for (const [label, re] of HERO_PATTERNS) if (re.test(html)) return label;
  return "none";
}

/** Text sitting before the first tag — a leaked <title> from a pasted full document. */
function leadingText(html: string): string | null {
  const upToFirstTag = html.slice(0, html.indexOf("<") === -1 ? html.length : html.indexOf("<"));
  const t = upToFirstTag.replace(/\s+/g, " ").trim();
  return t.length > 0 ? t.slice(0, 80) : null;
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, locale: true, body: true, status: true, isActive: true },
  });
  const translations = await prisma.blogTranslation.findMany({
    select: { id: true, slug: true, locale: true, content: true },
  });

  const rows: Row[] = [
    ...posts.map((p) => ({ kind: "post" as const, id: p.id, slug: p.slug, locale: String(p.locale), html: p.body ?? "" })),
    ...translations.map((t) => ({ kind: "translation" as const, id: t.id, slug: t.slug, locale: String(t.locale), html: t.content ?? "" })),
  ];

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = styleFingerprint(r.html);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  console.log(
    `BlogPost rows: ${posts.length} (live: ${posts.filter((p) => p.isActive && p.status === "PUBLISHED").length})`,
  );
  console.log(`BlogTranslation rows: ${translations.length}`);
  console.log(`\nStyle groups: ${groups.size}`);
  for (const [key, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const shapes = new Map<string, number>();
    let leaks = 0;
    for (const r of list) {
      const s = heroShape(r.html);
      shapes.set(s, (shapes.get(s) ?? 0) + 1);
      if (leadingText(r.html)) leaks++;
    }
    console.log(
      `\n  ${key}  n=${list.length}  heroes=${[...shapes].map(([s, n]) => `${s}:${n}`).join(", ")}  titleLeaks=${leaks}`,
    );
    console.log(`    sample: ${list[0].kind} ${list[0].slug} (${list[0].locale})`);
    const leak = list.find((r) => leadingText(r.html));
    if (leak) console.log(`    leak sample: "${leadingText(leak.html)}"`);
  }

  // Cross-check the specific contrast bugs the audit found, per row.
  const checks: Array<[string, (h: string) => boolean]> = [
    ["section-forest a overrides btn-primary", (h) => /\.section-forest a\s*\{[^}]*color:\s*#FFFFFF/i.test(h) && /\.btn-primary/.test(h)],
    ["future-tag gold", (h) => /\.future-tag/.test(h)],
    ["tc-example mint", (h) => /\.tc-example/.test(h)],
    ["own .related grid", (h) => /class="related"/.test(h)],
    ["own .disclaimer", (h) => /class="disclaimer"/.test(h)],
  ];
  console.log("\nPer-defect row counts:");
  for (const [label, test] of checks) {
    console.log(`  ${String(rows.filter((r) => test(r.html)).length).padStart(3)}  ${label}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
