/**
 * READ-ONLY diagnostic: why does an order's pay link land on Stripe sandbox?
 *
 * Performs no writes, sends nothing, and creates no Stripe objects. Prints
 * only what is needed to place the order on a Stripe account and tell whether
 * the session behind it is test or live. Never prints a secret -- keys are
 * reported as the string "TEST" or "LIVE", derived from the sk_ prefix.
 *
 * Usage (from backend/):
 *   npx tsx scripts/diagnose-order-link.mts ORD-000214
 */

import "dotenv/config";
// Reuse the app's own client -- Prisma 7 needs the PrismaPg adapter wired up,
// which src/db/prisma.ts already does.
import { prisma } from "../src/db/prisma.js";

const ref = process.argv[2] ?? "ORD-000214";

// Mirrors resolveStripeAccount() in lib/stripe/client.ts.
function account(cc?: string | null): "ie" | "pt" | "cz" {
  switch (cc?.trim().toLowerCase()) {
    case "pt":
      return "pt";
    case "cz":
      return "cz";
    default:
      return "ie";
  }
}

function keyMode(k?: string): string {
  if (!k) return "UNSET (falls back to Ireland)";
  if (k.startsWith("sk_live_")) return "LIVE";
  if (k.startsWith("sk_test_")) return "TEST  <-- sandbox";
  return "unrecognised prefix";
}

const order = await prisma.order.findFirst({
  where: { OR: [{ orderNumber: ref }, { id: ref }] },
  select: {
    id: true,
    orderNumber: true,
    countryCode: true,
    currencyCode: true,
    status: true,
    paymentStatus: true,
    totalCents: true,
    createdAt: true,
    paymentDueAt: true,
    stripeSessionId: true,
    stripeCheckoutUrl: true,
    prePaymentReminderStage: true,
    prePaymentFlowStartedAt: true,
  },
});

if (!order) {
  console.error(`No order matching "${ref}".`);
  process.exit(1);
}

const acct = account(order.countryCode);
const envKey =
  acct === "pt"
    ? process.env.STRIPE_SECRET_KEY_PT
    : acct === "cz"
      ? process.env.STRIPE_SECRET_KEY_CZ
      : process.env.STRIPE_SECRET_KEY;

const sess = order.stripeSessionId ?? "";
const sessMode = sess.startsWith("cs_test_")
  ? "TEST  <-- this is the sandbox session"
  : sess.startsWith("cs_live_")
    ? "LIVE"
    : sess
      ? "unrecognised prefix"
      : "none stored";

let urlHost = "none stored";
if (order.stripeCheckoutUrl) {
  try {
    urlHost = new URL(order.stripeCheckoutUrl).host;
  } catch {
    urlHost = "unparseable";
  }
  if (order.stripeCheckoutUrl.includes("cs_test_")) urlHost += "  (contains cs_test_)";
}

console.log(`
order            ${order.orderNumber ?? order.id}
country          ${order.countryCode}   -> Stripe account "${acct}"
currency         ${order.currencyCode}
total            ${(order.totalCents / 100).toFixed(2)}
status           ${order.status} / payment ${order.paymentStatus}
created          ${order.createdAt.toISOString()}
payment due      ${order.paymentDueAt?.toISOString() ?? "-"}
reminder stage   ${order.prePaymentReminderStage} (flow started ${order.prePaymentFlowStartedAt?.toISOString() ?? "-"})

stored session   ${sess ? sess.slice(0, 12) + "..." : "-"}   ${sessMode}
stored url host  ${urlHost}

LOCAL key for account "${acct}":  ${keyMode(envKey)}
  (this is THIS machine's backend/.env -- the deployed Railway env is what
   actually served the reminder, and may differ)
`);

const runs = await prisma.automationRun.findMany({
  where: { orderId: order.id },
  orderBy: { createdAt: "asc" },
  select: {
    automationKey: true,
    status: true,
    channel: true,
    recipient: true,
    summary: true,
    error: true,
    metadata: true,
    executedAt: true,
    createdAt: true,
  },
});

console.log(`automation runs (${runs.length}):`);
for (const r of runs) {
  const when = (r.executedAt ?? r.createdAt).toISOString().slice(11, 19);
  const to = r.recipient ? r.recipient.replace(/(.{3}).*(@|.{3}$)/, "$1***$2") : "-";
  console.log(
    `  ${when}  ${r.status.padEnd(7)} ${(r.channel ?? "-").padEnd(9)} ${r.automationKey}  ->${to}` +
      (r.error ? `  ERROR: ${r.error.slice(0, 80)}` : ""),
  );
  // Surface any URL hiding in summary/metadata -- that is what the patient saw.
  const blob = JSON.stringify({ s: r.summary, m: r.metadata } ?? {});
  for (const url of blob.match(/https?:\\?\/\\?\/[^"\\ ,}]+/g) ?? []) {
    const clean = url.replace(/\\\//g, "/");
    const flag = /cs_test_|sk_test_|localhost|127\.0\.0\.1/.test(clean) ? "  <-- SANDBOX/LOCAL" : "";
    console.log(`        link: ${clean}${flag}`);
  }
}

await prisma.$disconnect();
