import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { generateInvoiceForOrder } from "../src/modules/invoices/generate-invoice.service.js";

/**
 * One-off CREATE-ONLY invoice backfill for a paid order whose invoice was
 * missed (e.g. issued before auto-invoicing was wired). The invoice row is
 * created so it appears in Admin → Invoices, but it is NOT emailed — an admin
 * sends it with the existing "Resend". Idempotent: a no-op if the order already
 * has an invoice/receipt.
 *
 * Portugal is invoiced via InvoiceExpress, not this path — this script covers
 * non-PT countries with an invoice prefix (e.g. Ireland).
 *
 *   Find a patient's order id:
 *     node --import tsx --env-file=.env scripts/backfill-invoice.ts --find "Natália"
 *   Backfill (create-only):
 *     node --import tsx --env-file=.env scripts/backfill-invoice.ts <orderId>
 */

const log = {
  info: (o: unknown, m?: string) => console.log(m ?? "", o),
  warn: (o: unknown, m?: string) => console.warn(m ?? "", o),
  error: (o: unknown, m?: string) => console.error(m ?? "", o),
};

async function findByName(term: string): Promise<void> {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      invoices: { select: { invoiceNumber: true, documentType: true } },
    },
  });
  if (orders.length === 0) {
    console.log(`No orders match "${term}".`);
    return;
  }
  for (const o of orders) {
    console.log(
      `${o.id}  ${o.fullName}  <${o.email}>  ${o.countryCode}  pay=${o.paymentStatus}/${o.status}  invoices=[${o.invoices
        .map((i) => `${i.documentType}:${i.invoiceNumber}`)
        .join(", ")}]  ${o.createdAt.toISOString().slice(0, 10)}`,
    );
  }
}

async function backfill(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
      paymentStatus: true,
      status: true,
      invoices: { select: { invoiceNumber: true, documentType: true } },
    },
  });
  if (!order) {
    console.error(`Order not found: ${orderId}`);
    process.exitCode = 1;
    return;
  }
  console.log("Order:", order.id, order.fullName, order.countryCode, `pay=${order.paymentStatus}/${order.status}`);
  console.log("Invoices before:", order.invoices);
  if (order.paymentStatus !== "PAID" && order.status !== "PAID") {
    console.warn("⚠ Order is not PAID — refusing to invoice an unpaid order.");
    process.exitCode = 1;
    return;
  }
  if (order.countryCode.toLowerCase() === "pt") {
    console.warn("⚠ Portugal is invoiced via InvoiceExpress, not this script.");
    process.exitCode = 1;
    return;
  }

  await generateInvoiceForOrder(orderId, log, { skipEmail: true });

  const after = await prisma.order.findUnique({
    where: { id: orderId },
    select: { invoices: { select: { invoiceNumber: true, documentType: true, emailSentAt: true } } },
  });
  console.log("Invoices after:", after?.invoices);
  console.log("Done. The invoice is in Admin → Invoices (unsent). Send it with Resend.");
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: backfill-invoice <orderId>   |   backfill-invoice --find "<name/email>"');
    process.exitCode = 1;
    return;
  }
  if (arg === "--find") {
    const term = process.argv[3];
    if (!term) {
      console.error('Provide a search term: --find "Natália"');
      process.exitCode = 1;
      return;
    }
    await findByName(term);
    return;
  }
  await backfill(arg);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
