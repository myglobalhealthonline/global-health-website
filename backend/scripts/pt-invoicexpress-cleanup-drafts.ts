/**
 * Clean up the orphan InvoiceExpress drafts left behind by the PT issuer bug
 * (2026-07-17 → 2026-08-25).
 *
 * While `createInvoiceReceipt` posted to the generic `/invoices.json`,
 * InvoiceExpress created a plain draft Invoice and answered under an `invoice`
 * root key. The client read `invoice_receipt.id`, threw, and never finalized or
 * emailed anything — so every paid PT order in that window left a draft sitting
 * in the account while the native Stripe connector separately issued the real
 * "Consumidor final" Fatura-Recibo.
 *
 * These drafts must be DELETED, not finalized: finalizing one issues a second
 * legal document for a payment that already has one, which then needs a credit
 * note to unwind.
 *
 * Read-only by default. Nothing is deleted without `--apply`, and even then only
 * documents this script has confirmed are still in `draft` state.
 *
 *   # review what would go
 *   node --import tsx --env-file=.env scripts/pt-invoicexpress-cleanup-drafts.ts
 *   node --import tsx --env-file=.env scripts/pt-invoicexpress-cleanup-drafts.ts --since=2026-07-01
 *
 *   # delete a reviewed set (ids from the listing above)
 *   node --import tsx --env-file=.env scripts/pt-invoicexpress-cleanup-drafts.ts --ids=267092931,267143640 --apply
 *
 *   # delete every draft in the window — only after reading the listing
 *   node --import tsx --env-file=.env scripts/pt-invoicexpress-cleanup-drafts.ts --all-drafts --apply
 */
import {
  isInvoiceExpressConfigured,
  listDocuments,
  deleteDraftDocument,
  type IeDocumentType,
  type IeListedDocument,
} from "../src/lib/invoice-express/client.js";

const MAX_PAGES = 60;
const PER_PAGE = 30;

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** dd/mm/yyyy → Date, so a listing row can be compared against --since. */
function parseIeDate(date: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function asDocumentType(type: string): IeDocumentType {
  return type === "InvoiceReceipt" ? "InvoiceReceipt" : "Invoice";
}

async function collectDrafts(since: Date): Promise<IeListedDocument[]> {
  const drafts: IeListedDocument[] = [];
  let scanned = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await listDocuments(page, PER_PAGE);
    if (rows.length === 0) break;
    scanned += rows.length;

    for (const row of rows) {
      const when = parseIeDate(row.date);
      if (when && when < since) continue;
      if (row.status === "draft") drafts.push(row);
    }

    // The listing is newest-first, so once a whole page predates the window
    // there is nothing older worth reading.
    const oldest = parseIeDate(rows[rows.length - 1]?.date ?? "");
    if (oldest && oldest < since) break;
  }

  console.log(`scanned ${scanned} documents · ${drafts.length} draft(s) in window`);
  return drafts;
}

async function main(): Promise<void> {
  if (!isInvoiceExpressConfigured()) {
    console.error("INVOICE_EXPRESS_API_KEY / INVOICE_EXPRESS_ACCOUNT not set — nothing to do.");
    process.exitCode = 1;
    return;
  }

  const since = new Date(arg("since") ?? "2026-07-01");
  if (Number.isNaN(since.getTime())) {
    console.error("--since must be YYYY-MM-DD");
    process.exitCode = 1;
    return;
  }

  const idFilter = arg("ids")
    ?.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  const apply = flag("apply");
  const allDrafts = flag("all-drafts");

  const drafts = await collectDrafts(since);
  const targets = idFilter ? drafts.filter((d) => idFilter.includes(d.id)) : drafts;

  console.log(`\nsince ${since.toISOString().slice(0, 10)} — ${targets.length} draft(s):`);
  for (const d of targets) {
    console.log(`  ${d.date} | ${d.type} | ${d.id} | ${d.client?.name ?? "-"} | ${d.total}`);
  }

  if (idFilter) {
    const missing = idFilter.filter((id) => !targets.some((t) => t.id === id));
    if (missing.length > 0) {
      // Either already gone, outside --since, or no longer a draft — the last
      // case matters most, so say so instead of silently skipping.
      console.log(`\nnot found as drafts in this window (skipped): ${missing.join(", ")}`);
    }
  }

  if (!apply) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply (plus --ids=... or --all-drafts).");
    return;
  }
  if (!idFilter && !allDrafts) {
    console.log("\n--apply needs either --ids=<id,id,...> or --all-drafts. Nothing deleted.");
    process.exitCode = 1;
    return;
  }

  let deleted = 0;
  for (const d of targets) {
    try {
      await deleteDraftDocument(d.id, asDocumentType(d.type));
      deleted++;
      console.log(`deleted ${d.id} (${d.client?.name ?? "-"}, ${d.total})`);
    } catch (err) {
      console.error(`FAILED ${d.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\ndeleted ${deleted}/${targets.length}`);
}

void main();
