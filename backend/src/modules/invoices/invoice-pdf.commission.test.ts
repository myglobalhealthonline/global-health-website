import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCommissionLines, buildInvoiceHtml, type InvoicePdfData } from "./invoice-pdf.js";

/**
 * Commission-mode rendering of the fiscal document (Brazil).
 *
 * `buildInvoiceHtml` is pure — no DB, no Chromium — so the document's actual
 * output is asserted directly rather than through a PDF render.
 *
 * The collapse to a single commission line happens in `buildInvoicePdfData`; by
 * the time the renderer sees the data, `items` and the money fields already hold
 * the commission. These tests therefore feed it both shapes and check the
 * rendered document, which is what the patient receives.
 */

const BASE_ORDER: InvoicePdfData["order"] = {
  fullName: "Ana Souza",
  email: "ana@example.com",
  phone: null,
  currencyCode: "BRL",
  totalCents: 20000,
  subtotalCents: 20000,
  shippingCents: 0,
  paidAt: "2026-07-20T10:00:00.000Z",
  taxIdNumber: null,
  consultationDate: null,
  items: [
    { name: "Consulta Geral", quantity: 1, unitPriceCents: 20000, lineTotalCents: 20000 },
  ],
};

function standardDoc(over: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    invoiceNumber: "BR-00001",
    invoiceDate: "2026-07-20T10:00:00.000Z",
    countryCode: "br",
    documentType: "INVOICE_RECEIPT",
    order: BASE_ORDER,
    doctor: { fullName: "Dr. Carlos Lima", registrationNumber: "CRM-1234", chamberEntity: "CRM" },
    ...over,
  };
}

/** What buildInvoicePdfData produces for a commission market: one line per
 *  service naming it, money fields restated to the commission
 *  (200.00 charged − 140.00 payout = 60.00). */
function commissionDoc(over: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return standardDoc({
    commissionMode: true,
    order: {
      ...BASE_ORDER,
      totalCents: 6000,
      subtotalCents: 6000,
      shippingCents: 0,
      items: [
        {
          name: "Consulta Geral — Comissão Global Health",
          quantity: 1,
          unitPriceCents: 6000,
          lineTotalCents: 6000,
        },
      ],
    },
    ...over,
  });
}

describe("invoice-pdf commission mode", () => {
  it("bills the commission, not the amount charged", () => {
    const html = buildInvoiceHtml(commissionDoc());
    assert.match(html, /Comissão Global Health/);
    // R$ 60,00 in pt-BR; the exact space is a non-breaking/narrow-nbsp from Intl,
    // so match on the digits rather than the whole formatted string.
    assert.match(html, /60,00/);
    assert.doesNotMatch(html, /200,00/, "the full price must not appear anywhere");
  });

  it("names the service on the commission line", () => {
    // "Comissão Global Health" alone doesn't tell the patient which consultation
    // the amount relates to.
    const html = buildInvoiceHtml(commissionDoc());
    assert.match(html, /Consulta Geral — Comissão Global Health/);
  });

  it("explains the intermediation so the smaller total is legible", () => {
    const html = buildInvoiceHtml(commissionDoc());
    assert.match(html, /atua como intermediária/);
    assert.match(html, /honorários médicos/i);
  });

  it("swaps the legal footer away from the Irish VAT text", () => {
    const commission = buildInvoiceHtml(commissionDoc());
    const standard = buildInvoiceHtml(standardDoc());
    assert.match(standard, /Imposto sobre o Valor Agregado de 2010/);
    assert.doesNotMatch(
      commission,
      /Imposto sobre o Valor Agregado de 2010/,
      "the standard BR footer describes VAT on a consultation price, not a commission",
    );
    assert.match(commission, /Intermediação/);
  });

  it("still names the treating doctor", () => {
    // The patient needs to know whose consultation the commission relates to,
    // and who owes them the separate fee document.
    const html = buildInvoiceHtml(commissionDoc());
    assert.match(html, /Dr\. Carlos Lima/);
  });

  it("credits the commission on a credit note, not the amount charged", () => {
    const html = buildInvoiceHtml(
      commissionDoc({ documentType: "CREDIT_NOTE", creditNoteReason: "REFUND" }),
    );
    assert.match(html, /Nota de crédito/);
    assert.match(html, /Total reembolsado/);
    assert.match(html, /60,00/);
    assert.doesNotMatch(html, /200,00/);
  });

  it("shows the commission as the amount due on an unpaid document", () => {
    const html = buildInvoiceHtml(commissionDoc({ documentType: "INVOICE" }));
    assert.match(html, /NÃO PAGO/);
    assert.doesNotMatch(html, /200,00/);
  });

  it("falls back to English copy for a market with no localised commission text", () => {
    // A country can be switched into commission billing from the admin UI before
    // anyone writes its copy; the document must not render `undefined`.
    const html = buildInvoiceHtml(commissionDoc({ countryCode: "ie" }));
    assert.match(html, /Global Health commission|acts as an intermediary/);
    assert.doesNotMatch(html, /undefined/);
  });
});

