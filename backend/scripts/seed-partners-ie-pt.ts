import { prisma } from "../src/db/prisma.js";

/**
 * Seed the IE + PT partners / clients from the provider-model spec. Names, type
 * labels and website links only — logos are uploaded via admin (per decision).
 * Idempotent: matches by (countryId, name); updates type/url if it already
 * exists, creates otherwise. Run: node --env-file=.env --import tsx scripts/seed-partners-ie-pt.ts
 */
const DATA: Record<string, Array<{ name: string; type: string; websiteUrl: string | null }>> = {
  ie: [
    { name: "Level Health", type: "Healthcare Partner", websiteUrl: "https://levelhealth.ie" },
    { name: "Innovative Cardiac Diagnostics (ICD Ltd)", type: "Diagnostic Partner", websiteUrl: null },
    { name: "Coombe Community Pharmacy", type: "Prescription Partner", websiteUrl: null },
  ],
  pt: [
    { name: "SYNLAB Portugal", type: "Diagnostic Partner", websiteUrl: "https://www.synlab.pt" },
    { name: "Medicare Portugal", type: "Healthcare Partner", websiteUrl: "https://www.medicare.pt" },
  ],
};

async function main() {
  for (const [code, partners] of Object.entries(DATA)) {
    const country = await prisma.country.findUnique({ where: { code }, select: { id: true } });
    if (!country) {
      console.log(`country ${code} not found — skipped`);
      continue;
    }
    let sort = 0;
    for (const p of partners) {
      const existing = await prisma.partner.findFirst({
        where: { countryId: country.id, name: p.name },
        select: { id: true },
      });
      if (existing) {
        await prisma.partner.update({
          where: { id: existing.id },
          data: { type: p.type, websiteUrl: p.websiteUrl, active: true, sortOrder: sort },
        });
        console.log(`[${code}] updated  ${p.name} (${p.type})`);
      } else {
        await prisma.partner.create({
          data: {
            countryId: country.id,
            name: p.name,
            type: p.type,
            websiteUrl: p.websiteUrl,
            sortOrder: sort,
            active: true,
          },
        });
        console.log(`[${code}] created  ${p.name} (${p.type})`);
      }
      sort += 1;
    }
  }
  await prisma.$disconnect();
}

void main();
