import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prisma } from "../../src/db/prisma.js";

/**
 * Bulk-load a test center's price list into the exam catalogue.
 *
 * Reads the CSV produced by `parse-synlab-pdf.py` and, for every row:
 *   1. Upserts a global `ExamType` keyed on our GH reference (`code`), e.g.
 *      "GH1-0001". The GH prefix encodes the scientific group (GH1
 *      Alergologia … GH15 Urina) and the 4-digit tail is that group's running
 *      counter — both are assigned by the parser, not here, so re-running is
 *      stable.
 *   2. Upserts the `TestCenterExam` offering for the target center, carrying
 *      the supplier's own code, the quoted turnaround, our cost and the markup
 *      that reproduces the patient price.
 *
 * Pricing. The CSV's `patientPriceCents` is the supplier's PVP — what the
 * patient pays. We buy at a 20% discount, so `costCents = round(PVP * 0.8)`.
 * Two ways to store the markup that turns cost back into PVP:
 *   --markup=fixed   (default) markupValue = PVP - cost, per row. The patient
 *                    price matches the printed sheet to the cent, always.
 *   --markup=percent markupMode=PERCENT, markupValue=2500 (25.00%). Self-
 *                    maintaining — edit the cost and the price follows — but
 *                    rounding puts 211 of the 4243 December-2025 rows 1 cent
 *                    off the printed PVP.
 *
 * Idempotent: re-running upserts by (code) and (testCenterId, examTypeId)
 * rather than inserting duplicates, so a refreshed price sheet can be replayed.
 *
 *   pnpm tsx scripts/synlab/import-synlab-exams.ts --center=<testCenterId> --dry
 *   pnpm tsx scripts/synlab/import-synlab-exams.ts --center=<testCenterId> --commit
 *   pnpm tsx scripts/synlab/import-synlab-exams.ts --center-slug=synlab-portugal --country=pt --commit
 *
 * Run AFTER the `20260722000000_exam_catalogue_codes` migration is applied.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const arg = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const COMMIT = args.includes("--commit");
const CENTER_ID = arg("center");
const CENTER_SLUG = arg("center-slug");
const COUNTRY_CODE = arg("country");
const CURRENCY = (arg("currency") ?? "EUR").toUpperCase();
const CSV_PATH = arg("csv") ?? path.join(HERE, "synlab-exams-2025-12.csv");
const MARKUP: "fixed" | "percent" = arg("markup") === "percent" ? "percent" : "fixed";
/** Basis points added to cost in PERCENT mode. 2500 = 25.00% = the inverse of
 *  a 20% purchase discount. */
const PERCENT_BASIS_POINTS = 2500;
const BATCH = 200;

type Row = {
  ghCode: string;
  synlabCode: string;
  name: string;
  slug: string;
  category: string;
  turnaroundDays: number;
  costCents: number;
  patientPriceCents: number;
};

/** Minimal RFC-4180 reader — the sheet has quoted fields containing commas. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    rows.push(record);
  }

  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

function loadRows(): Row[] {
  const raw = parseCsv(readFileSync(CSV_PATH, "utf8"));
  return raw.map((r, i) => {
    const patientPriceCents = Number(r.patientPriceCents);
    const costCents = Number(r.costCents);
    const turnaroundDays = Number(r.turnaroundDays);
    if (!r.ghCode || !r.synlabCode || !r.name || !r.slug) {
      throw new Error(`Row ${i + 2}: missing ghCode/synlabCode/name/slug`);
    }
    if (!Number.isInteger(patientPriceCents) || patientPriceCents < 0) {
      throw new Error(`Row ${i + 2} (${r.ghCode}): bad patientPriceCents "${r.patientPriceCents}"`);
    }
    if (!Number.isInteger(costCents) || costCents < 0) {
      throw new Error(`Row ${i + 2} (${r.ghCode}): bad costCents "${r.costCents}"`);
    }
    return {
      ghCode: r.ghCode!,
      synlabCode: r.synlabCode!,
      name: r.name!,
      slug: r.slug!,
      category: r.category ?? "",
      turnaroundDays: Number.isInteger(turnaroundDays) ? turnaroundDays : 0,
      costCents,
      patientPriceCents,
    };
  });
}

/** cost + markup must reproduce the sheet's PVP — see the header note. */
function markupFor(row: Row): { markupMode: "FIXED" | "PERCENT"; markupValue: number } {
  if (MARKUP === "percent") {
    return { markupMode: "PERCENT", markupValue: PERCENT_BASIS_POINTS };
  }
  return { markupMode: "FIXED", markupValue: row.patientPriceCents - row.costCents };
}

