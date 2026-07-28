/**
 * Give every SEO landing page an explicit `template.ctaService`.
 *
 * Landing pages are kept out of nav and the service hub by design
 * (docs/plans/ireland-internal-linking-seo.md, Rule 6) and are linked only
 * from the service page they relate to. That reverse link is built by
 * inverting the relation the page already declares — ctaService, the
 * `template.related` hrefs, or a /services/<slug> link in the body.
 *
 * Nine pages declare the relation NOWHERE, so they stayed orphaned: 54 of the
 * 90 /health/ URLs had no inbound link at all and went unindexed. This sets
 * the missing field.
 *
 * Mapping rule — deliberately conservative, because this decides which service
 * a patient reading about a condition is pointed at:
 *   - an exact concept match where one exists;
 *   - otherwise the country's GENERAL GP consultation, which is never
 *     clinically wrong as an entry point. No condition page is routed to a
 *     specialist by guesswork.
 *
 * Idempotent, and merges into any existing template rather than replacing it.
 * Dry run by default; pass --apply to write.
 *
 *   node --import tsx --env-file=.env scripts/set-landing-cta-services.ts
 *   node --import tsx --env-file=.env scripts/set-landing-cta-services.ts --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

type Mapping = {
  country: string;
  slug: string;
  ctaService: string;
  /** Why this target — kept in the source so the routing call is reviewable. */
  basis: string;
};

const MAPPINGS: Mapping[] = [
  { country: "cz", slug: "neschopenka-online", ctaService: "neschopenka-online", basis: "exact — same concept and slug" },
  { country: "pt", slug: "atestado-medico-online", ctaService: "certificados-medicos", basis: "exact concept — medical certificates" },
  { country: "ie", slug: "online-prescription-ireland", ctaService: "treatment-review", basis: "repeat-prescription equivalent" },
  { country: "ie", slug: "respiratory-infections", ctaService: "acute-medical-consultation", basis: "GP entry point" },
  { country: "ie", slug: "arabic-speaking-doctor", ctaService: "acute-medical-consultation", basis: "GP entry point (audience page)" },
  { country: "pt", slug: "infecoes-respiratorias", ctaService: "consulta-medica", basis: "GP entry point" },
  { country: "pt", slug: "enxaqueca", ctaService: "consulta-medica", basis: "GP entry point" },
  { country: "pt", slug: "diabetes", ctaService: "medicina-geral-e-familiar", basis: "GP entry point (chronic)" },
  { country: "pt", slug: "hipertensao", ctaService: "medicina-geral-e-familiar", basis: "GP entry point (chronic)" },
];

const APPLY = process.argv.includes("--apply");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of MAPPINGS) {
    const page = await prisma.seoLandingPage.findFirst({
      where: { slug: m.slug, country: { code: m.country } },
      select: { id: true, template: true },
    });
    if (!page) {
      console.log(`MISS  ${m.country}/${m.slug} — no landing page row`);
      failed += 1;
      continue;
    }

    // Never point at a service that does not exist in that country: a dead
    // internal link is worse than the orphan it replaces.
    const service = await prisma.service.findFirst({
      where: { slug: m.ctaService, country: { code: m.country } },
      select: { id: true },
    });
    if (!service) {
      console.log(`MISS  ${m.country}/${m.slug} — target service '${m.ctaService}' not in ${m.country}`);
      failed += 1;
      continue;
    }

    const template = (page.template as Record<string, unknown> | null) ?? {};
    if (typeof template.ctaService === "string" && template.ctaService.trim()) {
      console.log(`SKIP  ${m.country}/${m.slug} — already set to '${template.ctaService}'`);
      skipped += 1;
      continue;
    }

    console.log(`SET   ${m.country}/${m.slug} -> ${m.ctaService}  (${m.basis})`);
    if (APPLY) {
      await prisma.seoLandingPage.update({
        where: { id: page.id },
        data: { template: { ...template, ctaService: m.ctaService } },
      });
      written += 1;
    }
  }

  console.log(
    `\n${APPLY ? "applied" : "DRY RUN"} — ${APPLY ? written : MAPPINGS.length - skipped - failed} to write, ` +
      `${skipped} already set, ${failed} unresolved`,
  );
  if (!APPLY) console.log("re-run with --apply to write");

  await prisma.$disconnect();
  await pool.end();
}

void main();
