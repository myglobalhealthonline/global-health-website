import { prisma } from "../../db/prisma.js";
import { isStripeLiveMode } from "../../lib/stripe/client.js";
import {
  isInvoiceExpressConfigured,
  createInvoiceReceipt,
  finalizeInvoice,
  emailInvoiceReceipt,
  type IeInvoiceItem,
} from "../../lib/invoice-express/client.js";
// NOTE (2026-08-25): this issuer is the ONLY thing that may issue a PT fiscal
// document. The native Stripe→InvoiceExpress connector must stay disabled on
// the PT account — while it was on and this issuer was broken, every paid PT
// order produced a connector-issued "Consumidor final" Fatura-Recibo AND an
// orphan draft from here. With both live, each order would get two settled
// legal documents and need a credit note to unwind.
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import { mirrorPortugalInvoiceDocument } from "./pt-invoice-mirror.service.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** InvoiceExpress fallback NIF for a missing/invalid (non 9-digit) fiscal id. */
const FALLBACK_NIF = "999999990";

/** dd/mm/yyyy — the date format InvoiceExpress expects. */
export function formatIeDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Portuguese NIF is 9 digits; anything else → the InvoiceExpress fallback. */
export function resolveFiscalId(taxIdNumber: string | null | undefined): string {
  const nif = (taxIdNumber ?? "").replace(/\s+/g, "");
  return /^\d{9}$/.test(nif) ? nif : FALLBACK_NIF;
}

/**
 * Portugal only: issue the legal InvoiceReceipt through the InvoiceExpress REST
 * API when a PT order is paid, then email it to the patient.
 *
 * Three calls: create draft → finalize → email (see lib/invoice-express/client.ts).
 *
 * Guards (any → silent no-op):
 *   - order missing / not Portugal
 *   - InvoiceExpress not configured (api key + account subdomain)
 *   - the PT Stripe account is NOT on a live key (sandbox/test → never issue a
 *     real legal invoice) — this is the "real Stripe account only" requirement
 *   - the order already has an invoiceExpressId (idempotent against webhook
 *     redelivery + the sync-order fallback, which both reach this via
 *     ensureOrderPaidAutomations)
 *
 * Never throws — failures log + ops-alert so the paid order is never blocked.
 * Fire-and-forget from ensureOrderPaidAutomations.
 */
export async function issuePortugalInvoiceExpress(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<void> {
  try {
    // Cheap, DB-free guards first so a deployment with the feature off (no
    // InvoiceExpress config) or on a sandbox PT key never even reads the order.
    if (!isInvoiceExpressConfigured()) {
      log.info({ orderId }, "InvoiceExpress not configured — skipping PT invoice");
      return;
    }
    // Real Stripe account only — a sandbox (sk_test_) PT key must never issue a
    // real legal invoice to the tax authority.
    if (!isStripeLiveMode("pt")) {
      log.info({ orderId }, "PT Stripe account is not live (sk_test_) — skipping InvoiceExpress");
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        email: true,
        fullName: true,
        countryCode: true,
        invoiceExpressId: true,
        shipLine1: true,
        shipCity: true,
        shipPostalCode: true,
        items: { select: { name: true, quantity: true, lineTotalCents: true } },
      },
    });

    if (!order) {
      log.warn({ orderId }, "issuePortugalInvoiceExpress: order not found");
      return;
    }
    if (order.countryCode.toLowerCase() !== "pt") return;
    if (order.invoiceExpressId) {
      log.info({ orderId, invoiceExpressId: order.invoiceExpressId }, "PT invoice already issued — skipping");
      return;
    }

    const profile = await prisma.patientProfile.findUnique({
      where: { email: order.email.toLowerCase() },
      select: {
        taxIdNumber: true,
        addressLine1: true,
        addressCity: true,
        addressPostalCode: true,
      },
    });

    const items: IeInvoiceItem[] = order.items.map((i) => ({
      name: i.name,
      description: "-",
      unit_price: i.lineTotalCents / 100,
      quantity: i.quantity,
      tax: { name: "Isento" },
    }));
    if (items.length === 0) {
      log.warn({ orderId }, "PT order has no items — skipping InvoiceExpress");
      return;
    }

    const today = new Date();
    const payload = {
      date: formatIeDate(today),
      due_date: formatIeDate(today),
      tax_exemption: "M07",
      client: {
        name: order.fullName,
        // Stable client key so InvoiceExpress de-dupes the patient's client
        // record across repeat orders.
        code: order.userId ?? order.email,
        fiscal_id: resolveFiscalId(profile?.taxIdNumber),
        address: order.shipLine1 ?? profile?.addressLine1 ?? "-",
        postal_code: order.shipPostalCode ?? profile?.addressPostalCode ?? "0000-000",
        city: order.shipCity ?? profile?.addressCity ?? "-",
      },
      items,
    };

    const { id, type } = await createInvoiceReceipt(payload);
    await finalizeInvoice(id, type);

    // Persist BEFORE emailing: an email failure must not cause a re-issue on the
    // next webhook redelivery. Stamp the id even if the email later fails.
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceExpressId: String(id) },
    });
    log.info({ orderId, invoiceExpressId: id }, "PT InvoiceExpress invoice issued");

    try {
      await emailInvoiceReceipt(id, type, {
        email: order.email,
        subject: "Your Receipt from Global Health",
        body: `Dear ${order.fullName},\n\nPlease find your receipt attached.\n\nKind regards,\nGlobal Health`,
      });
      log.info({ orderId, invoiceExpressId: id }, "PT InvoiceExpress receipt emailed");
    } catch (emailErr) {
      log.warn({ err: emailErr, orderId, invoiceExpressId: id }, "PT InvoiceExpress email failed — invoice still issued");
    }

    // Copy the issued document into our own storage + an `invoices` row so the
    // patient portal can list and download it and an admin can resend it.
    // Awaited rather than fired off: this whole function already runs
    // fire-and-forget off the paid-order path, and the mirror swallows its own
    // failures, so awaiting costs nothing and keeps the ordering legible.
    await mirrorPortugalInvoiceDocument(orderId, id, type, log);
  } catch (err) {
    log.warn({ err, orderId }, "PT InvoiceExpress issue failed — order still paid");
    await emitOpsAlert({
      severity: "critical",
      title: "PT InvoiceExpress issue failed",
      detail: err instanceof Error ? err.message : String(err),
      context: { orderId },
    });
  }
}
