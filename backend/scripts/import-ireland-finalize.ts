/**
 * Finalize the Ireland SEO rollout:
 *   1. Set price/duration on the 3 new service drafts and activate them.
 *   2. Add SEO keywords to aesthetic-medicine (its doc keyword line wasn't parsed).
 *   3. Create the published Medical Disclaimer legal document (full version).
 *
 *   node --import tsx scripts/import-ireland-finalize.ts          # dry-run
 *   node --import tsx scripts/import-ireland-finalize.ts --apply
 */
import { LocaleCode, LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ie";
const APPLY = process.argv.includes("--apply");

// GENERAL drafts — mirror comparable IE pricing (GP €45/15, chronic €60/20).
const DRAFT_PRICING: Record<string, { basePriceCents: number; durationMinutes: number }> = {
  "womens-health-consultation": { basePriceCents: 4500, durationMinutes: 15 },
  "hair-loss-consultation": { basePriceCents: 6000, durationMinutes: 15 },
  "second-opinion-consultation": { basePriceCents: 6000, durationMinutes: 20 },
};

const AESTHETIC_KEYWORDS = [
  "aesthetic medicine Ireland",
  "aesthetic doctor Ireland",
  "cosmetic consultation Ireland",
  "aesthetic medicine consultation",
];

const DISCLAIMER_TITLE = "Medical Disclaimer";
const DISCLAIMER_HTML = [
  "All services in Ireland are provided at GP level in accordance with Irish telehealth and medical practice standards. All doctors on our platform are registered to practise in Ireland by the relevant Irish medical authority.",
  "Our doctors conduct medical assessments remotely and may provide clinical recommendations, referrals, or medical documentation only when clinically appropriate and at the doctor’s professional discretion. Our doctors do not routinely prescribe controlled substances through video consultations.",
  "Medical certificates issued through our platform are accepted by employers and educational institutions nationwide. Where an employer requires a medical certificate during a period of sick leave, this may be issued following a full clinical assessment, at the doctor’s discretion, depending on the nature and outcome of the consultation.",
  "Please note that Illness Benefit Certificates for submission to the Department of Social Protection are not available through our service. Patients requiring this documentation for social welfare purposes must attend an in-person GP consultation. Further information is available through the relevant Irish government services at gov.ie.",
  "Backdated sick notes are not routinely issued due to the absence of direct clinical assessment at the time of illness.",
  "Video consultations are not suitable for medical emergencies. If you are experiencing a medical emergency, call 112 or 999 immediately or attend your nearest emergency department.",
]
  .map((p) => `<p>${p}</p>`)
  .join("");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, defaultLocale: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const locale = country.defaultLocale as LocaleCode;

  // 1. Activate the 3 drafts with pricing.
  for (const [slug, p] of Object.entries(DRAFT_PRICING)) {
    const svc = await prisma.service.findFirst({
      where: { countryId: country.id, slug },
      select: { id: true, isActive: true },
    });
    if (!svc) {
      console.log(`ACTIVATE  ${slug}  (NOT FOUND)`);
      continue;
    }
    console.log(
      `ACTIVATE  ${slug}  €${(p.basePriceCents / 100).toFixed(0)} / ${p.durationMinutes}min`,
    );
    if (APPLY) {
      await prisma.service.update({
        where: { id: svc.id },
        data: {
          basePriceCents: p.basePriceCents,
          durationMinutes: p.durationMinutes,
          currencyCode: "EUR",
          isActive: true,
        },
      });
    }
  }

  // 2. Aesthetic keywords.
  const aesthetic = await prisma.service.findFirst({
    where: { countryId: country.id, slug: "aesthetic-medicine-online-consultation" },
    select: { id: true },
  });
  if (aesthetic) {
    console.log(`KEYWORDS  aesthetic-medicine-online-consultation  (${AESTHETIC_KEYWORDS.length})`);
    if (APPLY) {
      await prisma.service.update({
        where: { id: aesthetic.id },
        data: { seoKeywords: AESTHETIC_KEYWORDS },
      });
    }
  }

  // 3. Medical Disclaimer legal document (published).
  console.log(`DISCLAIMER  /legal/medical-disclaimer  (${DISCLAIMER_HTML.length} chars)`);
  if (APPLY) {
    await prisma.countryLegalDocument.upsert({
      where: {
        countryId_type_locale: {
          countryId: country.id,
          type: LegalDocumentType.MEDICAL_DISCLAIMER,
          locale: "en",
        },
      },
      create: {
        countryId: country.id,
        type: LegalDocumentType.MEDICAL_DISCLAIMER,
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        isPublished: true,
        publishedAt: new Date(),
        locale: "en",
      },
      update: {
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        isPublished: true,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
  void locale;

  console.log("\n────────────");
  console.log(APPLY ? "APPLIED." : "DRY-RUN (no writes). Pass --apply.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
