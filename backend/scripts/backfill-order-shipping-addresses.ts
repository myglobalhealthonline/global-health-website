/* eslint-disable no-console */
/**
 * Backfill: promote historical order shipping addresses onto patient charts.
 *
 * Every paid product order collected an address at checkout and wrote it to
 * `Order.ship*` only — nothing ever copied it to `PatientProfile`, so those
 * patients read as address-less everywhere a clinician or an admin looks
 * (ORD-000490 is the report that surfaced it). New orders are handled at
 * payment time by `saveOrderShippingAddressToProfile`; this catches the ones
 * already paid.
 *
 * Fill-only and idempotent — a chart that already carries an address is left
 * exactly as it is, so re-running this is a no-op.
 *
 *   npx tsx scripts/backfill-order-shipping-addresses.ts            # dry run
 *   npx tsx scripts/backfill-order-shipping-addresses.ts --apply    # write
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { saveOrderShippingAddressToProfile } from "../src/modules/orders/order-shipping-profile.service.js";

const APPLY = process.argv.includes("--apply");

(async () => {
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ paymentStatus: "PAID" }, { status: "PAID" }],
      shipLine1: { not: null },
      shipCity: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      fullName: true,
      phone: true,
      userId: true,
      shipName: true,
      shipLine1: true,
      shipLine2: true,
      shipCity: true,
      shipPostalCode: true,
      shipCountryCode: true,
      paidAt: true,
    },
    // Oldest first: when one patient has several orders, the address the chart
    // ends up with is the earliest one, and every later run is a no-op. Picking
    // the newest instead would mean the result depended on run order.
    orderBy: { paidAt: "asc" },
  });

  const tally: Record<string, number> = {};
  for (const order of orders) {
    if (!APPLY) {
      const profile = await prisma.patientProfile.findUnique({
        where: { email: order.email.trim().toLowerCase() },
        select: { addressLine1: true, addressCity: true },
      });
      const wouldWrite = !profile?.addressLine1?.trim() && !profile?.addressCity?.trim();
      const outcome = wouldWrite ? (profile ? "would-fill" : "would-create") : "already-addressed";
      tally[outcome] = (tally[outcome] ?? 0) + 1;
      if (wouldWrite) {
        console.log(`${order.orderNumber ?? order.id}  ${order.email}  ${order.shipLine1}, ${order.shipCity}`);
      }
      continue;
    }
    const outcome = await saveOrderShippingAddressToProfile(prisma, order);
    tally[outcome] = (tally[outcome] ?? 0) + 1;
    if (outcome === "filled" || outcome === "created") {
      console.log(`${outcome}  ${order.orderNumber ?? order.id}  ${order.email}`);
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${orders.length} paid orders with an address`);
  for (const [outcome, count] of Object.entries(tally).sort()) {
    console.log(`  ${outcome}: ${count}`);
  }
  if (!APPLY) console.log("\nRe-run with --apply to write.");
  await prisma.$disconnect();
})();
