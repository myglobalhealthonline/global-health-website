import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const orderSuffix = (process.argv[2] ?? "").toLowerCase();
const phoneCountryArg = process.argv.find((a) => a.startsWith("--phone-country="));
const phoneCountry = phoneCountryArg?.split("=")[1]?.trim().toLowerCase() ?? null;

if (!orderSuffix) {
  console.error("Usage: pnpm exec tsx scripts/resend-pre-payment.mjs <orderSuffix> [--phone-country=pk]");
  process.exit(1);
}

const { prisma } = await import("../src/db/prisma.js");
const { resendPrePaymentInitialNotifications } = await import(
  "../src/modules/automation/pre-payment-flow.service.js"
);

const order = await prisma.order.findFirst({
  where: { id: { endsWith: orderSuffix } },
  select: { id: true, email: true, phone: true, countryCode: true },
});

if (!order) {
  console.error(`Order ending in "${orderSuffix}" not found.`);
  process.exit(1);
}

if (phoneCountry) {
  await prisma.orderItem.updateMany({
    where: { orderId: order.id },
    data: { patientAddressCountryCode: phoneCountry },
  });
  console.log(`Set patientAddressCountryCode=${phoneCountry} on order items.`);
}

console.log("Resending pre-payment notifications for", order.id.slice(-8).toUpperCase(), "…");
await resendPrePaymentInitialNotifications(order.id);

const runs = await prisma.automationRun.findMany({
  where: { orderId: order.id },
  orderBy: { createdAt: "desc" },
  take: 6,
  select: { createdAt: true, automationKey: true, channel: true, status: true, summary: true, error: true },
});
console.log("Latest automation runs:", runs);
await prisma.$disconnect();