async function resolveCenter() {
  if (CENTER_ID) {
    const center = await prisma.testCenter.findUnique({
      where: { id: CENTER_ID },
      select: { id: true, name: true, slug: true, countryId: true },
    });
    if (!center) throw new Error(`No test center with id "${CENTER_ID}"`);
    return center;
  }
  if (!CENTER_SLUG) {
    throw new Error("Pass --center=<testCenterId> or --center-slug=<slug> [--country=<code>]");
  }
  const centers = await prisma.testCenter.findMany({
    where: {
      slug: CENTER_SLUG,
      ...(COUNTRY_CODE
        ? { country: { code: { equals: COUNTRY_CODE, mode: "insensitive" as const } } }
        : {}),
    },
    select: { id: true, name: true, slug: true, countryId: true },
  });
  if (centers.length === 0) {
    throw new Error(`No test center with slug "${CENTER_SLUG}"${COUNTRY_CODE ? ` in ${COUNTRY_CODE}` : ""}`);
  }
  if (centers.length > 1) {
    throw new Error(
      `Slug "${CENTER_SLUG}" matches ${centers.length} centers — pass --country=<code> or --center=<id>`,
    );
  }
  return centers[0]!;
}

async function main() {
  const rows = loadRows();
  const first = rows[0];
  if (!first) throw new Error(`No rows in ${CSV_PATH}`);
  const firstMarkup = markupFor(first);
  // Printed before touching the DB so a bad CSV is obvious without a connection.
  console.log(`loaded ${rows.length} rows from ${CSV_PATH}`);
  console.log(
    `sample: ${first.ghCode} / ${first.synlabCode} "${first.name}" [${first.category}] — ` +
      `cost ${(first.costCents / 100).toFixed(2)} + ` +
      `${firstMarkup.markupMode === "PERCENT" ? `${firstMarkup.markupValue / 100}%` : (firstMarkup.markupValue / 100).toFixed(2)}` +
      ` → PVP ${(first.patientPriceCents / 100).toFixed(2)}`,
  );

  const center = await resolveCenter();

  const currency = await prisma.currency.findUnique({
    where: { code: CURRENCY },
    select: { code: true },
  });
  if (!currency) throw new Error(`Currency "${CURRENCY}" not found`);

  const dupCodes = rows.map((r) => r.ghCode).filter((c, i, a) => a.indexOf(c) !== i);
  if (dupCodes.length > 0) throw new Error(`Duplicate ghCode in CSV: ${dupCodes.slice(0, 5).join(", ")}`);

  const mode = COMMIT ? "COMMIT" : "DRY RUN";
  console.log(`[${mode}] ${rows.length} rows → ${center.name} (${center.slug}, ${center.id})`);
  console.log(`[${mode}] csv=${CSV_PATH} currency=${CURRENCY} markup=${MARKUP}`);

  // A slug already taken by an exam type carrying a different GH code would
  // make the create half of the upsert fail on the unique index. Surface it
  // before writing anything rather than dying mid-batch.
  const slugClashes = await prisma.examType.findMany({
    where: {
      slug: { in: rows.map((r) => r.slug) },
      OR: [{ code: null }, { code: { notIn: rows.map((r) => r.ghCode) } }],
    },
    select: { slug: true, code: true, name: true },
  });
  if (slugClashes.length > 0) {
    throw new Error(
      `${slugClashes.length} slug(s) already used by other exam types: ` +
        slugClashes.slice(0, 5).map((c) => `${c.slug} (${c.code ?? "no code"})`).join(", "),
    );
  }

  if (!COMMIT) {
    const existingTypes = await prisma.examType.count({
      where: { code: { in: rows.map((r) => r.ghCode) } },
    });
    const existingOfferings = await prisma.testCenterExam.count({
      where: { testCenterId: center.id },
    });
    console.log(`[${mode}] exam types already carrying these GH codes: ${existingTypes}`);
    console.log(`[${mode}] offerings already on this center: ${existingOfferings}`);
    console.log(`[${mode}] slug conflicts: none`);
    console.log(`[${mode}] nothing written. Re-run with --commit to apply.`);
    return;
  }

  let types = 0;
  let offerings = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await prisma.$transaction(async (tx) => {
      for (const row of slice) {
        const examType = await tx.examType.upsert({
          where: { code: row.ghCode },
          create: {
            code: row.ghCode,
            name: row.name,
            slug: row.slug,
            category: row.category || null,
            isActive: true,
          },
          update: {
            name: row.name,
            category: row.category || null,
          },
          select: { id: true },
        });
        types += 1;

        const { markupMode, markupValue } = markupFor(row);
        await tx.testCenterExam.upsert({
          where: {
            testCenterId_examTypeId: { testCenterId: center.id, examTypeId: examType.id },
          },
          create: {
            testCenterId: center.id,
            examTypeId: examType.id,
            supplierCode: row.synlabCode,
            turnaroundDays: row.turnaroundDays || null,
            costCents: row.costCents,
            markupMode,
            markupValue,
            currencyCode: CURRENCY,
            isActive: true,
          },
          update: {
            supplierCode: row.synlabCode,
            turnaroundDays: row.turnaroundDays || null,
            costCents: row.costCents,
            markupMode,
            markupValue,
            currencyCode: CURRENCY,
          },
          select: { id: true },
        });
        offerings += 1;
      }
    });
    console.log(`[${mode}] ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log(`[${mode}] done — ${types} exam types upserted, ${offerings} offerings upserted.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
