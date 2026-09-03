import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  archiveFileName,
  archiveFolderSegments,
  archiveInvoiceToDrive,
  ARCHIVE_MIN_MONTH,
  isInvoiceDriveArchiveEnabled,
  shouldArchiveInvoiceToDrive,
} from "../src/modules/invoices/invoice-drive-archive.service.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer } from "../src/modules/invoices/invoice-pdf.js";
import { getObject, readObjectBodyToBuffer } from "../src/services/object-storage.js";

/**
 * Backfill: file already-issued PAID fiscal documents into the Google Drive
 * archive (Invoice/<COUNTRY>/<YYYY-MM>/<date>_<number>.pdf).
 *
 * From August 2026 onwards every payment files itself at issuance
 * (generate-invoice.service.ts, and pt-invoice-mirror.service.ts for Portugal).
 * This script is for the documents issued BEFORE that shipped — August 2026 —
 * and as the repair tool for any month where Drive was down at payment time.
 *
 * Where the PDF comes from:
 *   PT  — the stored InvoiceExpress copy (`pdfStorageKey`). Their document is
 *         the legal one; we must never redraw it in our template.
 *   all others — re-rendered from the order exactly as at issuance
 *         (same buildInvoicePdfData call the email attachment uses).
 *
 * Idempotent: the upload skips any filename already present in the folder, so
 * re-running never doubles a document up in the accountant's folder.
 *
 *   pnpm tsx scripts/backfill-invoice-drive-archive.ts --month=2026-08 --dry
 *   pnpm tsx scripts/backfill-invoice-drive-archive.ts --month=2026-08
 *   pnpm tsx scripts/backfill-invoice-drive-archive.ts --from=2026-08 --to=2026-09
 *   pnpm tsx scripts/backfill-invoice-drive-archive.ts --month=2026-08 --country=ie
 *
 * NOTE: the local .env points at the LIVE database. A --dry run is read-only
 * and safe; a real run uploads to the real Drive folder, which is the point —
 * but run it once, and check the dry run first.
 */

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");

function arg(name: string): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]?.trim();
}

const MONTH_RE = /^\d{4}-\d{2}$/;

const month = arg("month");
const fromMonth = month ?? arg("from") ?? ARCHIVE_MIN_MONTH;
const toMonth = month ?? arg("to") ?? fromMonth;
const countryFilter = arg("country")?.toLowerCase() || null;

if (!MONTH_RE.test(fromMonth) || !MONTH_RE.test(toMonth)) {
  console.error("Months must be YYYY-MM, e.g. --month=2026-08");
  process.exit(1);
}
if (toMonth < fromMonth) {
  console.error(`--to (${toMonth}) is before --from (${fromMonth})`);
  process.exit(1);
}
if (fromMonth < ARCHIVE_MIN_MONTH) {
  console.error(
    `The Drive archive starts at ${ARCHIVE_MIN_MONTH}; ${fromMonth} would be skipped on every row.`,
  );
  process.exit(1);
}

/** First instant of `YYYY-MM`, UTC — the same boundary archiveMonth() uses. */
function monthStart(m: string): Date {
  return new Date(`${m}-01T00:00:00.000Z`);
}

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

async function pdfForInvoice(invoice: {
  id: string;
  invoiceNumber: string;
  orderId: string;
  documentType: string;
  generatedAt: Date;
  pdfStorageKey: string | null;
}): Promise<Buffer | null> {
  // Portugal: the stored InvoiceExpress copy, never a redraw.
  if (invoice.pdfStorageKey) {
    const object = await getObject(invoice.pdfStorageKey);
    return await readObjectBodyToBuffer(object.Body);
  }
  const data = await buildInvoicePdfData(
    invoice.orderId,
    invoice.invoiceNumber,
    invoice.generatedAt.toISOString(),
    invoice.documentType as "RECEIPT" | "INVOICE_RECEIPT",
    null,
  );
  if (!data) return null;
  return await renderInvoicePdfBuffer(data);
}

async function main(): Promise<void> {
  const rangeStart = monthStart(fromMonth);
  const rangeEnd = monthStart(nextMonth(toMonth));

  console.log(
    `Drive invoice backfill — ${fromMonth}..${toMonth}` +
      `${countryFilter ? ` country=${countryFilter}` : ""}${DRY_RUN ? " (DRY RUN)" : ""}`,
  );

  if (!DRY_RUN && !isInvoiceDriveArchiveEnabled()) {
    console.error(
      "Drive archive is not enabled here. Set GOOGLE_DRIVE_REFRESH_TOKEN + " +
        "GOOGLE_DRIVE_INVOICE_ROOT_FOLDER_ID (mint the token with " +
        "scripts/mint-google-drive-token.ts), and INVOICE_DRIVE_ARCHIVE=on outside production.",
    );
    process.exit(1);
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      documentType: { in: ["RECEIPT", "INVOICE_RECEIPT"] },
      generatedAt: { gte: rangeStart, lt: rangeEnd },
      ...(countryFilter ? { countryCode: { equals: countryFilter, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      invoiceNumber: true,
      orderId: true,
      countryCode: true,
      documentType: true,
      generatedAt: true,
      pdfStorageKey: true,
    },
    orderBy: { generatedAt: "asc" },
  });

  console.log(`${invoices.length} paid document(s) in range.`);

  const log = {
    info: (obj: Record<string, unknown>, msg: string) => console.log(`  ${msg}`, obj),
    warn: (obj: Record<string, unknown>, msg: string) => console.warn(`  ${msg}`, obj),
  };

  const tally = { uploaded: 0, exists: 0, skipped: 0, failed: 0, noPdf: 0 };

  for (const invoice of invoices) {
    const path =
      `${archiveFolderSegments(invoice.countryCode, invoice.generatedAt).join("/")}/` +
      archiveFileName(invoice.invoiceNumber, invoice.generatedAt);

    if (!shouldArchiveInvoiceToDrive(invoice.documentType, invoice.generatedAt)) {
      tally.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would file ${path}`);
      tally.uploaded++;
      continue;
    }

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await pdfForInvoice(invoice);
    } catch (err) {
      console.warn(`  PDF unavailable for ${invoice.invoiceNumber}:`, err);
    }
    if (!pdfBuffer?.length) {
      tally.noPdf++;
      console.warn(`  no PDF for ${invoice.invoiceNumber} — skipped`);
      continue;
    }

    const result = await archiveInvoiceToDrive(
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        countryCode: invoice.countryCode,
        documentType: invoice.documentType,
        issuedAt: invoice.generatedAt,
        pdfBuffer,
      },
      log,
    );

    if (result.status === "uploaded") tally.uploaded++;
    else if (result.status === "exists") tally.exists++;
    else if (result.status === "failed") tally.failed++;
    else tally.skipped++;
  }

  console.log(
    `Done — uploaded ${tally.uploaded}, already there ${tally.exists}, ` +
      `no PDF ${tally.noPdf}, skipped ${tally.skipped}, failed ${tally.failed}.`,
  );
  if (tally.failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
