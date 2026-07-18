/**
 * One-off seed: TERMS_OF_SERVICE, PRIVACY_POLICY, REFUND_POLICY and
 * COMPLAINTS_PROCEDURE CountryLegalDocument rows (locale "en") for all
 * six live countries, sourced from the extracted legal HTML fragments in
 * scripts/content/legal/.
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-legal-documents.ts
 *   pnpm --filter backend exec node --import tsx scripts/seed-legal-documents.ts --upload-pdfs   # + LEGAL_PDF_DIR=<path to source PDFs>
 *
 * COMPLAINTS_PROCEDURE is a new LegalDocumentType enum value (migration
 * 20260718020000_add_complaints_procedure_legal_type). Postgres forbids
 * using a freshly added enum value inside the same transaction that added
 * it, so this script adds it via a standalone statement before any use —
 * safe to re-run (ADD VALUE IF NOT EXISTS).
 *
 * Idempotent: upserts on the CountryLegalDocument @@unique([countryId, type, locale]).
 * Existing pdfPath is left untouched unless --upload-pdfs is passed.
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "content", "legal");

const UPLOAD_PDFS = process.argv.includes("--upload-pdfs");

function readHtml(filename: string): string {
  return readFileSync(path.join(CONTENT_DIR, filename), "utf8").trim();
}

const MASTER_TC = readHtml("GlobalHealth_Master_TC_final.html");
const PRIVACY_POLICY = readHtml("GlobalHealth_Privacy_Policy_final.html");
const REFUND_POLICY = readHtml("GlobalHealth_Refund_Policy_final.html");
const COMPLAINTS_PROCEDURE = readHtml("GlobalHealth_Complaints_Procedure_final.html");

const ADDENDUM_FILE: Record<string, string> = {
  ie: "GlobalHealth_Ireland_Addendum_final.html",
  cz: "GlobalHealth_Czech_Addendum_final.html",
  pt: "GlobalHealth_Portugal_Addendum_final.html",
  es: "GlobalHealth_Spain_Addendum_final.html",
  ro: "GlobalHealth_Romania_Addendum_final.html",
  br: "GlobalHealth_Brazil_Addendum_final.html",
};

const PDF_SOURCE_FILE: Record<LegalDocumentType, string> = {
  TERMS_OF_SERVICE: "GlobalHealth_Master_TC_final.pdf",
  PRIVACY_POLICY: "GlobalHealth_Privacy_Policy_final.pdf",
  REFUND_POLICY: "GlobalHealth_Refund_Policy_final.pdf",
  COMPLAINTS_PROCEDURE: "GlobalHealth_Complaints_Procedure_final.pdf",
  // Not seeded by this script — present only so the Record is total.
  COOKIE_POLICY: "",
  GDPR_NOTICE: "",
  DATA_PROCESSING_AGREEMENT: "",
  MEDICAL_DISCLAIMER: "",
  ACCESSIBILITY_STATEMENT: "",
};

const COUNTRIES = ["ie", "cz", "pt", "es", "ro", "br"] as const;

type DocSeed = { type: LegalDocumentType; title: string; content: string };

function docsFor(countryCode: string): DocSeed[] {
  const addendum = readHtml(ADDENDUM_FILE[countryCode]);
  return [
    {
      type: LegalDocumentType.TERMS_OF_SERVICE,
      title: "Terms and Conditions",
      content: `${MASTER_TC}\n<hr />\n${addendum}`,
    },
    { type: LegalDocumentType.PRIVACY_POLICY, title: "Privacy Policy", content: PRIVACY_POLICY },
    { type: LegalDocumentType.REFUND_POLICY, title: "Refund Policy", content: REFUND_POLICY },
    {
      type: LegalDocumentType.COMPLAINTS_PROCEDURE,
      title: "Complaints Procedure",
      content: COMPLAINTS_PROCEDURE,
    },
  ];
}

/** Uploads a source PDF (from LEGAL_PDF_DIR) and returns the object-storage key. */
async function uploadPdf(type: LegalDocumentType, slug: string): Promise<string | null> {
  if (!UPLOAD_PDFS) return null;
  const pdfDir = process.env.LEGAL_PDF_DIR;
  const sourceFile = PDF_SOURCE_FILE[type];
  if (!pdfDir || !sourceFile) return null;
  const { putObject } = await import("../src/services/object-storage.js");
  const buffer = readFileSync(path.join(pdfDir, sourceFile));
  const key = `documents/legal-${slug}.pdf`;
  await putObject(key, buffer, "application/pdf");
  return key;
}

async function addComplaintsProcedureEnumValue(): Promise<void> {
  // Must run as its own statement, outside any transaction that will use
  // the value — Postgres rejects using an enum value added earlier in the
  // same transaction.
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'COMPLAINTS_PROCEDURE'`,
  );
}

async function main(): Promise<void> {
  await addComplaintsProcedureEnumValue();

  for (const code of COUNTRIES) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true },
    });
    if (!country) {
      console.warn(`[legal-doc] skip ${code}: country not found`);
      continue;
    }

    for (const doc of docsFor(code)) {
      const slug = `${code}-${doc.type.toLowerCase().replace(/_/g, "-")}`;
      const pdfPath = await uploadPdf(doc.type, slug);

      const existing = await prisma.countryLegalDocument.findUnique({
        where: {
          countryId_type_locale: { countryId: country.id, type: doc.type, locale: "en" },
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.countryLegalDocument.update({
          where: { id: existing.id },
          data: {
            title: doc.title,
            content: doc.content,
            isPublished: true,
            publishedAt: new Date(),
            version: { increment: 1 },
            ...(pdfPath ? { pdfPath } : {}),
          },
        });
        console.log(`[legal-doc] updated ${code}/${doc.type}`);
      } else {
        await prisma.countryLegalDocument.create({
          data: {
            countryId: country.id,
            type: doc.type,
            locale: "en",
            title: doc.title,
            content: doc.content,
            isPublished: true,
            publishedAt: new Date(),
            ...(pdfPath ? { pdfPath } : {}),
          },
        });
        console.log(`[legal-doc] created ${code}/${doc.type}`);
      }
    }
  }

  console.log("Legal documents seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
