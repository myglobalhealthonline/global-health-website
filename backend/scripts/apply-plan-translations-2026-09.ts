/**
 * Upsert PlanTranslation rows for the public pricing cards from a JSON file
 * produced offline (name / shortDescription / longDescription / features per
 * plan + locale). Dry-run by default; pass --apply to write.
 *
 *   node --import tsx scripts/apply-plan-translations-2026-09.ts <file.json> [--apply]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import type { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

interface Row {
  planId: string;
  country: string;
  slug: string;
  locale: LocaleCode;
  name: string;
  shortDescription: string;
  longDescription: string | null;
  features: string[];
}

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error("usage: <file.json> [--apply]");
  const apply = flag === "--apply";
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];

  const plans = await prisma.pricingPlan.findMany({
    select: { id: true, slug: true, country: { select: { code: true, countryLocales: { select: { locale: true } } } }, translations: { select: { locale: true } } },
  });
  const byId = new Map(plans.map((p) => [p.id, p]));

  let create = 0, update = 0;
  for (const r of rows) {
    const plan = byId.get(r.planId);
    if (!plan || plan.slug !== r.slug || plan.country.code !== r.country) throw new Error(`plan mismatch for ${r.country}/${r.slug} (${r.planId})`);
    if (!plan.country.countryLocales.some((l) => l.locale === r.locale)) throw new Error(`${r.country}/${r.slug}: locale ${r.locale} not enabled`);
    if (!r.name.trim() || !r.shortDescription.trim() || r.features.length === 0 || r.features.some((f) => !f.trim())) throw new Error(`${r.country}/${r.slug}/${r.locale}: empty field`);
    const exists = plan.translations.some((t) => t.locale === r.locale);
    exists ? update++ : create++;
    console.log(`${exists ? "UPDATE" : "CREATE"} ${r.country}/${r.slug} ${r.locale}: "${r.name}" · ${r.features.length} bullets`);
    if (apply) {
      const data = { name: r.name, shortDescription: r.shortDescription, longDescription: r.longDescription, features: r.features };
      await prisma.planTranslation.upsert({
        where: { planId_locale: { planId: r.planId, locale: r.locale } },
        create: { planId: r.planId, locale: r.locale, ...data },
        update: data,
      });
    }
  }
  console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: ${create} create, ${update} update, ${rows.length} rows`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
