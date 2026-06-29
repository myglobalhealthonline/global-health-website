/**
 * Seed the Ireland internal-link callout map (ServiceLink rows) from the
 * Internal-Linking spec. Groups links by source service and replaces that
 * service's link set. Dry-run by default; --apply to write.
 *
 *   node --import tsx scripts/import-ireland-service-links.ts          # dry-run
 *   node --import tsx scripts/import-ireland-service-links.ts --apply
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ServiceLinkType, LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "data", "ireland-service-links.json");
const APPLY = process.argv.includes("--apply");

type Link = {
  source: string;
  target: string;
  type: string;
  priority: number;
  heading: string;
  body: string;
  ctaLabel: string;
};

async function main() {
  const links = JSON.parse(readFileSync(DATA, "utf-8")) as Link[];
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, defaultLocale: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const locale = country.defaultLocale as LocaleCode;

  const services = await prisma.service.findMany({
    where: { countryId: country.id },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(services.map((s) => [s.slug, s.id]));

  // Group by source.
  const bySource = new Map<string, Link[]>();
  for (const l of links) {
    if (!bySource.has(l.source)) bySource.set(l.source, []);
    bySource.get(l.source)!.push(l);
  }

  let okSources = 0;
  let totalLinks = 0;
  const skipped: string[] = [];

  for (const [sourceSlug, group] of bySource) {
    const sourceId = idBySlug.get(sourceSlug);
    if (!sourceId) {
      skipped.push(`source missing: ${sourceSlug}`);
      continue;
    }
    const resolved = group.filter((l) => {
      const ok = idBySlug.has(l.target);
      if (!ok) skipped.push(`target missing: ${l.target} (from ${sourceSlug})`);
      return ok;
    });
    console.log(`${sourceSlug.padEnd(38)} ${resolved.length}/${group.length} links`);
    totalLinks += resolved.length;
    if (resolved.length > 0) okSources += 1;

    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      await tx.serviceLink.deleteMany({ where: { sourceServiceId: sourceId } });
      for (const l of resolved) {
        await tx.serviceLink.create({
          data: {
            sourceServiceId: sourceId,
            targetServiceId: idBySlug.get(l.target)!,
            type: l.type as ServiceLinkType,
            priority: l.priority,
            isActive: true,
            translations: {
              create: [
                { locale, heading: l.heading, body: l.body, ctaLabel: l.ctaLabel },
              ],
            },
          },
        });
      }
    });
  }

  console.log("\n────────────");
  if (skipped.length) {
    console.log("Skipped:");
    for (const s of skipped) console.log("  - " + s);
  }
  console.log(
    APPLY
      ? `APPLIED: ${okSources} source pages, ${totalLinks} links written.`
      : `DRY-RUN: ${okSources} source pages, ${totalLinks} links would be written. Pass --apply.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
