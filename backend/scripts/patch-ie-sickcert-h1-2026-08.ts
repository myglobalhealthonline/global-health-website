import { pathToFileURL } from "node:url";
import { prisma } from "../src/db/prisma.js";

/**
 * Ireland sick-certificate service page — align the H1 with the head term.
 *
 * The page is the highest-intent commercial URL in the portfolio (411
 * impressions, 0 clicks, position 46.2 over 2026-07-24 -> 2026-08-21). Its
 * `seoTitle` already targets the head term ("Sick Cert Online Ireland"), but
 * the H1 — which `[serviceSlug]/page.tsx` renders from `heroTitle ?? name` —
 * read "Sick Leave Medical Assessment in Ireland", so neither "sick cert" nor
 * "sick note" appeared in the page's primary heading at all.
 *
 * The replacement keeps the word "assessment" deliberately. This service
 * cannot promise a certificate — issuance depends on the clinical finding —
 * so an H1 of "Sick Cert Online in Ireland" would advertise an outcome the
 * doctor may not reach. "Online Sick Cert Assessment in Ireland" carries the
 * search term and stays true to what is actually sold.
 *
 * EN only, on purpose. The PT/ES/CS/DE/RO translations of this same Irish
 * service each already lead with their own market's term (atestado médico,
 * justificante médico, neschopenka, Krankschreibung, concediu medical) in
 * their `seoTitle`, and none of them is the Critical finding here.
 *
 * Run dry first (no flag), then with --apply. backend/.env points at
 * PRODUCTION.
 */

const SERVICE_ID = "cmr85s4zq0007bgju1oi7azq8";
const EXPECTED_SLUG = "sick-certificate-ireland";
const EN_TRANSLATION_ID = "cmrakfg3206lw01mzyjtxcecp";

const BEFORE_HERO = "Sick Leave Medical Assessment in Ireland";
const AFTER_HERO = "Online Sick Cert Assessment in Ireland";

async function main() {
  const apply = process.argv.includes("--apply");

  const service = await prisma.service.findUnique({
    where: { id: SERVICE_ID },
    select: { id: true, slug: true, isActive: true, heroTitle: true, seoTitle: true },
  });
  if (!service) throw new Error(`Production service ${SERVICE_ID} was not found`);
  if (service.slug !== EXPECTED_SLUG) throw new Error(`Unexpected slug: ${service.slug}`);
  if (service.heroTitle !== BEFORE_HERO) {
    throw new Error(`Base heroTitle already changed: ${JSON.stringify(service.heroTitle)}`);
  }

  // The EN row shadows the base field on /ireland/en, so both have to move or
  // the served H1 does not change at all.
  const en = await prisma.serviceTranslation.findUnique({
    where: { id: EN_TRANSLATION_ID },
    select: { id: true, serviceId: true, locale: true, heroTitle: true },
  });
  if (!en) throw new Error(`EN translation ${EN_TRANSLATION_ID} was not found`);
  if (en.serviceId !== SERVICE_ID) throw new Error(`EN translation belongs to ${en.serviceId}`);
  if (en.locale !== "EN") throw new Error(`Unexpected locale: ${en.locale}`);
  if (en.heroTitle !== BEFORE_HERO) {
    throw new Error(`EN heroTitle already changed: ${JSON.stringify(en.heroTitle)}`);
  }

  console.log(
    JSON.stringify(
      {
        apply,
        slug: service.slug,
        isActive: service.isActive,
        seoTitleUnchanged: service.seoTitle,
        heroTitle: { before: BEFORE_HERO, after: AFTER_HERO },
        rows: [service.id, en.id],
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("DRY RUN — nothing written. Re-run with --apply.");
    return;
  }

  await prisma.$transaction([
    prisma.service.update({ where: { id: SERVICE_ID }, data: { heroTitle: AFTER_HERO } }),
    prisma.serviceTranslation.update({
      where: { id: EN_TRANSLATION_ID },
      data: { heroTitle: AFTER_HERO },
    }),
  ]);
  console.log("APPLIED — base row and EN translation updated");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
