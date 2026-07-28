/**
 * One-time: backfill the commission snapshot onto orders placed in a commission
 * market BEFORE the commission billing model shipped.
 *
 * Those orders carry `doctorPayoutCents = NULL` / `commissionCents = NULL`, so
 * their fiscal documents fall back to full-price rendering — the deliberate
 * "don't invent a number" fallback in buildInvoicePdfData. This script computes
 * the snapshot from the payout configured TODAY and writes it, so the documents
 * re-render as commission.
 *
 * ⚠️ This CHANGES WHAT AN ALREADY-ISSUED DOCUMENT SAYS. Only run it for a market
 * that has not genuinely gone live — which is why it refuses to touch anything
 * outside `Country.commissionReceiptEnabled` markets, and prints a diff before
 * writing.
 *
 * Idempotent: rows already carrying a snapshot are skipped, so a re-run is a
 * no-op. Dry by default.
 *
 *   node --import tsx scripts/backfill-commission-snapshots.ts          # dry run
 *   node --import tsx scripts/backfill-commission-snapshots.ts --apply  # write
 *   node --import tsx scripts/backfill-commission-snapshots.ts --apply --country br
 */
import { config as loadEnv } from "dotenv";
import { join } from "node:path";

// dotenv, not node's --env-file: this .env carries quoted values that --env-file
// mis-parses (PHI_ENCRYPTION_KEY / BRAZIL_CONSENT_LINK_SECRET come out too short
// and config/env.ts rejects them at import). Same loader test-guard.ts uses.
loadEnv({ path: join(__dirname, "..", ".env") });

// Dynamic imports below: `src/db/prisma.js` reads config/env.ts at module load,
// so a static import would hoist above the loadEnv() call and blow up.
const APPLY = process.argv.includes("--apply");
const countryArgIndex = process.argv.indexOf("--country");
const COUNTRY = countryArgIndex > -1 ? process.argv[countryArgIndex + 1]?.toLowerCase() : null;

function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

async function main(): Promise<void> {
  const { prisma } = await import("../src/db/prisma.js");
  const { computeOrderCommission } = await import(
    "../src/modules/orders/commission.service.js"
  );

  const commissionCountries = await prisma.country.findMany({
    where: { commissionReceiptEnabled: true },
    select: { code: true, name: true },
  });
  if (commissionCountries.length === 0) {
    console.log("No country has commissionReceiptEnabled — nothing to do.");
    return;
  }

  const codes = commissionCountries
    .map((c) => c.code.toLowerCase())
    .filter((c) => !COUNTRY || c === COUNTRY);
  if (codes.length === 0) {
    console.log(`--country ${COUNTRY} is not a commission market. Refusing.`);
    return;
  }
  console.log(`Commission markets: ${codes.join(", ")}${APPLY ? "" : "   (DRY RUN)"}\n`);

  const orders = await prisma.order.findMany({
    where: {
      countryCode: { in: codes, mode: "insensitive" },
      // Only orders that actually produced a document. An unpaid/cancelled order
      // has nothing to correct.
      paymentStatus: "PAID",
      commissionTotalCents: null,
    },
    select: {
      id: true,
      countryCode: true,
      currencyCode: true,
      totalCents: true,
      shippingCents: true,
      items: {
        select: {
          id: true,
          name: true,
          serviceId: true,
          doctorId: true,
          insuranceCompanyId: true,
          quantity: true,
          unitPriceCents: true,
        },
      },
      invoices: { select: { invoiceNumber: true }, take: 5 },
    },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) {
    console.log("No un-snapshotted paid orders found. Nothing to do.");
    return;
  }

  let written = 0;
  let skipped = 0;

  for (const order of orders) {
    const commission = await computeOrderCommission(
      order.items.map((i) => ({
        id: i.id,
        serviceId: i.serviceId,
        doctorId: i.doctorId,
        insuranceCompanyId: i.insuranceCompanyId,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
      })),
      order.shippingCents,
      { orderId: order.id, countryCode: order.countryCode },
    );

    const byItem = new Map(commission.lines.map((l) => [l.id as string, l]));
    const label = order.invoices.map((i) => i.invoiceNumber).join(", ") || order.id;

    // A payout that resolves to null on EVERY doctor line means the config is
    // missing, and writing "commission = full price" would be worse than leaving
    // the order alone — it would assert we keep 100% of a doctor's fee.
    const doctorLines = order.items.filter((i) => i.serviceId && i.doctorId);
    const resolved = doctorLines.filter((i) => byItem.get(i.id)?.doctorPayoutCents != null);
    if (doctorLines.length > 0 && resolved.length === 0) {
      console.log(
        `SKIP ${label} — no payout configured for any doctor line; set the payout first.`,
      );
      skipped += 1;
      continue;
    }

    console.log(
      `${APPLY ? "WRITE" : "would write"} ${label}: ` +
        `charged ${money(order.totalCents, order.currencyCode)} → ` +
        `commission ${money(commission.commissionTotalCents, order.currencyCode)} ` +
        `(doctor ${money(commission.doctorPayoutTotalCents, order.currencyCode)})`,
    );
    for (const item of order.items) {
      const line = byItem.get(item.id);
      console.log(
        `        ${item.name}: payout ${
          line?.doctorPayoutCents == null ? "—" : money(line.doctorPayoutCents, order.currencyCode)
        }, commission ${money(line?.commissionCents ?? 0, order.currencyCode)}`,
      );
    }

    if (!APPLY) continue;

    // One transaction per order so a failure can't leave the rollup and the
    // lines disagreeing.
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const line = byItem.get(item.id);
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            doctorPayoutCents: line?.doctorPayoutCents ?? null,
            commissionCents: line?.commissionCents ?? null,
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          commissionTotalCents: commission.commissionTotalCents,
          doctorPayoutTotalCents: commission.doctorPayoutTotalCents,
        },
      });
    });
    written += 1;
  }

  console.log(
    `\n${APPLY ? `Done — ${written} order(s) updated` : `Dry run — ${orders.length - skipped} order(s) would be updated`}` +
      `${skipped ? `, ${skipped} skipped` : ""}.`,
  );
  if (!APPLY) console.log("Re-run with --apply to write.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
