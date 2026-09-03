import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVE_MIN_MONTH,
  archiveFileName,
  archiveFolderSegments,
  archiveMonth,
  shouldArchiveInvoiceToDrive,
} from "./invoice-drive-archive.service.js";
import { canonicalFolder } from "../../lib/google-drive/drive.service.js";

const AUG = new Date("2026-08-14T09:30:00.000Z");

test("paid documents from August 2026 onwards are archived, in every country", () => {
  for (const cc of ["ie", "cz", "es", "ro", "br", "pt"]) {
    assert.deepEqual(archiveFolderSegments(cc, AUG), [cc.toUpperCase(), "2026-08"]);
  }
  assert.equal(shouldArchiveInvoiceToDrive("RECEIPT", AUG), true);
  assert.equal(shouldArchiveInvoiceToDrive("INVOICE_RECEIPT", AUG), true);
});

test("unpaid invoices and credit notes are never archived", () => {
  assert.equal(shouldArchiveInvoiceToDrive("INVOICE", AUG), false);
  assert.equal(shouldArchiveInvoiceToDrive("CREDIT_NOTE", AUG), false);
});

test("nothing before the archive's first month is filed", () => {
  assert.equal(ARCHIVE_MIN_MONTH, "2026-08");
  assert.equal(shouldArchiveInvoiceToDrive("RECEIPT", new Date("2026-07-31T23:59:59.000Z")), false);
  assert.equal(shouldArchiveInvoiceToDrive("RECEIPT", new Date("2026-08-01T00:00:00.000Z")), true);
});

test("the month folder is UTC, so a late-evening payment cannot straddle two months", () => {
  assert.equal(archiveMonth(new Date("2026-08-31T23:40:00.000Z")), "2026-08");
  assert.equal(archiveMonth(new Date("2026-09-01T00:10:00.000Z")), "2026-09");
});

test("filenames sort by date and flatten characters Drive treats as paths", () => {
  assert.equal(archiveFileName("IE-00042", AUG), "2026-08-14_IE-00042.pdf");
  // Portugal's InvoiceExpress numbers carry a slash.
  assert.equal(archiveFileName("202/Globalhealth", AUG), "2026-08-14_202-Globalhealth.pdf");
});

test("a raced duplicate folder resolves to the same id on every worker", () => {
  const files = [
    { id: "zzz", name: "2026-08", createdTime: "2026-08-01T10:00:00.000Z" },
    { id: "aaa", name: "2026-08", createdTime: "2026-08-01T10:00:01.000Z" },
  ];
  assert.equal(canonicalFolder(files).id, "zzz");
  assert.equal(canonicalFolder([...files].reverse()).id, "zzz");
  // Identical timestamps fall back to the id so the choice stays deterministic.
  const tied = files.map((f) => ({ ...f, createdTime: "2026-08-01T10:00:00.000Z" }));
  assert.equal(canonicalFolder(tied).id, "aaa");
});
