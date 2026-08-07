/**
 * READ-ONLY: an order was paid at Stripe but is still PENDING here.
 * Compares our row against Stripe's truth and reports webhook configuration.
 * No writes, no sends.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { getStripeClient, resolveStripeAccount } from "../src/lib/stripe/client.js";

const ref = process.argv[2] ?? null;

const orders = ref
  ? await prisma.order.findMany({
      where: { OR: [{ orderNumber: ref }, { id: ref }] },
      include: { items: true },
    })
  : await prisma.order.findMany({
      where: { totalCents: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { items: true },
    });

function keyMode(k?: string) {
  if (!k) return "UNSET";
  return k.startsWith("sk_live_") ? "LIVE" : k.startsWith("sk_test_") ? "TEST" : "?";
}

console.log("=== webhook secret configuration ===");
console.log(`  STRIPE_WEBHOOK_SECRET      ${process.env.STRIPE_WEBHOOK_SECRET ? "set" : "UNSET"}`);
console.log(`  STRIPE_WEBHOOK_SECRET_PT   ${process.env.STRIPE_WEBHOOK_SECRET_PT ? "set" : "UNSET  <-- PT has NO fallback"}`);
console.log(`  STRIPE_WEBHOOK_SECRET_CZ   ${process.env.STRIPE_WEBHOOK_SECRET_CZ ? "set" : "UNSET"}`);
console.log(`  STRIPE_SECRET_KEY          ${keyMode(process.env.STRIPE_SECRET_KEY)}`);
console.log(`  STRIPE_SECRET_KEY_PT       ${keyMode(process.env.STRIPE_SECRET_KEY_PT)}`);

for (const o of orders) {
  console.log(`\n=== ${o.orderNumber ?? o.id} ===`);
  console.log(`  created      ${o.createdAt.toISOString()}`);
  console.log(`  country      ${o.countryCode} -> account "${resolveStripeAccount(o.countryCode)}"`);
  console.log(`  db status    ${o.status} / payment ${o.paymentStatus}  paidAt=${o.paidAt?.toISOString() ?? "-"}`);
  console.log(`  total        ${(o.totalCents / 100).toFixed(2)} ${o.currencyCode}`);
  console.log(`  session      ${o.stripeSessionId ?? "NONE"}`);
  if (!o.stripeSessionId) continue;
  try {
    const stripe = getStripeClient(o.countryCode);
    const s = await stripe.checkout.sessions.retrieve(o.stripeSessionId, {
      expand: ["payment_intent", "invoice"],
    });
    console.log(`  STRIPE       status=${s.status} payment_status=${s.payment_status} amount_total=${s.amount_total}`);
    console.log(`  pm_types     ${(s.payment_method_types ?? []).join(", ")}`);
    const pi = s.payment_intent as { id?: string; status?: string } | null;
    console.log(`  intent       ${pi?.id ?? "-"} ${pi?.status ?? ""}`);
    const inv = s.invoice as { id?: string; number?: string | null } | null;
    console.log(`  invoice      ${inv?.id ?? "-"} ${inv?.number ?? ""}`);
    if (s.payment_status === "paid" && o.paymentStatus !== "PAID") {
      console.log("  >>> MISMATCH: Stripe says PAID, our DB does not. Webhook never applied.");
    }
  } catch (e) {
    console.log("  stripe retrieve failed:", e instanceof Error ? e.message : e);
  }

  const runs = await prisma.automationRun.findMany({
    where: { orderId: o.id },
    orderBy: { createdAt: "asc" },
    select: { automationKey: true, status: true, channel: true, createdAt: true, error: true },
  });
  console.log(`  automation runs (${runs.length}):`);
  for (const r of runs) {
    console.log(
      `    ${r.createdAt.toISOString().slice(11, 19)} ${r.status.padEnd(7)} ${(r.channel ?? "-").padEnd(9)} ${r.automationKey}` +
        (r.error ? `  ERROR: ${r.error.slice(0, 70)}` : ""),
    );
  }
}

// Webhook receipt log, if the app records one.
const recent = await prisma.stripeWebhookEvent
  .findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, type: true, createdAt: true },
  })
  .catch(() => null);
if (recent) {
  console.log("\n=== last 10 stripe webhook events received ===");
  for (const e of recent) console.log(`  ${e.createdAt.toISOString()}  ${e.type}  ${e.id}`);
} else {
  console.log("\n(no stripeWebhookEvent table / not readable)");
}

await prisma.$disconnect();
