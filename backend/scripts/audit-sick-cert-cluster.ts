/**
 * Read-only: dump the body copy of the Ireland sick-cert cluster so an
 * internal-linking patch can be written against real BEFORE values.
 *
 * Why: "medical chit" (1,900/mo, KD 0) sits at position 66 and "sick note
 * online" (260/mo) at 59, both pointing at pages whose copy never contains
 * those words. This prints the service detailBody and the blog body, and
 * reports which target phrases and internal links are already present.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-sick-cert-cluster.ts
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/db/prisma.js";

/** `--dump <dir>` writes each body to its own file (they exceed terminal limits). */
const DUMP_DIR = (() => {
  const i = process.argv.indexOf("--dump");
  if (i === -1 || !process.argv[i + 1]) return null;
  const dir = process.argv[i + 1];
  mkdirSync(dir, { recursive: true });
  return dir;
})();

function dump(name: string, body: string | null | undefined) {
  if (!DUMP_DIR || !body) return;
  const file = join(DUMP_DIR, `${name.replace(/[^a-z0-9._-]/gi, "_")}.html`);
  writeFileSync(file, body, "utf8");
  console.log(`  dumped -> ${file}`);
}

const COUNTRY = "ie";
const SERVICE_SLUG = "sick-certificate-ireland";
const BLOG_SLUG = "sick-certificate-ireland-employee-rights";

/** The queries the cluster ranks for but never says. */
const PHRASES = ["medical chit", "sick note", "sick cert", "medical certificate", "medical cert"];

const len = (v: string | null | undefined) => (v ? Array.from(v).length : 0);

function report(label: string, html: string | null | undefined) {
  console.log(`\n--- ${label}  [${len(html)} chars]`);
  if (!html) {
    console.log("  (null)");
    return;
  }
  const lower = html.toLowerCase();
  for (const p of PHRASES) {
    const count = lower.split(p).length - 1;
    console.log(`  ${count > 0 ? "HIT " : "miss"} "${p}" x${count}`);
  }
  const links = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis)];
  console.log(`  links: ${links.length}`);
  for (const [, href, text] of links) {
    console.log(`    ${href}  ::  ${text.replace(/<[^>]+>/g, "").trim()}`);
  }
  if (DUMP_DIR) dump(label, html);
  else console.log(`  body:\n${html}`);
}

async function main() {
  const service = await prisma.service.findFirst({
    where: { country: { code: COUNTRY }, slug: SERVICE_SLUG },
    select: {
      id: true,
      slug: true,
      detailBody: true,
      translations: {
        select: { locale: true, detailBody: true },
        orderBy: { locale: "asc" },
      },
    },
  });

  if (!service) {
    console.log(`Service ${COUNTRY}/${SERVICE_SLUG} not found.`);
  } else {
    console.log(`=== Service ${service.slug}  (${service.id})`);
    report("base detailBody", service.detailBody);
    for (const t of service.translations) report(`${t.locale} detailBody`, t.detailBody);
  }

  const posts = await prisma.blogPost.findMany({
    where: { slug: BLOG_SLUG },
    select: {
      id: true,
      slug: true,
      locale: true,
      status: true,
      title: true,
      ctaServiceId: true,
      body: true,
      translations: { select: { locale: true, title: true, content: true }, orderBy: { locale: "asc" } },
    },
  });

  if (posts.length === 0) {
    console.log(`\nNo BlogPost with slug ${BLOG_SLUG}.`);
    return;
  }

  for (const p of posts) {
    console.log(`\n=== BlogPost ${p.slug} (${p.locale}, ${p.status})  (${p.id})`);
    console.log(`  title         ${p.title}`);
    console.log(`  ctaServiceId  ${p.ctaServiceId ?? "(null)"}`);
    report("body", p.body);
    for (const t of p.translations) report(`translation ${t.locale} content`, t.content);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
