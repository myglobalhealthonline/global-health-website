/**
 * Read-only audit: which service page titles render longer than Google's
 * ~60-character display budget, and what a mechanical shortening would give.
 *
 * Mirrors the frontend's title composition exactly
 * (frontend/lib/seo/page-seo.ts resolveBrandTitle + root-metadata.ts template):
 *   source = seoTitle ?? name
 *   rendered = source already contains "Global Health"
 *                ? source                       (absolute, template bypassed)
 *                : `${source} · Global Health`  (root template appends brand)
 *
 * Proposal rule is mechanical, never generative: keep the clauses before the
 * first "|" separator (the primary keyword phrase), re-add the brand, and
 * report the result. Anything still over budget is flagged MANUAL — that copy
 * needs a human rewrite, not a truncation.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-service-seo-title-length.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const SITE_NAME = "Global Health";
const BRAND_SUFFIX = ` · ${SITE_NAME}`;
/** Google clips titles by pixel width; ~60 chars is the practical budget. */
const BUDGET = 60;

const len = (v: string) => Array.from(v).length;
const norm = (v: string) => v.replace(/\s+/gu, " ").trim();

/**
 * Rendered <title> for a service page. Since the brand-suffix drop
 * (frontend/app/[country]/[lang]/services/[serviceSlug]/page.tsx passes
 * `brandSuffix: false`), the document title IS the source string — the root
 * layout's " · Global Health" template no longer applies on this route.
 */
function render(source: string): string {
  return norm(source);
}

/** Source with any brand clause stripped — the copy without the suffix. */
function unbrand(source: string): string {
  return norm(norm(source).replace(/\s*[|·—-]\s*global health\s*$/iu, ""));
}

/**
 * Variant A — keep every keyword, drop the brand suffix. Costs 15 chars and
 * loses only the brand, which Google routinely rewrites or appends itself.
 */
function withoutBrand(source: string): string {
  return unbrand(source);
}

/**
 * Variant B — keep the brand, drop trailing clauses (right to left) until the
 * composed title fits. Keeps the primary keyword phrase AND the leading
 * country/qualifier clauses; sheds the least-important tail first.
 */
function trimTailClauses(source: string): string {
  const clauses = unbrand(source).split("|").map(norm).filter(Boolean);
  for (let keep = clauses.length; keep > 0; keep -= 1) {
    const candidate = `${clauses.slice(0, keep).join(" | ")}${BRAND_SUFFIX}`;
    if (len(candidate) <= BUDGET) return candidate;
  }
  return `${clauses[0] ?? norm(source)}${BRAND_SUFFIX}`;
}

type Row = {
  country: string;
  locale: string;
  slug: string;
  source: string;
  field: string;
};

async function main() {
  const services = await prisma.service.findMany({
    where: { isActive: true, visibility: "PUBLIC" },
    select: {
      slug: true,
      name: true,
      seoTitle: true,
      country: { select: { code: true, defaultLocale: true } },
      translations: { select: { locale: true, name: true, seoTitle: true } },
    },
    orderBy: [{ country: { code: "asc" } }, { slug: "asc" }],
  });

  const rows: Row[] = [];
  for (const s of services) {
    const code = s.country?.code ?? "--";
    const base = s.seoTitle ?? s.name;
    rows.push({
      country: code,
      locale: "base",
      slug: s.slug,
      source: base,
      field: s.seoTitle ? "Service.seoTitle" : "Service.name",
    });
    for (const t of s.translations) {
      const source = t.seoTitle ?? t.name;
      rows.push({
        country: code,
        locale: t.locale,
        slug: s.slug,
        source,
        field: t.seoTitle ? "ServiceTranslation.seoTitle" : "ServiceTranslation.name",
      });
    }
  }

  /** Rows this far over budget lose a visible chunk of the SERP line. */
  const REWRITE_THRESHOLD = 76;

  const scored = rows
    .map((r) => ({ ...r, rendered: render(r.source), renderedLen: len(render(r.source)) }))
    .sort((a, b) => b.renderedLen - a.renderedLen);
  const over = scored.filter((r) => r.renderedLen > BUDGET);
  const worst = scored.filter((r) => r.renderedLen >= REWRITE_THRESHOLD);

  console.log(
    `\n=== Rewrite queue: service titles at ${REWRITE_THRESHOLD}+ chars — ${worst.length} rows ===\n`,
  );
  for (const r of worst) {
    console.log(
      `${r.country} ${r.locale.padEnd(4)} ${String(r.renderedLen).padStart(3)} ${r.slug.padEnd(38)} [${r.field}]`,
    );
    console.log(`     ${r.rendered}`);
  }

  const byLocale = new Map<string, number>();
  for (const r of over) byLocale.set(r.locale, (byLocale.get(r.locale) ?? 0) + 1);

  console.log(`\nover ${BUDGET} chars: ${over.length}/${rows.length} rows`);
  console.log(`rewrite queue (${REWRITE_THRESHOLD}+): ${worst.length} rows`);
  console.log(
    `by locale (all over budget): ${[...byLocale.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}=${n}`).join(" ")}`,
  );

  const bands = [
    [61, 70],
    [71, 75],
    [76, 85],
    [86, 999],
  ] as const;
  console.log("\nrendered-length bands (post brand-drop):");
  for (const [lo, hi] of bands) {
    const inBand = scored.filter((r) => r.renderedLen >= lo && r.renderedLen <= hi);
    console.log(
      `  ${String(lo).padStart(3)}-${hi === 999 ? "  +" : String(hi).padStart(3)}: ${String(inBand.length).padStart(3)} rows`,
    );
  }
  console.log("\nNo rows written — this script is read-only.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
