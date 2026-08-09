/**
 * Root cause of the country-home ellipsis defect (2026-08-09 on-page SEO
 * batch, continued): `[country]/[lang]/page.tsx` resolves the search title as
 * `page?.seoTitle ?? extras?.seoTitle ?? homeMeta.titleTemplate.replace(...)`.
 * The FIRST fix in this batch shortened `homeMeta.titleTemplate` in
 * cs/es/pt/ro `common.json` — but that template is dead code for every
 * country except Ireland, because an earlier automated seed/backfill pass
 * already wrote a STATIC `seoTitle` into `PageContentTranslation` for every
 * HOME row, evaluated from the OLD (unshortened) per-locale formula at seed
 * time. `page?.seoTitle` wins over the template unconditionally, so editing
 * the template changed nothing in production for these rows — confirmed live
 * 2026-08-09: /czechia/es and /portugal/pt kept serving the old, truncated
 * text after two separate fresh deploys.
 *
 * Live audit of all 6 countries x 6 locales' HOME seoTitle:
 *   - Ireland: 6/6 rows are genuinely distinct hand-authored copy (different
 *     wording per locale, e.g. "IMC-Registered GPs", "No mesmo dia") — not
 *     touched.
 *   - Portugal/Spain/Czechia/Romania/Brazil: every EN/DE row already fits the
 *     60-char search budget (50-59 chars) — not touched. Every PT/ES/CS/RO
 *     row is the SAME mechanical per-locale formula with only the country
 *     name substituted (64-71 chars unbranded) — these are what generate the
 *     literal "…" in production. 20 rows total (5 countries x 4 locales).
 *
 * Fix: null out `seoTitle` on exactly those 20 rows, restoring fallthrough to
 * the (now-shortened) code template — the single source of truth for a
 * value that was never independently authored, only mechanically stamped.
 * Each row is verified against its exact live value before clearing, so a
 * row a human has since hand-edited is left alone and reported, not clobbered.
 *
 *   node --env-file=.env --import tsx scripts/patch-country-home-seotitle-overflow.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-country-home-seotitle-overflow.ts --apply   # write
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

// [countryCode, locale, expected current DB value] — captured live 2026-08-09
// before this patch. Only Portugal/Spain/Czechia/Romania/Brazil x pt/es/cs/ro
// (the rows that actually overflow the 60-char unbranded search budget).
const TARGETS: Array<[string, string, string]> = [
  ["pt", "PT", "Médico Online Portugal | Clínicos Gerais e Especialistas Registados | Global Health"],
  ["pt", "ES", "Médico Online Portugal | Médicos de Cabecera y Especialistas Colegiados | Global Health"],
  ["pt", "CS", "Online lékař Portugalsko | Registrovaní praktičtí lékaři a specialisté | Global Health"],
  ["pt", "RO", "Medic Online Portugalia | Medici de Familie și Specialiști Înregistrați | Global Health"],

  ["es", "PT", "Médico Online Espanha | Clínicos Gerais e Especialistas Registados | Global Health"],
  ["es", "ES", "Médico Online España | Médicos de Cabecera y Especialistas Colegiados | Global Health"],
  ["es", "CS", "Online lékař Španělsko | Registrovaní praktičtí lékaři a specialisté | Global Health"],
  ["es", "RO", "Medic Online Spania | Medici de Familie și Specialiști Înregistrați | Global Health"],

  ["cz", "PT", "Médico Online Chéquia | Clínicos Gerais e Especialistas Registados | Global Health"],
  ["cz", "ES", "Médico Online Chequia | Médicos de Cabecera y Especialistas Colegiados | Global Health"],
  ["cz", "CS", "Online lékař Česko | Registrovaní praktičtí lékaři a specialisté | Global Health"],
  ["cz", "RO", "Medic Online Cehia | Medici de Familie și Specialiști Înregistrați | Global Health"],

  ["ro", "PT", "Médico Online Roménia | Clínicos Gerais e Especialistas Registados | Global Health"],
  ["ro", "ES", "Médico Online Rumanía | Médicos de Cabecera y Especialistas Colegiados | Global Health"],
  ["ro", "CS", "Online lékař Rumunsko | Registrovaní praktičtí lékaři a specialisté | Global Health"],
  ["ro", "RO", "Medic Online România | Medici de Familie și Specialiști Înregistrați | Global Health"],

  ["br", "PT", "Médico Online Brasil | Clínicos Gerais e Especialistas Registrados | Global Health"],
  ["br", "ES", "Médico Online Brasil | Médicos de Cabecera y Especialistas Colegiados | Global Health"],
  ["br", "CS", "Online lékař Brazílie | Registrovaní praktičtí lékaři a specialisté | Global Health"],
  ["br", "RO", "Medic Online Brazilia | Medici de Familie și Specialiști Înregistrați | Global Health"],
];

async function main() {
  let cleared = 0;
  let skipped = 0;

  for (const [countryCode, locale, expected] of TARGETS) {
    const country = await prisma.country.findFirst({ where: { code: countryCode }, select: { id: true } });
    if (!country) {
      console.log(`SKIP ${countryCode}/${locale}: country row not found`);
      skipped++;
      continue;
    }
    const page = await prisma.pageContent.findFirst({
      where: { countryId: country.id, pageKey: "HOME" },
      select: { id: true },
    });
    if (!page) {
      console.log(`SKIP ${countryCode}/${locale}: HOME PageContent row not found`);
      skipped++;
      continue;
    }
    const translation = await prisma.pageContentTranslation.findFirst({
      where: { pageContentId: page.id, locale },
      select: { id: true, seoTitle: true },
    });
    if (!translation) {
      console.log(`SKIP ${countryCode}/${locale}: translation row not found`);
      skipped++;
      continue;
    }
    if (translation.seoTitle !== expected) {
      console.log(
        `SKIP ${countryCode}/${locale}: current seoTitle doesn't match the captured value — already changed.`,
      );
      console.log(`  current: ${JSON.stringify(translation.seoTitle)}`);
      skipped++;
      continue;
    }

    console.log(`${APPLY ? "CLEAR" : "WOULD CLEAR"} ${countryCode}/${locale} seoTitle (was: ${JSON.stringify(expected)})`);
    if (APPLY) {
      await prisma.pageContentTranslation.update({
        where: { id: translation.id },
        data: { seoTitle: null },
      });
    }
    cleared++;
  }

  console.log(`\n${APPLY ? "Cleared" : "Would clear"}: ${cleared} / ${TARGETS.length}. Skipped: ${skipped}.`);
  if (!APPLY) console.log("Dry-run only. Re-run with --apply to write.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