describe("buildCommissionLines", () => {
  const L = { commissionLine: "Comissão Global Health" };

  it("emits one named line per service", () => {
    const lines = buildCommissionLines(
      [
        { name: "Renovação de Receita", commissionCents: 5000 },
        { name: "Consulta Clínica Online", commissionCents: 10000 },
      ],
      15000,
      0,
      L,
    );
    assert.deepEqual(
      lines.map((l) => l.name),
      [
        "Renovação de Receita — Comissão Global Health",
        "Consulta Clínica Online — Comissão Global Health",
      ],
    );
    assert.equal(
      lines.reduce((s, l) => s + l.lineTotalCents, 0),
      15000,
    );
  });

  it("omits lines whose commission is zero", () => {
    const lines = buildCommissionLines(
      [
        { name: "Paid line", commissionCents: 5000 },
        { name: "Fully credited line", commissionCents: 0 },
      ],
      5000,
      0,
      L,
    );
    assert.equal(lines.length, 1);
    assert.match(lines[0].name, /Paid line/);
  });

  it("excludes shipping — the totals block renders it as its own row", () => {
    // Otherwise shipping is counted twice: once in an item line, once as the
    // shipping row, and the document stops adding up.
    const lines = buildCommissionLines(
      [{ name: "Kit", commissionCents: 3000 }],
      3500,
      500,
      L,
    );
    assert.equal(
      lines.reduce((s, l) => s + l.lineTotalCents, 0),
      3000,
      "shipping's 500 must not appear in the item lines",
    );
  });

  it("falls back to one generic line when no per-item snapshot exists", () => {
    // A backfilled order rollup whose lines were never populated.
    const lines = buildCommissionLines(
      [{ name: "Legacy line", commissionCents: null }],
      5000,
      0,
      L,
    );
    assert.deepEqual(lines, [
      {
        name: "Comissão Global Health",
        quantity: 1,
        unitPriceCents: 5000,
        lineTotalCents: 5000,
      },
    ]);
  });

  it("emits nothing when the entire commission is shipping", () => {
    const lines = buildCommissionLines([{ name: "Kit", commissionCents: null }], 500, 500, L);
    assert.deepEqual(lines, []);
  });
});

describe("invoice-pdf standard mode is unchanged", () => {
  // Regression guard: this is what proves IE/CZ/ES/RO/PT are untouched by the
  // commission work. Any drift here means a non-commission market's fiscal
  // document changed, which is never intended.
  it("renders the real basket at full price", () => {
    const html = buildInvoiceHtml(standardDoc());
    assert.match(html, /Consulta Geral/);
    assert.match(html, /200,00/);
    assert.doesNotMatch(html, /Comissão Global Health/);
    assert.doesNotMatch(html, /atua como intermediária/);
  });

  it("is byte-identical whether commissionMode is absent or explicitly false", () => {
    assert.equal(
      buildInvoiceHtml(standardDoc()),
      buildInvoiceHtml(standardDoc({ commissionMode: false })),
    );
  });

  it("keeps rendering shipping as its own row", () => {
    const html = buildInvoiceHtml(
      standardDoc({ order: { ...BASE_ORDER, shippingCents: 500, totalCents: 20500 } }),
    );
    assert.match(html, /Frete/);
    assert.match(html, /5,00/);
  });
});
