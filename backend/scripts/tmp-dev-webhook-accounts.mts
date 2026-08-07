/** READ-ONLY: which Stripe accounts have ever delivered webhooks to THIS db. */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const evts = await prisma.processedWebhookEvent.findMany({
  orderBy: { createdAt: "desc" },
  select: { stripeEventId: true, eventType: true, createdAt: true },
});
console.log(`total processed webhook events: ${evts.length}`);

// Stripe event ids carry an account-specific suffix; group by it.
const byAcct = new Map<string, { n: number; last: Date; types: Set<string> }>();
for (const e of evts) {
  const m = e.stripeEventId.match(/^evt_[0-9A-Za-z]{4}([0-9A-Za-z]{10})/);
  const acct = m ? m[1]! : e.stripeEventId.startsWith("sync_") ? "(manual sync)" : "(other)";
  const cur = byAcct.get(acct) ?? { n: 0, last: e.createdAt, types: new Set<string>() };
  cur.n++;
  if (e.createdAt > cur.last) cur.last = e.createdAt;
  cur.types.add(e.eventType);
  byAcct.set(acct, cur);
}
console.log("\naccount-suffix        count  last seen                 types");
for (const [acct, v] of [...byAcct.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${acct.padEnd(20)} ${String(v.n).padStart(4)}  ${v.last.toISOString()}  ${[...v.types].join(", ")}`);
}

console.log("\nPT-account events (suffix DxeMbzFks7):");
const pt = evts.filter((e) => e.stripeEventId.includes("DxeMbzFks7"));
console.log(pt.length ? pt.map((e) => `  ${e.createdAt.toISOString()} ${e.eventType}`).join("\n") : "  NONE EVER");

console.log("\norders on this db with a cs_test_ session and still unpaid:");
const stuck = await prisma.order.findMany({
  where: { stripeSessionId: { startsWith: "cs_test_" }, paymentStatus: { not: "PAID" } },
  orderBy: { createdAt: "desc" },
  take: 10,
  select: { orderNumber: true, createdAt: true, countryCode: true, status: true, paymentStatus: true, totalCents: true },
});
for (const o of stuck) {
  console.log(
    `  ${o.orderNumber}  ${o.createdAt.toISOString()}  ${o.countryCode}  ${o.status}/${o.paymentStatus}  ${(o.totalCents / 100).toFixed(2)}`,
  );
}
await prisma.$disconnect();
