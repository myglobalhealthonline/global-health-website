/** READ-ONLY: anything created in this DB in the last 24h + recent webhook receipts. */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
console.log(`since ${since.toISOString()}\n`);

const orders = await prisma.order.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: "desc" },
  select: {
    orderNumber: true, id: true, createdAt: true, countryCode: true, email: true,
    status: true, paymentStatus: true, totalCents: true, currencyCode: true,
    stripeSessionId: true, paidAt: true,
  },
});
console.log(`orders created in last 24h: ${orders.length}`);
for (const o of orders) {
  console.log(
    `  ${(o.orderNumber ?? o.id).padEnd(12)} ${o.createdAt.toISOString()} ${o.countryCode} ` +
      `${o.status}/${o.paymentStatus} ${(o.totalCents / 100).toFixed(2)} ${o.currencyCode} ` +
      `${o.email?.replace(/(.{3}).*@/, "$1***@")} sess=${o.stripeSessionId?.slice(0, 12) ?? "NONE"}`,
  );
}

const appts = await prisma.appointment.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: "desc" },
  select: { id: true, createdAt: true, scheduledAt: true, status: true, paymentStatus: true },
});
console.log(`\nappointments created in last 24h: ${appts.length}`);
for (const a of appts) {
  console.log(`  ${a.createdAt.toISOString()} sched=${a.scheduledAt?.toISOString() ?? "-"} ${a.status}/${a.paymentStatus}`);
}

const evts = await prisma.processedWebhookEvent.findMany({
  orderBy: { createdAt: "desc" },
  take: 15,
  select: { stripeEventId: true, eventType: true, createdAt: true },
});
console.log(`\nlast ${evts.length} processed webhook events:`);
for (const e of evts) {
  console.log(`  ${e.createdAt.toISOString()}  ${e.eventType.padEnd(34)} ${e.stripeEventId}`);
}

const pays = await prisma.payment.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: "desc" },
  select: { createdAt: true, stripeEventId: true, status: true, stripeSessionId: true },
});
console.log(`\npayment rows in last 24h: ${pays.length}`);
for (const p of pays) {
  console.log(`  ${p.createdAt.toISOString()} ${p.status} ${p.stripeSessionId?.slice(0, 14) ?? "-"} ${p.stripeEventId}`);
}

await prisma.$disconnect();
