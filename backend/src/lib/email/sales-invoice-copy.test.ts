import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldCopyInvoiceToSales } from "./sales-invoice-copy.js";

test("paid documents outside PT/CZ are copied to the accounting inbox", () => {
  for (const cc of ["ie", "es", "ro", "br"]) {
    assert.equal(shouldCopyInvoiceToSales(cc, "INVOICE_RECEIPT"), true, cc);
    assert.equal(shouldCopyInvoiceToSales(cc, "RECEIPT"), true, cc);
  }
});

test("Portugal and Czechia are excluded", () => {
  for (const cc of ["pt", "cz", "PT", "CZ", " pt "]) {
    assert.equal(shouldCopyInvoiceToSales(cc, "INVOICE_RECEIPT"), false, cc);
    assert.equal(shouldCopyInvoiceToSales(cc, "RECEIPT"), false, cc);
  }
});

test("unpaid invoices and credit notes are never copied", () => {
  assert.equal(shouldCopyInvoiceToSales("ie", "INVOICE"), false);
  assert.equal(shouldCopyInvoiceToSales("ie", "CREDIT_NOTE"), false);
});
