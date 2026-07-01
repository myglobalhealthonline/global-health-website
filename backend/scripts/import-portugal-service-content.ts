/**
 * Import the Portugal service-page content (parsed from
 * "Portugal Service descriptions.docx") into the PT Service rows.
 *
 *   node --env-file=.env --import tsx scripts/import-portugal-service-content.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/import-portugal-service-content.ts --apply    # update existing
 *   node --env-file=.env --import tsx scripts/import-portugal-service-content.ts --apply --create   # + create missing drafts
 *
 * The JSON already carries the live PT DB slug per entry, so there is no
 * doc→DB slug remap. Updates set seoTitle/seoDescription/seoKeywords/heroTitle/
 * heroDescription/detailBody and replace the service FAQs (base columns = the
 * PT default-locale content). Missing services are created as INACTIVE drafts
 * only with --create; price/duration stay null for an admin to set + publish.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ServiceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const COUNTRY_CODE = "pt";
const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "data", "portugal-service-content.json");

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

async function main() {
  const entries = JSON.parse(readFileSync(DATA, "utf-8")) as Entry[];
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true, currency: { select: { code: true } } },
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
    const id = bySlug.get(e.slug);
    const action = id ? "UPDATE" : CREATE ? "CREATE" : "NEW";
    preview.push({
      slug: e.slug,
      action,
      kind: e.kind,
      seoTitleLen: e.seoTitle.length,
      bodyLen: detailBody.length,
      faqs: e.faqs.length,
    });
    console.log(
      `${action.padEnd(7)} ${e.slug.padEnd(40)} faqs=${e.faqs.length} body=${detailBody.length} kw=${(e.seoKeywords ?? []).length}`,
    );

    if (!APPLY) {
      if (action === "NEW") missing += 1;
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

  const previewPath = path.join(here, "data", "portugal-import-preview.json");
  writeFileSync(previewPath, JSON.stringify(preview, null, 2));

  console.log("\n────────────");
  console.log(`total ${entries.length}  existing-in-DB ${bySlug.size}`);
  if (APPLY) {
    console.log(`APPLIED: updated ${updated}, created ${created}`);
  } else {
    const willUpdate = entries.filter((e) => bySlug.has(e.slug)).length;
    console.log(
      `DRY-RUN (no writes). Would UPDATE ${willUpdate}, ${entries.length - willUpdate} new ` +
        `(${CREATE ? "would CREATE as drafts" : "pass --create to add as drafts"}).`,
    );
    console.log(`Preview → ${previewPath}`);
    void missing;
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
