/**
 * Portugal's own HOME page, PT locale (its primary market language) has an
 * English heroTitle/heroSubtitle: "Online medical care in Portugal" /
 * "Licensed doctors, no waiting rooms, available across Portugal." — the
 * literal Ireland template text, never translated. Confirmed data, not a
 * code-fallback issue: every OTHER Portugal locale row (en/es/cs/ro/de) is
 * correctly translated into its own language; only `pt` was missed. Fixed
 * PT value below matches the exact phrasing pattern Portugal's own sibling
 * rows already use, and the pattern `country-home-copy.ts` already uses for
 * Portugal from OTHER locales (`es:pt`, `ro:pt`, `br:pt` all read
 * "Cuidados médicos online {em/na/no} {country}").
 *
 *   node --env-file=.env --import tsx scripts/patch-portugal-home-hero-language.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-portugal-home-hero-language.ts --apply   # write
 *
 * SAFE BY DESIGN: touches exactly one row (Portugal, HOME, PT), only the two
 * fields named, only if they still hold the exact English strings found live
 * on 2026-08-09 — re-running after either an apply or an unrelated edit is a
 * no-op rather than clobbering someone else's change.
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const EXPECTED_OLD = {
  heroTitle: "Online medical care in Portugal",
  heroSubtitle: "Licensed doctors, no waiting rooms, available across Portugal.",
};
const NEW = {
  heroTitle: "Cuidados médicos online em Portugal",
  heroSubtitle: "Médicos licenciados, sem salas de espera, disponíveis em todo o país.",
};

async function main() {
  const country = await prisma.country.findFirst({ where: { code: "pt" }, select: { id: true } });
  if (!country) throw new Error("Portugal country row not found");

  const page = await prisma.pageContent.findFirst({
    where: { countryId: country.id, pageKey: "HOME" },
    select: { id: true },
  });
  if (!page) throw new Error("Portugal HOME PageContent row not found");

  const translation = await prisma.pageContentTranslation.findFirst({
    where: { pageContentId: page.id, locale: "PT" },
    select: { id: true, heroTitle: true, heroSubtitle: true },
  });
  if (!translation) throw new Error("Portugal HOME PT translation row not found");

  const matches =
    translation.heroTitle === EXPECTED_OLD.heroTitle &&
    translation.heroSubtitle === EXPECTED_OLD.heroSubtitle;

  if (!matches) {
    console.log("SKIP: current values don't match the expected English strings — already changed.");
    console.log("  current heroTitle:", JSON.stringify(translation.heroTitle));
    console.log("  current heroSubtitle:", JSON.stringify(translation.heroSubtitle));
    return;
  }

  console.log(`${APPLY ? "SET" : "WOULD SET"} portugal/pt HOME heroTitle: ${JSON.stringify(NEW.heroTitle)}`);
  console.log(`${APPLY ? "SET" : "WOULD SET"} portugal/pt HOME heroSubtitle: ${JSON.stringify(NEW.heroSubtitle)}`);

  if (APPLY) {
    await prisma.pageContentTranslation.update({
      where: { id: translation.id },
      data: NEW,
    });
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
