/**
 * READ-ONLY: list recent orders with the test/live mode of their stored Stripe
 * session, to tell whether a sandbox pay link is systemic (a market whose
 * deployed key is still sk_test_) or a one-off (something re-minted the
 * session from a test-keyed process).
 *
 * Usage (from backend/):  npx tsx scripts/scan-order-sessions.mts [limit]
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const limit = Number(process.argv[2] ?? 30);

const orders = await prisma.order.findMany({
  orderBy: { createdAt: "desc" },
  take: limit,
  select: {
    orderNumber: true,
    id: true,
    countryCode: true,
    paymentStatus: true,
    createdAt: true,
    updatedAt: true,
    stripeSessionId: true,
    stripeCheckoutUrl: true,
  },
});

function mode(s?: string | null): string {
  if (!s) return "—";
  if (s.startsWith("cs_test_")) return "TEST";
  if (s.startsWith("cs_live_")) return "live";
  return "?";
}

let test = 0;
console.log(
  `\n${"order".padEnd(13)} ${"cc".padEnd(3)} ${"pay".padEnd(9)} ${"session".padEnd(5)} ${"url".padEnd(5)} created            updated`,
);
for (const o of orders) {
  const sm = mode(o.stripeSessionId);
  const um = o.stripeCheckoutUrl
    ? o.stripeCheckoutUrl.includes("cs_test_")
      ? "TEST"
      : "live"
    : "—";
  if (sm === "TEST" || um === "TEST") test++;
  console.log(
    `${(o.orderNumber ?? o.id.slice(0, 12)).padEnd(13)} ${o.countryCode.padEnd(3)} ` +
      `${o.paymentStatus.padEnd(9)} ${sm.padEnd(5)} ${um.padEnd(5)} ` +
      `${o.createdAt.toISOString().slice(0, 16)}   ${o.updatedAt.toISOString().slice(0, 16)}`,
  );
}
console.log(`\n${test} of ${orders.length} carry a TEST session or URL.`);

await prisma.$disconnect();
