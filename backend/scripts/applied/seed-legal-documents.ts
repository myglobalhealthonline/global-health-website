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
import { prisma } from "../../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content", "legal");

const UPLOAD_PDFS = process.argv.includes("--upload-pdfs");

const pdfDirArg = process.argv.find((a) => a.startsWith("--pdf-dir="));
const PDF_DIR = pdfDirArg ? pdfDirArg.slice("--pdf-dir=".length) : process.env.LEGAL_PDF_DIR;

const ADDENDUM_PDF_FILE: Record<string, string> = {
  ie: "GlobalHealth_Ireland_Addendum_final.pdf",
  cz: "GlobalHealth_Czech_Addendum_final.pdf",
  pt: "GlobalHealth_Portugal_Addendum_final.pdf",
  es: "GlobalHealth_Spain_Addendum_final.pdf",
  ro: "GlobalHealth_Romania_Addendum_final.pdf",
  br: "GlobalHealth_Brazil_Addendum_final.pdf",
};

const ALL_LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;
type Locale = (typeof ALL_LOCALES)[number];

const localesArg = process.argv.find((a) => a.startsWith("--locales="));
const LOCALES: Locale[] = localesArg
  ? (localesArg.slice("--locales=".length).split(",").filter(Boolean) as Locale[])
  : [...ALL_LOCALES];

function readHtml(dir: string, filename: string): string {
  return readFileSync(path.join(dir, filename), "utf8").trim();
}

const TITLES: Record<Locale, Record<LegalDocumentType, string>> = {
  en: {
    ...({} as Record<LegalDocumentType, string>),
    TERMS_OF_SERVICE: "Terms and Conditions",
    PRIVACY_POLICY: "Privacy Policy",
    REFUND_POLICY: "Refund Policy",
    COMPLAINTS_PROCEDURE: "Complaints Procedure",
  } as Record<LegalDocumentType, string>,
  pt: {
    TERMS_OF_SERVICE: "Termos e Condições",
    PRIVACY_POLICY: "Política de Privacidade",
    REFUND_POLICY: "Política de Reembolso",
    COMPLAINTS_PROCEDURE: "Procedimento de Reclamações",
  } as Record<LegalDocumentType, string>,
  es: {
    TERMS_OF_SERVICE: "Términos y Condiciones",
    PRIVACY_POLICY: "Política de Privacidad",
    REFUND_POLICY: "Política de Reembolso",
    COMPLAINTS_PROCEDURE: "Procedimiento de Reclamaciones",
  } as Record<LegalDocumentType, string>,
  cs: {
    TERMS_OF_SERVICE: "Obchodní podmínky",
    PRIVACY_POLICY: "Zásady ochrany osobních údajů",
    REFUND_POLICY: "Zásady vracení peněz",
    COMPLAINTS_PROCEDURE: "Postup při stížnostech",
  } as Record<LegalDocumentType, string>,
  ro: {
    TERMS_OF_SERVICE: "Termeni și Condiții",
    PRIVACY_POLICY: "Politica de Confidențialitate",
    REFUND_POLICY: "Politica de Rambursare",
    COMPLAINTS_PROCEDURE: "Procedura de Reclamații",
  } as Record<LegalDocumentType, string>,
  de: {
    TERMS_OF_SERVICE: "Allgemeine Geschäftsbedingungen",
    PRIVACY_POLICY: "Datenschutzerklärung",
    REFUND_POLICY: "Erstattungsrichtlinie",
    COMPLAINTS_PROCEDURE: "Beschwerdeverfahren",
  } as Record<LegalDocumentType, string>,
};

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

function localeDirFor(locale: Locale): string {
  return locale === "en" ? CONTENT_DIR : path.join(CONTENT_DIR, locale);
}

/** Loads the 4 locale-wide files (everything except the per-country addendum) once. Throws if any is missing. */
function loadLocaleCommon(locale: Locale) {
  const dir = localeDirFor(locale);
  return {
    masterTc: readHtml(dir, "GlobalHealth_Master_TC_final.html"),
    privacyPolicy: readHtml(dir, "GlobalHealth_Privacy_Policy_final.html"),
    refundPolicy: readHtml(dir, "GlobalHealth_Refund_Policy_final.html"),
    complaintsProcedure: readHtml(dir, "GlobalHealth_Complaints_Procedure_final.html"),
  };
}

