/**
 * Import the Ireland SEO service-page content (parsed from
 * GlobalHealth_SEO_MedicalConsultation_IE.docx) into the Service rows.
 *
 *   node --import tsx scripts/import-ireland-service-content.ts            # dry-run
 *   node --import tsx scripts/import-ireland-service-content.ts --apply    # update existing
 *   node --import tsx scripts/import-ireland-service-content.ts --apply --create   # + create missing drafts
 *
 * Dry-run (default) writes NOTHING — it prints the action per service and a
 * preview file. Updates set seoTitle/seoDescription/heroTitle/heroDescription/
 * detailBody and replace the service FAQs. Missing services are only created
 * (as inactive drafts) when --create is passed; price/duration stay null for
 * an admin to set before publishing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ServiceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const COUNTRY_CODE = "ie";
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "data", "ireland-service-content.json");

type Faq = { question: string; answer: string };
type Entry = {
  slug: string;
  kind: string;
  header: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroDescription: string;
  detailBodyHtml: string;
  faqs: Faq[];
  seoKeywords?: string[];
};

const APPLY = process.argv.includes("--apply");
const CREATE = process.argv.includes("--create");

/**
 * Doc slug → existing Ireland Service slug. The DB already has these pages
 * under different slugs; we update content in place (keep the live URL) rather
 * than create duplicates. Doc slugs absent here have no existing match and are
 * treated as NEW (created as drafts only with --create).
 */
const DOC_TO_DB_SLUG: Record<string, string> = {
  "acute-medical-consultation": "online-doctor-ireland",
  "referral-and-investigations": "referral-consultation",
  "paediatric-consultation": "paediatric-primary-care-consultation",
  "weight-management-consultation": "weight-loss-consultation",
  "musculoskeletal-pain-assessment": "pain-management-consultation",
  "mental-health-consultation": "mental-health-assessment",
  "travel-health-consultation": "travel-consultation",
  "aesthetic-medicine-consultation": "aesthetic-medicine-online-consultation",
  "skin-dermatology-consultation": "dermatology-consultation",
  "cardiology-specialist-consultation": "cardiology-consultation",
  "psychology-specialist-consultation": "psychology-consultation",
  "psychiatry-specialist-consultation": "psychiatric-consultation",
  "paediatric-specialist-consultation": "pediatrics-consultation",
  "nutrition-specialist-consultation": "nutrition-consultation",
  "physiotherapy-specialist-consultation": "physiotherapy-consultation",
  "neurology-specialist-consultation": "neurology-consultation",
  // identity (same slug in DB): sick-certificate-ireland, treatment-review,
  // chronic-disease-consultation, mens-health-consultation
  // NEW (no DB match): womens-health-consultation, hair-loss-consultation,
  // second-opinion-consultation
};

async function main() {
  const entries = JSON.parse(readFileSync(DATA, "utf-8")) as Entry[];
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, currencyId: true, currency: { select: { code: true } } },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  const existing = await prisma.service.findMany({
    where: { countryId: country.id },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(existing.map((s) => [s.slug, s.id]));

  let updated = 0;
  let created = 0;
  let missing = 0;
  const preview: Array<Record<string, unknown>> = [];

  for (const e of entries) {
    const detailBody = sanitizeRichHtml(e.detailBodyHtml);
    const targetSlug = DOC_TO_DB_SLUG[e.slug] ?? e.slug;
    const id = bySlug.get(targetSlug);
    const action = id ? "UPDATE" : CREATE ? "CREATE" : "NEW";
    preview.push({
      docSlug: e.slug,
      targetSlug,
      action,
      kind: e.kind,
      seoTitleLen: e.seoTitle.length,
      bodyLen: detailBody.length,
      faqs: e.faqs.length,
    });
    console.log(
      `${action.padEnd(7)} ${e.slug.padEnd(40)} → ${targetSlug.padEnd(38)} faqs=${e.faqs.length} body=${detailBody.length}`,
    );

    if (!APPLY) {
      if (action === "MISSING") missing += 1;
      continue;
    }

    if (id) {
      await prisma.$transaction(async (tx) => {
        await tx.service.update({
          where: { id },
          data: {
            seoTitle: e.seoTitle,
            seoDescription: e.seoDescription,
            seoKeywords: e.seoKeywords ?? [],
            heroTitle: e.heroTitle,
            heroDescription: e.heroDescription,
            detailBody,
          },
        });
        await tx.serviceFaq.deleteMany({ where: { serviceId: id } });
        if (e.faqs.length > 0) {
          await tx.serviceFaq.createMany({
            data: e.faqs.map((f, i) => ({
              serviceId: id,
              question: f.question,
              answer: f.answer,
              sortOrder: i,
              isVisible: true,
            })),
          });
        }
      });
      updated += 1;
    } else if (CREATE) {
      await prisma.$transaction(async (tx) => {
        const svc = await tx.service.create({
          data: {
            countryId: country.id,
            kind: e.kind as ServiceKind,
            slug: e.slug,
            name: e.heroTitle.slice(0, 200),
            seoTitle: e.seoTitle,
            seoDescription: e.seoDescription,
            seoKeywords: e.seoKeywords ?? [],
            heroTitle: e.heroTitle,
            heroDescription: e.heroDescription,
            detailBody,
            currencyCode: country.currency.code,
            isActive: false, // draft — admin sets price/duration before publishing
          },
          select: { id: true },
        });
        if (e.faqs.length > 0) {
          await tx.serviceFaq.createMany({
            data: e.faqs.map((f, i) => ({
              serviceId: svc.id,
              question: f.question,
              answer: f.answer,
              sortOrder: i,
              isVisible: true,
            })),
          });
        }
      });
      created += 1;
    } else {
      missing += 1;
    }
  }

  const previewPath = path.join(here, "data", "ireland-import-preview.json");
  writeFileSync(previewPath, JSON.stringify(preview, null, 2));

  console.log("\n────────────");
  console.log(`total ${entries.length}  existing-in-DB ${bySlug.size}`);
  if (APPLY) {
    console.log(`APPLIED: updated ${updated}, created ${created}`);
  } else {
    const willUpdate = entries.filter(
      (e) => bySlug.has(DOC_TO_DB_SLUG[e.slug] ?? e.slug),
    ).length;
    console.log(
      `DRY-RUN (no writes). Would UPDATE ${willUpdate}, ${entries.length - willUpdate} new ` +
        `(${CREATE ? "would CREATE as drafts" : "pass --create to add as drafts"}).`,
    );
    console.log(`Preview → ${previewPath}`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
