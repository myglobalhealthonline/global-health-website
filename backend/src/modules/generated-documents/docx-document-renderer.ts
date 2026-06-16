import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import PizZip from "pizzip";
import type { GeneratedDocumentType } from "@prisma/client";
import {
  docxFilename,
  profileForPrefix,
  templatePrefixForCountry,
} from "./docx-template-profiles.js";
import {
  injectProfessionalLayout,
  trimBodyLeadingEmptyParagraphs,
} from "./docx-xml-builder.js";
import { applyDocumentFooterLayout } from "./docx-footer-inline.js";
import { injectQrBlock } from "./docx-qr-inline.js";
import {
  ensureAlexBrushFont,
  installAlexBrushForLibreOffice,
  writeFontconfigForLibreOffice,
} from "./docx-alex-brush-font.js";

/** Per-prescription QR engraving for exams prescriptions (optional). */
export type DocxQrOptions = {
  pngBuffer: Buffer;
  title: string;
  instruction: string;
};

const execFileAsync = promisify(execFile);

function resolveDocxTemplatesRoot(): string {
  // Prefer repo Templates/ (source of truth: logos in header, borders in layout).
  const candidates = [
    path.join(process.cwd(), "..", "Templates"),
    path.join(process.cwd(), "Templates"),
    path.join(process.cwd(), "assets", "docx-templates"),
  ];
  for (const root of candidates) {
    if (fs.existsSync(root) && fs.readdirSync(root).some((f) => f.endsWith(".docx"))) {
      return root;
    }
  }
  return path.join(process.cwd(), "assets", "docx-templates");
}

export const DOCX_TEMPLATES_ROOT = resolveDocxTemplatesRoot();

export function resolveDocxTemplatePath(
  countryCode: string,
  documentType: GeneratedDocumentType,
): string | null {
  const prefix = templatePrefixForCountry(countryCode);
  if (!prefix) return null;
  const name = docxFilename(prefix, documentType);
  if (!name) return null;
  const full = path.join(DOCX_TEMPLATES_ROOT, name);
  return fs.existsSync(full) ? full : null;
}

function fillDocxXml(
  xml: string,
  profile: NonNullable<ReturnType<typeof profileForPrefix>>,
  documentType: GeneratedDocumentType,
  data: Record<string, string>,
): string {
  return injectProfessionalLayout(xml, profile, documentType, data);
}

const COUNTRY_FOOTER_ADDRESSES: Record<string, string> = {
  IR: "Trinity Street 6-9 Dublin 2, D02 EY47 Ireland",
  PT: "Rua Brincos de Princesa 13 · 2710-683 Sintra · Portugal · Tel.: 919990810",
};

export function fillDocxBuffer(
  templateBuffer: Buffer,
  countryCode: string,
  documentType: GeneratedDocumentType,
  data: Record<string, string>,
  qr?: DocxQrOptions,
): Buffer {
  const prefix = templatePrefixForCountry(countryCode);
  if (!prefix) throw new Error(`No DOCX template prefix for country ${countryCode}`);
  const profile = profileForPrefix(prefix);
  if (!profile) throw new Error(`No DOCX profile for prefix ${prefix}`);

  const zip = new PizZip(templateBuffer);
  // Only replace body placeholders in document.xml. Logo, border, and
  // header/footer graphics live in header1.xml + word/media/* — leave untouched.
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  let filled = fillDocxXml(documentXml.asText(), profile, documentType, data);
  filled = trimBodyLeadingEmptyParagraphs(filled);
  // QR sits before the footer gap so it prints just above the footer band.
  if (qr) {
    filled = injectQrBlock(zip, filled, qr.pngBuffer, {
      title: qr.title,
      instruction: qr.instruction,
    });
  }
  const countryAddress = COUNTRY_FOOTER_ADDRESSES[countryCode.toUpperCase()];
  filled = applyDocumentFooterLayout(zip, filled, countryAddress);
  zip.file("word/document.xml", filled);
  ensureAlexBrushFont(zip);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

async function resolveSofficeBinary(): Promise<string | null> {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    "soffice",
    "libreoffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter((b): b is string => Boolean(b));
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"]);
      return bin;
    } catch {
      /* next */
    }
  }
  return null;
}

async function convertDocxToPdfWithLibreOffice(docxBuffer: Buffer): Promise<Buffer> {
  const soffice = await resolveSofficeBinary();
  if (!soffice) throw new Error("LibreOffice (soffice) not found");

  const workDir = await mkdtemp(path.join(tmpdir(), "gh-docx-"));
  const docxPath = path.join(workDir, "document.docx");
  try {
    const fontDir = installAlexBrushForLibreOffice();
    await writeFile(docxPath, docxBuffer);
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (fontDir) {
      env.FONTCONFIG_FILE = writeFontconfigForLibreOffice(workDir, fontDir);
    }
    await execFileAsync(
      soffice,
      ["--headless", "--norestore", "--convert-to", "pdf", "--outdir", workDir, docxPath],
      { env },
    );
    const pdfPath = path.join(workDir, "document.pdf");
    return await readFile(pdfPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

let libreOfficeAvailable: boolean | null = null;

async function isLibreOfficeAvailable(): Promise<boolean> {
  if (libreOfficeAvailable !== null) return libreOfficeAvailable;
  libreOfficeAvailable = (await resolveSofficeBinary()) !== null;
  return libreOfficeAvailable;
}

export async function renderDocxTemplatePdf(
  countryCode: string,
  documentType: GeneratedDocumentType,
  data: Record<string, string>,
  qr?: DocxQrOptions,
): Promise<Buffer | null> {
  const templatePath = resolveDocxTemplatePath(countryCode, documentType);
  if (!templatePath) return null;

  if (!(await isLibreOfficeAvailable())) {
    console.warn(
      "[docx-document-renderer] LibreOffice not found — cannot render DOCX templates",
    );
    return null;
  }

  const templateBuffer = await readFile(templatePath);
  const filled = fillDocxBuffer(templateBuffer, countryCode, documentType, data, qr);
  return convertDocxToPdfWithLibreOffice(filled);
}
