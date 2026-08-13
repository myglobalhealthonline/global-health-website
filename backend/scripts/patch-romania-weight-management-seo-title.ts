/**
 * SEO fix (2026-08-03 audit, 2.8): `/romania/en/services/controlul-greutatii`
 * (slug = "weight control") renders the title "Men's Health Online | Romania
 * | Confidential English Doctor" — copy-pasted from a different service.
 *
 * Root cause: ServiceTranslation EN row id cmr9d1ptm000bvcjudmszsd6g (service
 * `controlul-greutatii`, "Weight Management — Medical Assessment and
 * Personalised Plan") has seoTitle equal, character-for-character, to the EN
 * seoTitle on ServiceTranslation id cmr9d1qoi000cvcjuevb0bv4t (service
 * `sanatatea-barbatului-online`, "Men's Health — Confidential Online
 * Assessment in English") — the correct owner of that string. Every other RO
 * service/locale combination was audited (grouped by locale+seoTitle,
 * flagged any string shared by >1 slug) and this is the only duplicate.
 *
 * Fix: restore the weight-management row's own seoTitle, following the same
 * "{Name} Online | Romania | {qualifier}" pattern already used by its RO
 * (`Managementul greutății online | România | evaluare medicală`) and other
 * locale siblings for the same service.
 *
 *   node --env-file=.env --import tsx scripts/patch-romania-weight-management-seo-title.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-romania-weight-management-seo-title.ts --apply    # write
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const TRANSLATION_ID = "cmr9d1ptm000bvcjudmszsd6g";
const BEFORE = "Men's Health Online | Romania | Confidential English Doctor";
const AFTER = "Weight Management Online | Romania | Medical Assessment";

async function main() {
  const translation = await prisma.serviceTranslation.findUnique({
    where: { id: TRANSLATION_ID },
    select: { id: true, locale: true, name: true, seoTitle: true, service: { select: { slug: true } } },
  });
  if (!translation) throw new Error(`ServiceTranslation ${TRANSLATION_ID} not found`);

  console.log(`--- ${translation.service.slug} / ${translation.locale} — id ${translation.id} ---`);
  console.log(`name:    ${translation.name}`);
  console.log(`current: ${JSON.stringify(translation.seoTitle)}`);
  console.log("");

  if (translation.seoTitle === AFTER) {
    console.log("SKIP — already set to the target text.");
    return;
  }
  if (translation.seoTitle !== BEFORE) {
    throw new Error(
      `Aborting: current seoTitle doesn't match the known BEFORE text — re-check before patching.\n` +
        `  current: ${JSON.stringify(translation.seoTitle)}\n` +
        `  expected BEFORE: ${JSON.stringify(BEFORE)}`,
    );
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"}:`);
  console.log(`BEFORE: ${JSON.stringify(BEFORE)}`);
  console.log(`AFTER:  ${JSON.stringify(AFTER)}`);

  if (!APPLY) {
    console.log("\nDry run only — pass --apply to write.");
    return;
  }

  const result = await prisma.serviceTranslation.updateMany({
    where: { id: TRANSLATION_ID, seoTitle: BEFORE },
    data: { seoTitle: AFTER },
  });
  if (result.count === 0) {
    throw new Error("Aborting: row changed since the read above — re-run to check current state.");
  }
  console.log("\nApplied 1 change.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
