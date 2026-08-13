/**
 * GSC CTR audit (2026-08-09 on-page SEO batch, continued): /brazil/en/services/
 * solicitacao-exames-online ranks position ~2.8 (top of page 1) for 81
 * impressions over 90 days but has 0 clicks — the largest CTR gap of any
 * service page. Its EN seoTitle and heroTitle both repeat the service name
 * as two near-synonyms back to back:
 *
 *   seoTitle:  "Online Test Request Brazil | Test Request | Same Day"
 *   heroTitle: "Online Test Request — Test Request by Video Call, Same Day"
 *
 * Not a truncation defect (both fit the search-title budget); a clarity
 * defect — the redundant middle clause is dead weight in a SERP snippet
 * that's competing on the first line. Trims ONLY the repeated words, adds
 * nothing invented, changes no claim.
 *
 *   node --env-file=.env --import tsx scripts/patch-brazil-test-request-title.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-brazil-test-request-title.ts --apply   # write
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const EXPECTED_OLD = {
  seoTitle: "Online Test Request Brazil | Test Request | Same Day",
  heroTitle: "Online Test Request — Test Request by Video Call, Same Day",
};
const NEW = {
  seoTitle: "Online Test Request Brazil | Same Day",
  heroTitle: "Online Test Request — by Video Call, Same Day",
};

async function main() {
  const service = await prisma.service.findFirst({
    where: { slug: "solicitacao-exames-online", country: { code: "br" } },
    select: { id: true },
  });
  if (!service) throw new Error("brazil solicitacao-exames-online service not found");

  const translation = await prisma.serviceTranslation.findFirst({
    where: { serviceId: service.id, locale: "EN" },
    select: { id: true, seoTitle: true, heroTitle: true },
  });
  if (!translation) throw new Error("EN translation row not found");

  const matches =
    translation.seoTitle === EXPECTED_OLD.seoTitle && translation.heroTitle === EXPECTED_OLD.heroTitle;
  if (!matches) {
    console.log("SKIP: current values don't match the expected strings — already changed.");
    console.log("  current seoTitle:", JSON.stringify(translation.seoTitle));
    console.log("  current heroTitle:", JSON.stringify(translation.heroTitle));
    return;
  }

  console.log(`${APPLY ? "SET" : "WOULD SET"} seoTitle: ${JSON.stringify(NEW.seoTitle)}`);
  console.log(`${APPLY ? "SET" : "WOULD SET"} heroTitle: ${JSON.stringify(NEW.heroTitle)}`);

  if (APPLY) {
    await prisma.serviceTranslation.update({ where: { id: translation.id }, data: NEW });
    console.log("Applied.");
  } else {
    console.log("Dry-run only. Re-run with --apply to write.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
