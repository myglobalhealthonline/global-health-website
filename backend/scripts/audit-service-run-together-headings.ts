/**
 * Read-only: find service detailBody paragraphs where a bold sub-heading lost
 * its tag during import and ran into the sentence after it, e.g.
 *
 *   <p>Full Medical AssessmentYour doctor will review your symptoms…</p>
 *   <p>Same-day accessNo waiting days for an appointment…</p>
 *
 * The defect is in the authored source (scripts/data/ireland-service-content.json
 * carries it verbatim), not in the importer — the first entry in that file gets
 * it right (`<p>Same-day access:</p><p>No waiting weeks…</p>`), the rest do not.
 * It renders as broken prose on the live page.
 *
 * Detection is a heuristic: a lowercase letter immediately followed by an
 * uppercase one inside paragraph text. Real English almost never does this
 * mid-word, but camelCase brand names would trip it — so every hit is printed
 * with context for eyeballing rather than counted silently.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-service-run-together-headings.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

/** Inside <p>…</p> only; lists and headings are authored correctly. */
const PARAGRAPH = /<p>([\s\S]*?)<\/p>/gi;
const RUN_TOGETHER = /([a-z,)])([A-Z])/g;

type Hit = { snippet: string; boundary: string };

function findHits(html: string): Hit[] {
  const hits: Hit[] = [];
  for (const p of html.matchAll(PARAGRAPH)) {
    const text = p[1].replace(/<[^>]+>/g, "");
    for (const m of text.matchAll(RUN_TOGETHER)) {
      const at = m.index ?? 0;
      hits.push({
        boundary: `${m[1]}|${m[2]}`,
        snippet: text.slice(Math.max(0, at - 45), at + 45).trim(),
      });
    }
  }
  return hits;
}

async function main() {
  const services = await prisma.service.findMany({
    select: {
      slug: true,
      detailBody: true,
      country: { select: { code: true } },
      translations: { select: { locale: true, detailBody: true }, orderBy: { locale: "asc" } },
    },
    orderBy: { slug: "asc" },
  });

  let rowsAffected = 0;
  let totalHits = 0;
  const perCountry = new Map<string, number>();

  for (const s of services) {
    const country = s.country?.code ?? "??";
    const rows: Array<{ label: string; html: string | null }> = [
      { label: "base", html: s.detailBody },
      ...s.translations.map((t) => ({ label: t.locale, html: t.detailBody })),
    ];

    for (const row of rows) {
      if (!row.html) continue;
      const hits = findHits(row.html);
      if (hits.length === 0) continue;
      rowsAffected += 1;
      totalHits += hits.length;
      perCountry.set(country, (perCountry.get(country) ?? 0) + hits.length);
      console.log(`\n${country}/${s.slug}  [${row.label}]  ${hits.length} hit(s)`);
      for (const h of hits) console.log(`    ${h.boundary}   …${h.snippet}…`);
    }
  }

  console.log(`\n${services.length} service(s) scanned.`);
  console.log(`${rowsAffected} row(s) affected, ${totalHits} run-together boundaries.`);
  console.log("Per country:");
  for (const [code, n] of [...perCountry].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}  ${n}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
