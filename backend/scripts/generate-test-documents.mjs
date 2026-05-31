/**
 * Generate sample consultation documents for manual QA.
 * Writes to backend/test-output/documents/
 *
 * Usage: node --import tsx scripts/generate-test-documents.mjs [output-subdir]
 * Requires LibreOffice (soffice) for PDF; always writes filled .docx.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, "..");
const subdir = process.argv[2] ?? "documents";
const outDir = path.join(backendRoot, "test-output", subdir);

// Dynamic import compiled TS via tsx
const { fillDocxBuffer, resolveDocxTemplatePath, DOCX_TEMPLATES_ROOT } = await import(
  "../src/modules/generated-documents/docx-document-renderer.ts"
);
const { renderDocumentPdf } = await import(
  "../src/modules/generated-documents/html-document-renderer.ts"
);
const { formatExamsNotes } = await import(
  "../src/modules/generated-documents/document-template-utils.ts"
);

const SOFFICE_CANDIDATES = [
  "soffice",
  "libreoffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

async function findSoffice() {
  for (const bin of SOFFICE_CANDIDATES) {
    try {
      await execFileAsync(bin, ["--version"]);
      return bin;
    } catch {
      /* next */
    }
  }
  return null;
}

async function writeFileSafe(targetPath, data) {
  try {
    await writeFile(targetPath, data);
    return targetPath;
  } catch (err) {
    if (err?.code !== "EBUSY") throw err;
    const alt = targetPath.replace(/(\.[^.]+)$/, "-updated$1");
    await writeFile(alt, data);
    console.warn(`File locked — wrote ${alt} instead (close ${path.basename(targetPath)} and re-run)`);
    return alt;
  }
}

async function docxToPdfInPlace(soffice, docxPath) {
  const dir = path.dirname(docxPath);
  const base = path.basename(docxPath, ".docx");
  await execFileAsync(soffice, [
    "--headless",
    "--norestore",
    "--convert-to",
    "pdf",
    "--outdir",
    dir,
    docxPath,
  ]);
  return readFile(path.join(dir, `${base}.pdf`));
}

const samples = [
  {
    slug: "ie-exams",
    country: "ie",
    type: "EXAMS_PRESCRIPTION",
    data: {
      patientName: "Jane O'Brien",
      birthDate: "15/03/1988",
      address: "12 Grafton Street, Dublin 2, Ireland",
      consultationDate: "31/05/2026",
      doctorName: "Dr Sarah Murphy",
      registrationNumber: "IMC: 123456",
      exams: "Full blood count\nChest X-Ray",
      notes: "Fasting from midnight",
      examsNotes: formatExamsNotes("Full blood count\nChest X-Ray", "Fasting from midnight"),
    },
  },
  {
    slug: "pt-prescription",
    country: "pt",
    type: "PRESCRIPTION",
    data: {
      patientName: "João Silva",
      birthDate: "22/07/1975",
      address: "Rua Augusta 100, Lisboa",
      consultationDate: "31/05/2026",
      doctorName: "Dra. Maria Costa",
      registrationNumber: "OM: 54321",
      medication1: "Paracetamol 500mg — 1 comprimido 8/8h",
      medication2: "Ibuprofeno 400mg — se dor",
      pharmacy: "Farmácia Central, Lisboa",
    },
  },
  {
    slug: "es-absence",
    country: "sp",
    type: "ABSENCE_CERTIFICATE",
    data: {
      patientName: "Carlos García",
      birthDate: "01/11/1990",
      address: "Calle Mayor 5, Madrid",
      consultationDate: "31/05/2026",
      doctorName: "Dr. Antonio Ruiz",
      registrationNumber: "Col: 98765",
      startDate: "01/06/2026",
      endDate: "05/06/2026",
      reason: "Medical Confidentiality (GDPR)",
    },
  },
];

fs.mkdirSync(outDir, { recursive: true });
console.log("Templates root:", DOCX_TEMPLATES_ROOT);
console.log("Output:", outDir);

const soffice = await findSoffice();
if (soffice) console.log("LibreOffice:", soffice);
else console.warn("LibreOffice not found — will write .docx only (open in Word to preview logo/border)");

for (const sample of samples) {
  const templatePath = resolveDocxTemplatePath(sample.country, sample.type);
  if (!templatePath) {
    console.warn(`SKIP ${sample.slug}: no template`);
    continue;
  }

  const templateBuffer = await readFile(templatePath);
  const filledDocx = fillDocxBuffer(
    templateBuffer,
    sample.country,
    sample.type,
    sample.data,
  );

  const docxOut = await writeFileSafe(path.join(outDir, `${sample.slug}.docx`), filledDocx);
  console.log("Wrote", docxOut);

  if (soffice) {
    try {
      const pdfOut = path.join(outDir, `${sample.slug}.pdf`);
      const pdf = await docxToPdfInPlace(soffice, docxOut);
      await writeFileSafe(pdfOut, pdf);
      console.log("Wrote", pdfOut);
    } catch (err) {
      console.error(`PDF failed for ${sample.slug}:`, err.message);
    }
  }
}

// HTML fallback sample (Brazil — no DOCX pack)
try {
  const htmlPdf = await renderDocumentPdf("br", "EXAMS_PRESCRIPTION", {
    title: "Examinations prescription",
    patientName: "Test Patient BR",
    patientIdLine: "CPF: 123.456.789-00",
    birthDate: "01/01/1990",
    address: "São Paulo",
    consultationDate: "31/05/2026",
    currentDate: "31/05/2026",
    doctorName: "Dr Test",
    registrationNumber: "CRM: 00000",
    examsNotes: "Blood panel, ECG",
  });
  const brOut = path.join(outDir, "br-exams-html-fallback.pdf");
  await writeFile(brOut, htmlPdf);
  console.log("Wrote", brOut, "(HTML/Playwright fallback)");
} catch (err) {
  console.warn("HTML fallback PDF skipped:", err.message);
}

console.log("\nDone. Open .docx in Word or .pdf in a viewer.");
