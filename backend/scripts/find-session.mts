/**
 * READ-ONLY: find which order(s) a given Stripe Checkout Session id belongs to,
 * matching against both stripeSessionId and the cached stripeCheckoutUrl.
 *
 * Usage (from backend/):  npx tsx scripts/find-session.mts cs_test_abc cs_live_def
 */

import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Pass one or more cs_… session ids.");
  process.exit(1);
}

for (const id of ids) {
  const hits = await prisma.order.findMany({
    where: {
      OR: [
        { stripeSessionId: id },
        { stripeSessionId: { contains: id.slice(0, 30) } },
        { stripeCheckoutUrl: { contains: id.slice(0, 30) } },
      ],
    },
    select: {
      orderNumber: true,
      id: true,
      countryCode: true,
      paymentStatus: true,
      stripeSessionId: true,
      stripeCheckoutUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`\n${id.slice(0, 24)}…  (${id.startsWith("cs_test_") ? "TEST" : "live"})`);
  if (!hits.length) {
    console.log("  no order references this session — it was never persisted");
    continue;
  }
  for (const o of hits) {
    const isCurrent = o.stripeSessionId === id;
    console.log(
      `  ${o.orderNumber ?? o.id}  cc=${o.countryCode}  ${o.paymentStatus}` +
        `  updated ${o.updatedAt.toISOString().slice(0, 19)}` +
        `  ${isCurrent ? "<- current stripeSessionId" : "(only in cached URL)"}`,
    );
    console.log(`      stored session: ${o.stripeSessionId?.slice(0, 24) ?? "-"}…`);
    console.log(
      `      cached url sess: ${o.stripeCheckoutUrl?.match(/cs_(test|live)_[A-Za-z0-9]+/)?.[0]?.slice(0, 24) ?? "-"}…`,
    );
  }
}

await prisma.$disconnect();