/** Returns null (and logs a warn) if the country's addendum file for this locale is missing. */
function docsFor(
  countryCode: string,
  locale: Locale,
  common: ReturnType<typeof loadLocaleCommon>,
): DocSeed[] | null {
  const titles = TITLES[locale];
  let addendum: string;
  try {
    addendum = readHtml(localeDirFor(locale), ADDENDUM_FILE[countryCode]);
  } catch (error) {
    console.warn(
      `[legal-doc] skip ${countryCode}/${locale}: addendum missing (${(error as Error).message})`,
    );
    return null;
  }
  return [
    {
      type: LegalDocumentType.TERMS_OF_SERVICE,
      title: titles.TERMS_OF_SERVICE,
      content: `${common.masterTc}\n<hr />\n${addendum}`,
    },
    { type: LegalDocumentType.PRIVACY_POLICY, title: titles.PRIVACY_POLICY, content: common.privacyPolicy },
    { type: LegalDocumentType.REFUND_POLICY, title: titles.REFUND_POLICY, content: common.refundPolicy },
    {
      type: LegalDocumentType.COMPLAINTS_PROCEDURE,
      title: titles.COMPLAINTS_PROCEDURE,
      content: common.complaintsProcedure,
    },
  ];
}

/**
 * Uploads a source PDF (from PDF_DIR) and returns the object-storage key.
 * TERMS_OF_SERVICE is country-specific: merges the global Master T&C with
 * the country's own addendum PDF (via pdf-lib) so the PDF mirrors the HTML
 * page order (master first, addendum after). The other 3 types are one
 * global file shared by every country — that's correct, not a bug.
 */
async function uploadPdf(
  type: LegalDocumentType,
  slug: string,
  countryCode: string,
): Promise<string | null> {
  if (!UPLOAD_PDFS) return null;
  const pdfDir = PDF_DIR;
  const sourceFile = PDF_SOURCE_FILE[type];
  if (!pdfDir || !sourceFile) return null;
  const { putObject } = await import("../../src/services/object-storage.js");

  let buffer: Buffer;
  if (type === LegalDocumentType.TERMS_OF_SERVICE) {
    const addendumFile = ADDENDUM_PDF_FILE[countryCode];
    const masterBytes = readFileSync(path.join(pdfDir, sourceFile));
    const addendumBytes = readFileSync(path.join(pdfDir, addendumFile));
    const { PDFDocument } = await import("pdf-lib");
    const merged = await PDFDocument.create();
    for (const bytes of [masterBytes, addendumBytes]) {
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
    buffer = Buffer.from(await merged.save());
  } else {
    buffer = readFileSync(path.join(pdfDir, sourceFile));
  }

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

  for (const locale of LOCALES) {
    let common: ReturnType<typeof loadLocaleCommon>;
    try {
      common = loadLocaleCommon(locale);
    } catch (error) {
      console.warn(`[legal-doc] skip locale ${locale}: ${(error as Error).message}`);
      continue;
    }

    for (const code of COUNTRIES) {
      const country = await prisma.country.findFirst({
        where: { code: { equals: code, mode: "insensitive" } },
        select: { id: true },
      });
      if (!country) {
        console.warn(`[legal-doc] skip ${code}/${locale}: country not found`);
        continue;
      }

      const docs = docsFor(code, locale, common);
      if (!docs) continue;

      for (const doc of docs) {
        const slug = `${code}-${doc.type.toLowerCase().replace(/_/g, "-")}`;
        const pdfPath = locale === "en" ? await uploadPdf(doc.type, slug, code) : null;

        const existing = await prisma.countryLegalDocument.findUnique({
          where: {
            countryId_type_locale: { countryId: country.id, type: doc.type, locale },
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
          console.log(`[legal-doc] updated ${code}/${locale}/${doc.type}`);
        } else {
          await prisma.countryLegalDocument.create({
            data: {
              countryId: country.id,
              type: doc.type,
              locale,
              title: doc.title,
              content: doc.content,
              isPublished: true,
              publishedAt: new Date(),
              ...(pdfPath ? { pdfPath } : {}),
            },
          });
          console.log(`[legal-doc] created ${code}/${locale}/${doc.type}`);
        }
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
